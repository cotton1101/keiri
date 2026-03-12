import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { createCheckoutSession, createPortalSession, getCheckoutSession } from "./stripe";

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です" });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ─── Accounts (勘定科目) ───
  accounts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      await db.seedDefaultAccounts(ctx.user.id);
      return db.getAccountsByUser(ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      type: z.enum(["income", "expense", "asset", "liability"]),
      code: z.string().optional(),
      description: z.string().optional(),
      categoryId: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.createAccount({ ...input, userId: ctx.user.id, code: input.code ?? "", description: input.description ?? null, categoryId: input.categoryId ?? null });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      type: z.enum(["income", "expense", "asset", "liability"]).optional(),
      code: z.string().optional(),
      description: z.string().optional(),
      isActive: z.number().optional(),
      categoryId: z.number().nullable().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateAccount(id, ctx.user.id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteAccount(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Transactions (取引) ───
  transactions: router({
    list: protectedProcedure.input(z.object({
      startDate: z.number().optional(),
      endDate: z.number().optional(),
      type: z.string().optional(),
      accountId: z.number().optional(),
      limit: z.number().optional(),
      offset: z.number().optional(),
    }).optional()).query(async ({ ctx, input }) => {
      return db.getTransactionsByUser(ctx.user.id, input);
    }),
    create: protectedProcedure.input(z.object({
      type: z.enum(["income", "expense"]),
      accountId: z.number(),
      amount: z.string(),
      date: z.number(),
      description: z.string().optional(),
      memo: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      // 無料プラン15件制限チェック
      const sub = await db.getSubscription(ctx.user.id);
      if (!sub || sub.plan !== "premium") {
        const count = await db.getTransactionCount(ctx.user.id);
        if (count >= 15) {
          throw new TRPCError({ code: "FORBIDDEN", message: "無料プランでは取引は15件までです。プレミアムプランにアップグレードすると無制限にご利用いただけます。" });
        }
      }
      return db.createTransaction({ ...input, userId: ctx.user.id, description: input.description ?? "", memo: input.memo ?? null });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      type: z.enum(["income", "expense"]).optional(),
      accountId: z.number().optional(),
      amount: z.string().optional(),
      date: z.number().optional(),
      description: z.string().optional(),
      memo: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateTransaction(id, ctx.user.id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteTransaction(input.id, ctx.user.id);
      return { success: true };
    }),
    import: protectedProcedure.input(z.object({
      source: z.enum(["freee", "yayoi", "moneyforward", "csv"]),
      data: z.array(z.object({
        type: z.enum(["income", "expense"]),
        accountName: z.string(),
        amount: z.string(),
        date: z.number(),
        description: z.string().optional(),
        memo: z.string().optional(),
      })),
    })).mutation(async ({ ctx, input }) => {
      const userAccounts = await db.getAccountsByUser(ctx.user.id);
      const accountMap = new Map(userAccounts.map(a => [a.name, a.id]));
      let txns = input.data.map(d => {
        let accountId = accountMap.get(d.accountName);
        if (!accountId) {
          const fallback = userAccounts.find(a => a.type === d.type);
          accountId = fallback?.id ?? userAccounts[0]?.id ?? 0;
        }
        return {
          userId: ctx.user.id, type: d.type, accountId, amount: d.amount,
          date: d.date, description: d.description ?? "", memo: d.memo ?? null,
          importSource: input.source,
        };
      });
      // 無料プラン制限チェック（インポート時）
      const sub = await db.getSubscription(ctx.user.id);
      if (!sub || sub.plan !== "premium") {
        const currentCount = await db.getTransactionCount(ctx.user.id);
        const remaining = Math.max(0, 15 - currentCount);
        if (remaining === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: "無料プランでは取引は15件までです。プレミアムプランにアップグレードしてください。" });
        }
        if (txns.length > remaining) {
          txns = txns.slice(0, remaining);
        }
      }
      return db.createTransactionsBulk(txns);
    }),
  }),

  // ─── Dashboard ───
  dashboard: router({
    summary: protectedProcedure.input(z.object({ year: z.number(), month: z.number() })).query(async ({ ctx, input }) => {
      return db.getMonthlySummary(ctx.user.id, input.year, input.month);
    }),
    trend: protectedProcedure.input(z.object({ year: z.number() })).query(async ({ ctx, input }) => {
      return db.getYearlyMonthlyTrend(ctx.user.id, input.year);
    }),
    recentTransactions: protectedProcedure.query(async ({ ctx }) => {
      const result = await db.getTransactionsByUser(ctx.user.id, { limit: 10 });
      return result.items;
    }),
    accountBreakdown: protectedProcedure.input(z.object({ year: z.number(), month: z.number().optional() })).query(async ({ ctx, input }) => {
      return db.getAccountBreakdown(ctx.user.id, input.year, input.month);
    }),
  }),

  // ─── Clients (取引先) ───
  clients: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getClientsByUser(ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      name: z.string().min(1),
      contactPerson: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      postalCode: z.string().optional(),
      address: z.string().optional(),
      memo: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      return db.createClient({
        ...input, userId: ctx.user.id,
        contactPerson: input.contactPerson ?? "", email: input.email ?? "",
        phone: input.phone ?? "", postalCode: input.postalCode ?? "",
        address: input.address ?? null, memo: input.memo ?? null,
      });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      name: z.string().min(1).optional(),
      contactPerson: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      postalCode: z.string().optional(),
      address: z.string().optional(),
      memo: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateClient(id, ctx.user.id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteClient(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Invoices (請求書) ───
  invoices: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getInvoicesByUser(ctx.user.id);
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      return db.getInvoiceById(input.id, ctx.user.id);
    }),
    nextNumber: protectedProcedure.query(async ({ ctx }) => {
      return db.getNextInvoiceNumber(ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      clientId: z.number().nullable().optional(),
      invoiceNumber: z.string(),
      issueDate: z.number(),
      dueDate: z.number(),
      subtotal: z.string(),
      taxRate: z.string(),
      taxAmount: z.string(),
      totalAmount: z.string(),
      notes: z.string().optional(),
      status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
      items: z.array(z.object({
        description: z.string(),
        quantity: z.string(),
        unitPrice: z.string(),
        amount: z.string(),
      })),
    })).mutation(async ({ ctx, input }) => {
      const { items, ...invoiceData } = input;
      return db.createInvoice(
        { ...invoiceData, userId: ctx.user.id, clientId: invoiceData.clientId ?? null, notes: invoiceData.notes ?? null, status: invoiceData.status ?? "draft" },
        items,
      );
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      clientId: z.number().nullable().optional(),
      invoiceNumber: z.string().optional(),
      issueDate: z.number().optional(),
      dueDate: z.number().optional(),
      subtotal: z.string().optional(),
      taxRate: z.string().optional(),
      taxAmount: z.string().optional(),
      totalAmount: z.string().optional(),
      notes: z.string().optional(),
      status: z.enum(["draft", "sent", "paid", "overdue", "cancelled"]).optional(),
      items: z.array(z.object({
        description: z.string(),
        quantity: z.string(),
        unitPrice: z.string(),
        amount: z.string(),
      })).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, items, ...data } = input;
      await db.updateInvoice(id, ctx.user.id, data, items);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteInvoice(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Business Profile (事業者情報) ───
  businessProfile: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getBusinessProfile(ctx.user.id);
    }),
    upsert: protectedProcedure.input(z.object({
      businessName: z.string().optional(),
      representativeName: z.string().optional(),
      postalCode: z.string().optional(),
      address: z.string().optional(),
      phone: z.string().optional(),
      email: z.string().optional(),
      taxId: z.string().optional(),
      bankName: z.string().optional(),
      bankBranch: z.string().optional(),
      bankAccountType: z.string().optional(),
      bankAccountNumber: z.string().optional(),
      bankAccountName: z.string().optional(),
      fiscalYearStart: z.number().optional(),
      filingType: z.enum(["blue", "white"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      const id = await db.upsertBusinessProfile(ctx.user.id, input);
      return { id };
    }),
  }),

  // ─── Subscription ───
  subscription: router({
    get: protectedProcedure.query(async ({ ctx }) => {
      return db.getSubscription(ctx.user.id);
    }),
    limitInfo: protectedProcedure.query(async ({ ctx }) => {
      const sub = await db.getSubscription(ctx.user.id);
      const isPremium = sub?.plan === "premium";
      const txnCount = await db.getTransactionCount(ctx.user.id);
      return {
        plan: isPremium ? "premium" as const : "free" as const,
        transactionLimit: isPremium ? null : 15,
        transactionCount: txnCount,
        transactionRemaining: isPremium ? null : Math.max(0, 15 - txnCount),
      };
    }),
    update: protectedProcedure.input(z.object({
      plan: z.enum(["free", "premium"]),
    })).mutation(async ({ ctx, input }) => {
      await db.upsertSubscription(ctx.user.id, input.plan);
      return { success: true };
    }),
    // Stripe Checkout Session
    createCheckout: protectedProcedure.input(z.object({
      origin: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const sub = await db.getSubscription(ctx.user.id);
      const result = await createCheckoutSession({
        userId: ctx.user.id,
        userEmail: ctx.user.email || "",
        userName: ctx.user.name || "",
        origin: input.origin,
        existingStripeCustomerId: sub?.stripeCustomerId,
      });
      return result;
    }),
    // Stripe Customer Portal
    createPortal: protectedProcedure.input(z.object({
      origin: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const sub = await db.getSubscription(ctx.user.id);
      if (!sub?.stripeCustomerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe顧客情報が見つかりません" });
      }
      return createPortalSession({
        stripeCustomerId: sub.stripeCustomerId,
        origin: input.origin,
      });
    }),
    // Verify checkout session
    verifySession: protectedProcedure.input(z.object({
      sessionId: z.string(),
    })).query(async ({ ctx, input }) => {
      try {
        const session = await getCheckoutSession(input.sessionId);
        const userId = parseInt(session.client_reference_id || "0");
        if (userId === ctx.user.id && session.payment_status === "paid") {
          // Ensure subscription is updated
          await db.upsertSubscription(ctx.user.id, "premium", {
            stripeCustomerId: session.customer as string,
            stripeSubscriptionId: session.subscription as string,
            stripeStatus: "active",
          });
          return { success: true, status: "paid" as const };
        }
        return { success: false, status: session.payment_status as string };
      } catch {
        return { success: false, status: "error" };
      }
    }),
  }),

  // ─── Recurring Transactions (固定費) ───
  recurring: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getRecurringByUser(ctx.user.id);
    }),
    create: protectedProcedure.input(z.object({
      type: z.enum(["income", "expense"]),
      accountId: z.number(),
      amount: z.string(),
      description: z.string(),
      frequency: z.enum(["monthly", "yearly"]),
      dayOfMonth: z.number(),
    })).mutation(async ({ ctx, input }) => {
      return db.createRecurring({ ...input, userId: ctx.user.id });
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      type: z.enum(["income", "expense"]).optional(),
      accountId: z.number().optional(),
      amount: z.string().optional(),
      description: z.string().optional(),
      frequency: z.enum(["monthly", "yearly"]).optional(),
      dayOfMonth: z.number().optional(),
      isActive: z.number().optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateRecurring(id, ctx.user.id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteRecurring(input.id, ctx.user.id);
      return { success: true };
    }),
  }),

  // ─── Tax Filings (確定申告) ───
  taxFiling: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getTaxFilingsByUser(ctx.user.id);
    }),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      return db.getTaxFilingById(input.id, ctx.user.id);
    }),
    generate: protectedProcedure.input(z.object({
      fiscalYear: z.number(),
      filingType: z.enum(["blue", "white"]),
    })).mutation(async ({ ctx, input }) => {
      return db.generateTaxFiling(ctx.user.id, input.fiscalYear, input.filingType);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number(),
      status: z.enum(["draft", "completed"]).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      await db.updateTaxFiling(id, ctx.user.id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteTaxFiling(input.id, ctx.user.id);
      return { success: true };
    }),
    // 税金シミュレーション（リアルタイム概算）
    simulate: protectedProcedure.input(z.object({
      year: z.number(),
      filingType: z.enum(["blue", "white"]),
    })).query(async ({ ctx, input }) => {
      const summary = await db.getYearlyMonthlyTrend(ctx.user.id, input.year);
      let totalIncome = 0, totalExpense = 0;
      for (const s of summary) {
        if (s.type === "income") totalIncome += s.total;
        if (s.type === "expense") totalExpense += s.total;
      }
      const netIncome = totalIncome - totalExpense;
      const specialDeduction = input.filingType === "blue" ? Math.min(650000, Math.max(0, netIncome)) : 0;
      const basicDeduction = 480000;
      const taxableIncome = Math.max(0, netIncome - specialDeduction - basicDeduction);
      const { incomeTax, taxRate, deduction } = db.calculateIncomeTax(taxableIncome);
      const residentTax = db.calculateResidentTax(taxableIncome);
      const businessTax = db.calculateBusinessTax(netIncome);
      const healthInsurance = db.calculateHealthInsurance(taxableIncome);
      const totalTax = incomeTax + residentTax + businessTax;
      return {
        totalIncome, totalExpense, netIncome, specialDeduction, basicDeduction,
        taxableIncome, incomeTax, taxRate, deduction, residentTax, businessTax,
        healthInsurance, totalTax,
        effectiveRate: netIncome > 0 ? Math.round(totalTax / netIncome * 1000) / 10 : 0,
      };
    }),
  }),

  // ─── Email (メール送信) ───
  email: router({
    logs: protectedProcedure.query(async ({ ctx }) => {
      return db.getEmailLogsByUser(ctx.user.id);
    }),
    send: protectedProcedure.input(z.object({
      invoiceId: z.number().optional(),
      toEmail: z.string().email(),
      toName: z.string().optional(),
      subject: z.string().min(1),
      body: z.string().min(1),
      documentType: z.enum(["invoice", "quote", "order"]),
    })).mutation(async ({ ctx, input }) => {
      // Create email log entry
      const logEntry = await db.createEmailLog({
        userId: ctx.user.id,
        invoiceId: input.invoiceId ?? null,
        toEmail: input.toEmail,
        toName: input.toName ?? "",
        subject: input.subject,
        body: input.body,
        documentType: input.documentType,
        status: "pending",
      });

      try {
        // Use notifyOwner as email sending mechanism (sends notification to owner)
        // In production, this would integrate with an email service like SendGrid/SES
        await notifyOwner({
          title: `[${input.documentType === "invoice" ? "請求書" : input.documentType === "quote" ? "見積書" : "注文書"}] ${input.subject}`,
          content: `宛先: ${input.toName} <${input.toEmail}>\n\n${input.body}`,
        });
        await db.updateEmailLogStatus(logEntry.id, "sent");

        // Update invoice status to "sent" if linked
        if (input.invoiceId) {
          await db.updateInvoice(input.invoiceId, ctx.user.id, { status: "sent" });
        }

        return { success: true, id: logEntry.id };
      } catch (error) {
        await db.updateEmailLogStatus(logEntry.id, "failed");
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "メール送信に失敗しました" });
      }
    }),
  }),

  // ─── Admin (管理者) ───
  admin: router({
    stats: adminProcedure.query(async () => {
      return db.getAdminStats();
    }),
    users: router({
      list: adminProcedure.input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
        search: z.string().optional(),
      }).optional()).query(async ({ input }) => {
        return db.getAllUsers(input);
      }),
      updateRole: adminProcedure.input(z.object({
        userId: z.number(),
        role: z.enum(["user", "admin"]),
      })).mutation(async ({ input }) => {
        await db.updateUserRole(input.userId, input.role);
        return { success: true };
      }),
    }),
    subscriptions: router({
      list: adminProcedure.input(z.object({
        limit: z.number().optional(),
        offset: z.number().optional(),
      }).optional()).query(async ({ input }) => {
        return db.getAdminSubscriptions(input);
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
