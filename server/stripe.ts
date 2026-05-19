import Stripe from "stripe";
import { Router, raw } from "express";
import * as db from "./db";
import { STRIPE_CONFIG } from "./stripe-products";
import { sendAdminPlanUpgradeNotification, sendAdminCancellationNotification } from "./mail";

// Initialize Stripe with secret key (lazy - only when key is available)
const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : (null as unknown as Stripe);

export const stripeRouter = Router();

/**
 * Create a Stripe Checkout Session for premium subscription
 * Called from tRPC procedure, returns session URL
 */
export async function createCheckoutSession(params: {
  userId: number;
  userEmail: string;
  userName: string;
  origin: string;
  existingStripeCustomerId?: string | null;
}) {
  // First, ensure we have a Stripe Price for our premium plan
  const priceId = await getOrCreatePremiumPrice();

  const basePath = (process.env.BASE_PATH || "/").replace(/\/$/, "") || "";
  const sessionConfig: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${params.origin}${basePath}/plans?session_id={CHECKOUT_SESSION_ID}&status=success`,
    cancel_url: `${params.origin}${basePath}/plans?status=cancelled`,
    client_reference_id: params.userId.toString(),
    metadata: {
      user_id: params.userId.toString(),
      customer_email: params.userEmail,
      customer_name: params.userName,
    },
    allow_promotion_codes: true,
    locale: "ja",
  };

  // Reuse existing Stripe customer or create one
  // (Accounts V2 requires an existing customer for Checkout in test mode)
  if (params.existingStripeCustomerId) {
    sessionConfig.customer = params.existingStripeCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: params.userEmail,
      name: params.userName,
      metadata: { user_id: params.userId.toString() },
    });
    sessionConfig.customer = customer.id;
  }

  const session = await stripe.checkout.sessions.create(sessionConfig);
  return { url: session.url, sessionId: session.id, customerId: sessionConfig.customer as string };
}

/**
 * Create a Stripe Customer Portal session for managing subscription
 */
export async function createPortalSession(params: {
  stripeCustomerId: string;
  origin: string;
}) {
  const session = await stripe.billingPortal.sessions.create({
    customer: params.stripeCustomerId,
    return_url: `${params.origin}${(process.env.BASE_PATH || "/").replace(/\/$/, "") || ""}/plans`,
  });
  return { url: session.url };
}

/**
 * Get or create the premium subscription price in Stripe
 */
let cachedPriceId: string | null = null;

async function getOrCreatePremiumPrice(): Promise<string> {
  if (cachedPriceId) return cachedPriceId;

  // Search for existing product
  const products = await stripe.products.search({
    query: `name:'カンタン経理 プレミアムプラン'`,
  });

  let productId: string;

  if (products.data.length > 0) {
    productId = products.data[0].id;
    // Check for existing price
    const prices = await stripe.prices.list({
      product: productId,
      active: true,
      currency: STRIPE_CONFIG.currency,
      type: "recurring",
    });
    const matchingPrice = prices.data.find(
      (p) => p.unit_amount === STRIPE_CONFIG.premiumPriceAmount && p.recurring?.interval === "month"
    );
    if (matchingPrice) {
      cachedPriceId = matchingPrice.id;
      return cachedPriceId!;
    }
  } else {
    // Create product
    const product = await stripe.products.create({
      name: "カンタン経理 プレミアムプラン",
      description: "個人事業主向けクラウド経理・確定申告ソフト - 全機能無制限",
    });
    productId = product.id;
  }

  // Create price
  const price = await stripe.prices.create({
    product: productId,
    unit_amount: STRIPE_CONFIG.premiumPriceAmount,
    currency: STRIPE_CONFIG.currency,
    recurring: { interval: "month" },
  });

  cachedPriceId = price.id;
  return cachedPriceId!;
}

/**
 * Retrieve checkout session details (for success page verification)
 */
export async function getCheckoutSession(sessionId: string) {
  const session = await stripe.checkout.sessions.retrieve(sessionId, {
    expand: ["subscription", "customer"],
  });
  return session;
}

// ─── Webhook Handler ───
// IMPORTANT: Must use raw body for signature verification
stripeRouter.post(
  "/api/stripe/webhook",
  raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    if (!sig || !webhookSecret) {
      console.error("[Stripe Webhook] Missing signature or webhook secret");
      return res.status(400).json({ error: "Missing signature" });
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
    } catch (err: any) {
      console.error("[Stripe Webhook] Signature verification failed:", err.message);
      return res.status(400).json({ error: `Webhook Error: ${err.message}` });
    }

    // Handle test events
    if (event.id.startsWith("evt_test_")) {
      console.log("[Stripe Webhook] Test event detected, returning verification response");
      return res.json({ verified: true });
    }

    console.log(`[Stripe Webhook] Received event: ${event.type} (${event.id})`);

    try {
      switch (event.type) {
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          const userId = parseInt(session.client_reference_id || session.metadata?.user_id || "0");
          const customerId = session.customer as string;
          const subscriptionId = session.subscription as string;

          if (userId > 0) {
            await db.upsertSubscription(userId, "premium", {
              stripeCustomerId: customerId,
              stripeSubscriptionId: subscriptionId,
              stripeStatus: "active",
            });
            // Notify admin of plan upgrade (non-blocking)
            const customerEmail = session.metadata?.customer_email || session.customer_details?.email || "";
            const customerName = session.metadata?.customer_name || "";
            sendAdminPlanUpgradeNotification(customerEmail, customerName, "premium");
            console.log(`[Stripe Webhook] User ${userId} upgraded to premium`);
          }
          break;
        }

        case "customer.subscription.updated": {
          const subscription = event.data.object as Stripe.Subscription;
          const status = subscription.status;
          const stripeSubId = subscription.id;

          // Map Stripe status to our plan
          const plan = (status === "active" || status === "trialing") ? "premium" : "free";
          await db.updateSubscriptionByStripeSubId(stripeSubId, {
            plan,
            stripeStatus: status,
          });
          console.log(`[Stripe Webhook] Subscription ${stripeSubId} updated: ${status}`);
          break;
        }

        case "customer.subscription.deleted": {
          const subscription = event.data.object as Stripe.Subscription;
          const stripeSubId = subscription.id;

          await db.updateSubscriptionByStripeSubId(stripeSubId, {
            plan: "free",
            stripeStatus: "canceled",
            endDate: Date.now(),
          });
          sendAdminCancellationNotification(stripeSubId);
          console.log(`[Stripe Webhook] Subscription ${stripeSubId} cancelled`);
          break;
        }

        case "invoice.paid":
        case "invoice.payment_succeeded": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          console.log(`[Stripe Webhook] Payment succeeded for customer ${customerId}`);
          break;
        }

        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const customerId = invoice.customer as string;
          const sub = await db.getSubscriptionByStripeCustomerId(customerId);
          if (sub?.stripeSubscriptionId) {
            await db.updateSubscriptionByStripeSubId(sub.stripeSubscriptionId, {
              stripeStatus: "past_due",
            });
          }
          console.log(`[Stripe Webhook] Payment failed for customer ${customerId}`);
          break;
        }

        default:
          console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
      }

      res.json({ received: true });
    } catch (error) {
      console.error("[Stripe Webhook] Error processing event:", error);
      res.status(500).json({ error: "Webhook handler failed" });
    }
  }
);
