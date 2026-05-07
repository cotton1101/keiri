import { COOKIE_NAME, ONE_YEAR_MS, SESSION_MAX_AGE_MS } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import * as db from "./db";
import { notifyOwner } from "./_core/notification";
import { createCheckoutSession, createPortalSession, getCheckoutSession } from "./stripe";
import { registerUser, loginUser } from "./auth";
import { ENV } from "./_core/env";
import { sendWelcomeEmail, sendAdminNewUserNotification, sendInvoiceEmail } from "./mail";

// ─── Security: 値のバリデーション境界値 ───
const MAX_AMOUNT = 999_999_999_999; // decimal(12,0) 上限
const MIN_DATE_MS = Date.UTC(1900, 0, 1); // 下限: 1900-01-01
const MAX_DATE_MS = Date.UTC(2100, 11, 31, 23, 59, 59); // 上限: 2100-12-31
const MAX_BULK_ROWS = 100; // 1リクエストあたり一括計上の最大行数

function assertAmountInRange(amount: string): void {
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0 || n > MAX_AMOUNT) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "金額は1〜999,999,999,999円の範囲で入力してください" });
  }
}
function assertDateInRange(date: number): void {
  if (!Number.isFinite(date) || !Number.isInteger(date) || date < MIN_DATE_MS || date > MAX_DATE_MS) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "日付が範囲外です" });
  }
}
async function assertAccountOwnership(userId: number, accountIds: number[]): Promise<void> {
  try {
    await db.assertAccountsOwnedByUser(userId, accountIds);
  } catch {
    throw new TRPCError({ code: "FORBIDDEN", message: "指定された勘定科目にアクセスできません" });
  }
}

// 無料プラン取引件数制限 (15件)。adding = 今回追加しようとしている件数。
const FREE_PLAN_TXN_LIMIT = 15;
async function assertFreePlanCapacity(userId: number, adding: number): Promise<void> {
  const sub = await db.getSubscription(userId);
  if (sub && sub.plan === "premium") return;
  const currentCount = await db.getTransactionCount(userId);
  const remaining = Math.max(0, FREE_PLAN_TXN_LIMIT - currentCount);
  if (remaining === 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: `無料プランでは取引は${FREE_PLAN_TXN_LIMIT}件までです。プレミアムプランにアップグレードしてください。` });
  }
  if (adding > remaining) {
    throw new TRPCError({ code: "FORBIDDEN", message: `無料プランの残り登録可能件数は${remaining}件です。件数を減らすかプレミアムプランにアップグレードしてください。` });
  }
}

// ─── Security: Rate limiting ───
const loginAttempts = new Map<string, { count: number; resetAt: number }>();
const MAX_LOGIN_ATTEMPTS = 10;
const LOGIN_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

function checkRateLimit(key: string): void {
  const now = Date.now();
  const entry = loginAttempts.get(key);
  if (entry && now < entry.resetAt) {
    if (entry.count >= MAX_LOGIN_ATTEMPTS) {
      throw new TRPCError({ code: "TOO_MANY_REQUESTS", message: "ログイン試行回数が上限に達しました。15分後に再試行してください。" });
    }
    entry.count++;
  } else {
    loginAttempts.set(key, { count: 1, resetAt: now + LOGIN_WINDOW_MS });
  }
}

function resetRateLimit(key: string): void {
  loginAttempts.delete(key);
}

// ─── Security: Origin validation ───
function validateOrigin(origin: string): string {
  try {
    const url = new URL(origin);
    // Only allow http/https protocols
    if (!["http:", "https:"].includes(url.protocol)) {
      throw new Error("Invalid protocol");
    }
    const allowedOrigins = ENV.allowedOrigins;
    // If allowed origins are configured, validate against them
    if (allowedOrigins.length > 0) {
      if (!allowedOrigins.includes(url.origin)) {
        throw new Error("Origin not allowed");
      }
    }
    return url.origin;
  } catch {
    throw new TRPCError({ code: "BAD_REQUEST", message: "無効なオリジンURLです" });
  }
}

// Admin-only procedure
const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") throw new TRPCError({ code: "FORBIDDEN", message: "管理者権限が必要です" });
  return next({ ctx });
});

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => {
      if (!opts.ctx.user) return null;
      const { passwordHash, ...safeUser } = opts.ctx.user;
      return safeUser;
    }),
    register: publicProcedure.input(z.object({
      email: z.string().email("有効なメールアドレスを入力してください").max(255),
      password: z.string().min(8, "パスワードは8文字以上で入力してください").max(128),
      name: z.string().min(1, "名前を入力してください").max(100),
    })).mutation(async ({ ctx, input }) => {
      const rateLimitKey = `register:${input.email.toLowerCase()}`;
      checkRateLimit(rateLimitKey);
      try {
        const { user, token } = await registerUser(input.email, input.password, input.name);
        resetRateLimit(rateLimitKey);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS });
        // Send welcome email to user & notify admin (non-blocking)
        sendWelcomeEmail(input.email, input.name);
        sendAdminNewUserNotification(input.email, input.name);
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      } catch (error: any) {
        const msg = error.message?.includes("既に登録") ? error.message : "登録に失敗しました";
        throw new TRPCError({ code: "BAD_REQUEST", message: msg });
      }
    }),
    login: publicProcedure.input(z.object({
      email: z.string().email("有効なメールアドレスを入力してください"),
      password: z.string().min(1, "パスワードを入力してください"),
    })).mutation(async ({ ctx, input }) => {
      const rateLimitKey = input.email.toLowerCase();
      checkRateLimit(rateLimitKey);
      try {
        const { user, token } = await loginUser(input.email, input.password);
        resetRateLimit(rateLimitKey);
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_MAX_AGE_MS });
        return { success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role } };
      } catch (error: any) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "メールアドレスまたはパスワードが正しくありません" });
      }
    }),
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
      accountId: z.number().int().positive(),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "金額は正の数値で入力してください"),
      date: z.number(),
      description: z.string().max(500).optional(),
      memo: z.string().max(1000).optional(),
      taxCategory: z.enum(["taxable_10", "taxable_8", "exempt", "non_taxable", "not_applicable"]).optional(),
      taxIncluded: z.number().int().min(0).max(1).optional(),
    })).mutation(async ({ ctx, input }) => {
      assertAmountInRange(input.amount);
      assertDateInRange(input.date);
      await assertAccountOwnership(ctx.user.id, [input.accountId]);
      await assertFreePlanCapacity(ctx.user.id, 1);
      return db.createTransaction({
        ...input, userId: ctx.user.id, description: input.description ?? "", memo: input.memo ?? null,
        taxCategory: input.taxCategory ?? "taxable_10", taxIncluded: input.taxIncluded ?? 1,
      });
    }),
    bulkCreate: protectedProcedure.input(z.object({
      items: z.array(z.object({
        type: z.enum(["income", "expense"]),
        accountId: z.number().int().positive(),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "金額は正の数値で入力してください"),
        date: z.number(),
        description: z.string().max(500).optional(),
        memo: z.string().max(1000).optional(),
        taxCategory: z.enum(["taxable_10", "taxable_8", "exempt", "non_taxable", "not_applicable"]).optional(),
        taxIncluded: z.number().int().min(0).max(1).optional(),
      })).min(1, "1行以上入力してください").max(MAX_BULK_ROWS, `一度に登録できるのは${MAX_BULK_ROWS}行までです`),
    })).mutation(async ({ ctx, input }) => {
      await db.seedDefaultAccounts(ctx.user.id);
      const userAccounts = await db.getAccountsByUser(ctx.user.id);
      const accountMap = new Map(userAccounts.map((a) => [a.id, a]));
      for (let i = 0; i < input.items.length; i++) {
        const it = input.items[i];
        assertAmountInRange(it.amount);
        assertDateInRange(it.date);
        const acct = accountMap.get(it.accountId);
        if (!acct || acct.userId !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: `${i + 1}行目: 指定された勘定科目にアクセスできません` });
        }
        if (acct.isActive === 0) {
          throw new TRPCError({ code: "BAD_REQUEST", message: `${i + 1}行目: 勘定科目が無効です` });
        }
        if (acct.type !== it.type) {
          const label = it.type === "income" ? "売上(収入)" : "仕入・経費(支出)";
          throw new TRPCError({ code: "BAD_REQUEST", message: `${i + 1}行目: ${label}に対応する勘定科目を選択してください` });
        }
      }
      await assertFreePlanCapacity(ctx.user.id, input.items.length);
      const rows = input.items.map((it) => ({
        userId: ctx.user.id, type: it.type, accountId: it.accountId, amount: it.amount,
        date: it.date, description: it.description ?? "", memo: it.memo ?? null,
        taxCategory: it.taxCategory ?? "taxable_10", taxIncluded: it.taxIncluded ?? 1,
      }));
      return db.createTransactionsBulk(rows);
    }),
    update: protectedProcedure.input(z.object({
      id: z.number().int().positive(),
      type: z.enum(["income", "expense"]).optional(),
      accountId: z.number().int().positive().optional(),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "金額は正の数値で入力してください").optional(),
      date: z.number().optional(),
      description: z.string().max(500).optional(),
      memo: z.string().max(1000).optional(),
      taxCategory: z.enum(["taxable_10", "taxable_8", "exempt", "non_taxable", "not_applicable"]).optional(),
      taxIncluded: z.number().int().min(0).max(1).optional(),
    })).mutation(async ({ ctx, input }) => {
      const { id, ...data } = input;
      if (data.amount !== undefined) assertAmountInRange(data.amount);
      if (data.date !== undefined) assertDateInRange(data.date);
      if (data.accountId !== undefined) await assertAccountOwnership(ctx.user.id, [data.accountId]);
      await db.updateTransaction(id, ctx.user.id, data);
      return { success: true };
    }),
    delete: protectedProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
      await db.deleteTransaction(input.id, ctx.user.id);
      return { success: true };
    }),
    import: protectedProcedure.input(z.object({
      source: z.enum(["freee", "yayoi", "moneyforward", "csv"]),
      data: z.array(z.object({
        type: z.enum(["income", "expense"]),
        accountName: z.string().max(100),
        amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "金額は正の数値で入力してください"),
        date: z.number(),
        description: z.string().max(500).optional(),
        memo: z.string().max(1000).optional(),
      })).min(1).max(1000),
    })).mutation(async ({ ctx, input }) => {
      for (const d of input.data) {
        assertAmountInRange(d.amount);
        assertDateInRange(d.date);
      }
      await db.seedDefaultAccounts(ctx.user.id);
      const userAccounts = await db.getAccountsByUser(ctx.user.id);
      const activeAccounts = userAccounts.filter((a) => a.isActive !== 0);
      const accountMap = new Map(activeAccounts.map((a) => [a.name, { id: a.id, type: a.type }]));
      const defaultIncome = activeAccounts.find((a) => a.type === "income" && a.isDefault === 1);
      const defaultExpense = activeAccounts.find((a) => a.type === "expense" && a.isDefault === 1);
      const skipped: { index: number; reason: string }[] = [];
      let txns = input.data.map((d, index) => {
        const match = accountMap.get(d.accountName);
        let accountId: number | null = null;
        // 名前一致かつ type が揃っている場合のみ採用。type 不一致の名前ヒットは fallback ではなくskip扱いで帳簿の汚染を防ぐ。
        if (match && match.type === d.type) {
          accountId = match.id;
        } else if (!match) {
          const fallback = d.type === "income" ? defaultIncome : defaultExpense;
          if (fallback) accountId = fallback.id;
        }
        if (!accountId) {
          skipped.push({ index, reason: match ? `勘定科目「${d.accountName}」の種別が一致しません` : `勘定科目「${d.accountName}」が見つかりません` });
          return null;
        }
        return {
          userId: ctx.user.id, type: d.type, accountId, amount: d.amount,
          date: d.date, description: d.description ?? "", memo: d.memo ?? null,
          importSource: input.source,
        };
      }).filter((r): r is NonNullable<typeof r> => r !== null);

      const sub = await db.getSubscription(ctx.user.id);
      if (!sub || sub.plan !== "premium") {
        const currentCount = await db.getTransactionCount(ctx.user.id);
        const remaining = Math.max(0, FREE_PLAN_TXN_LIMIT - currentCount);
        if (remaining === 0) {
          throw new TRPCError({ code: "FORBIDDEN", message: `無料プランでは取引は${FREE_PLAN_TXN_LIMIT}件までです。プレミアムプランにアップグレードしてください。` });
        }
        if (txns.length > remaining) {
          txns = txns.slice(0, remaining);
        }
      }
      const result = await db.createTransactionsBulk(txns);
      return { ...result, skipped: skipped.length };
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
      consumptionTaxMethod: z.enum(["standard", "simplified", "exempt"]).optional(),
      simplifiedTaxIndustry: z.number().optional(),
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
      const safeOrigin = validateOrigin(input.origin);
      const sub = await db.getSubscription(ctx.user.id);
      const result = await createCheckoutSession({
        userId: ctx.user.id,
        userEmail: ctx.user.email || "",
        userName: ctx.user.name || "",
        origin: safeOrigin,
        existingStripeCustomerId: sub?.stripeCustomerId,
      });
      // Save Stripe customer ID if newly created
      if (result.customerId && !sub?.stripeCustomerId) {
        await db.upsertSubscription(ctx.user.id, sub?.plan || "free", {
          stripeCustomerId: result.customerId,
        });
      }
      return result;
    }),
    // Stripe Customer Portal
    createPortal: protectedProcedure.input(z.object({
      origin: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const safeOrigin = validateOrigin(input.origin);
      const sub = await db.getSubscription(ctx.user.id);
      if (!sub?.stripeCustomerId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Stripe顧客情報が見つかりません" });
      }
      return createPortalSession({
        stripeCustomerId: sub.stripeCustomerId,
        origin: safeOrigin,
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
      workStyle: z.enum(["sole_proprietor", "side_business"]).default("sole_proprietor"),
      salaryIncome: z.number().min(0).max(MAX_AMOUNT).default(0),
      // 給与・報酬から既に源泉徴収済みの所得税額(円)。バイト/会社員/業務委託など。
      withholdingTax: z.number().int().min(0).max(MAX_AMOUNT).default(0),
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

      const isSideBusiness = input.workStyle === "side_business";
      const salaryIncome = isSideBusiness ? input.salaryIncome : 0;
      const salaryDeduction = isSideBusiness ? db.calculateSalaryDeduction(salaryIncome) : 0;
      const salaryNetIncome = Math.max(0, salaryIncome - salaryDeduction);

      // 総合課税: 給与所得 + 事業所得 から控除を差し引く
      const combinedNetIncome = salaryNetIncome + Math.max(0, netIncome - specialDeduction);
      const taxableIncome = Math.max(0, combinedNetIncome - basicDeduction);

      const { incomeTax, taxRate, deduction } = db.calculateIncomeTax(taxableIncome);
      const residentTax = db.calculateResidentTax(taxableIncome);
      const businessTax = db.calculateBusinessTax(netIncome);
      // 副業会社員は社会保険は会社負担なので国保不要
      const healthInsurance = isSideBusiness ? 0 : db.calculateHealthInsurance(taxableIncome);
      // 源泉徴収税額の差引: 確定申告での追加納付額(正)/還付額(負)
      const withholdingTax = input.withholdingTax;
      const incomeTaxBalance = incomeTax - withholdingTax;
      const totalTax = Math.max(0, incomeTaxBalance) + residentTax + businessTax;
      const refundAmount = Math.max(0, -incomeTaxBalance);
      const totalIncomeBase = isSideBusiness ? salaryIncome + totalIncome : totalIncome;
      return {
        totalIncome, totalExpense, netIncome, specialDeduction, basicDeduction,
        taxableIncome, incomeTax, taxRate, deduction, residentTax, businessTax,
        healthInsurance, totalTax,
        effectiveRate: totalIncomeBase > 0 ? Math.round(totalTax / totalIncomeBase * 1000) / 10 : 0,
        // 副業関連の追加情報
        workStyle: input.workStyle,
        salaryIncome, salaryDeduction, salaryNetIncome,
        // 源泉徴収との精算
        withholdingTax, incomeTaxBalance, refundAmount,
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
        // Send invoice/document email via SMTP
        const sent = await sendInvoiceEmail(
          input.toEmail,
          input.toName ?? "",
          input.subject,
          input.body,
        );
        if (!sent) {
          throw new Error("Email sending failed");
        }
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

  // ─── Consumption Tax (消費税) ───
  consumptionTax: router({
    calculate: protectedProcedure.input(z.object({
      fiscalYear: z.number(),
      method: z.enum(["standard", "simplified"]),
      industryType: z.number().optional(),
    })).query(async ({ ctx, input }) => {
      return db.calculateConsumptionTax(ctx.user.id, input.fiscalYear, input.method, input.industryType ?? 5);
    }),
  }),

  // ─── Receipts (レシート・領収書) ───
  receipts: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      return db.getReceiptsByUser(ctx.user.id);
    }),
    upload: protectedProcedure.input(z.object({
      fileName: z.string().max(255),
      fileType: z.string().max(100),
      fileData: z.string(), // base64
      ocrText: z.string().optional(),
    })).mutation(async ({ ctx, input }) => {
      // Validate file size (base64 ≈ 4/3 of original, limit ~10MB)
      if (input.fileData.length > 14_000_000) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "ファイルサイズは10MB以下にしてください" });
      }
      const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic", "application/pdf"];
      if (!allowedTypes.includes(input.fileType)) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "JPEG、PNG、WebP、PDF形式のみ対応しています" });
      }

      // Extract data from OCR text if provided
      const rawText = input.ocrText || "";
      const amount = db.extractAmountFromText(rawText);
      const date = db.extractDateFromText(rawText);
      const vendor = db.extractVendorFromText(rawText);
      const items = rawText.split("\n").filter((l: string) => l.trim().length > 0).slice(0, 10);

      // Auto-categorize
      const userAccounts = await db.getAccountsByUser(ctx.user.id);
      const categorization = db.autoCategorizeReceipt(rawText, userAccounts);

      const receipt = await db.createReceipt({
        userId: ctx.user.id,
        fileName: input.fileName,
        fileType: input.fileType,
        fileData: input.fileData,
        status: rawText ? "processed" : "pending",
        extractedData: rawText ? { vendor: vendor ?? undefined, amount: amount ?? undefined, date: date ?? undefined, items, rawText } : null,
        suggestedAccountId: categorization.accountId,
        suggestedAccountName: categorization.accountName,
        suggestedType: categorization.type,
        transactionId: null,
      });

      return receipt;
    }),
    analyze: protectedProcedure.input(z.object({
      id: z.number(),
      ocrText: z.string(),
    })).mutation(async ({ ctx, input }) => {
      const rawText = input.ocrText;
      const amount = db.extractAmountFromText(rawText);
      const date = db.extractDateFromText(rawText);
      const vendor = db.extractVendorFromText(rawText);
      const items = rawText.split("\n").filter((l: string) => l.trim().length > 0).slice(0, 10);

      const userAccounts = await db.getAccountsByUser(ctx.user.id);
      const categorization = db.autoCategorizeReceipt(rawText, userAccounts);

      await db.updateReceipt(input.id, ctx.user.id, {
        status: "processed",
        extractedData: { vendor: vendor ?? undefined, amount: amount ?? undefined, date: date ?? undefined, items, rawText },
        suggestedAccountId: categorization.accountId,
        suggestedAccountName: categorization.accountName,
        suggestedType: categorization.type,
      });

      return { vendor, amount, date, ...categorization };
    }),
    createTransaction: protectedProcedure.input(z.object({
      receiptId: z.number().int().positive(),
      type: z.enum(["income", "expense"]),
      accountId: z.number().int().positive(),
      amount: z.string().regex(/^\d+(\.\d{1,2})?$/, "金額は正の数値で入力してください"),
      date: z.number(),
      description: z.string().max(500).optional(),
    })).mutation(async ({ ctx, input }) => {
      assertAmountInRange(input.amount);
      assertDateInRange(input.date);
      await assertAccountOwnership(ctx.user.id, [input.accountId]);
      await assertFreePlanCapacity(ctx.user.id, 1);
      const txn = await db.createTransaction({
        userId: ctx.user.id,
        type: input.type,
        accountId: input.accountId,
        amount: input.amount,
        date: input.date,
        description: input.description ?? "",
        memo: null,
      });
      await db.updateReceipt(input.receiptId, ctx.user.id, { transactionId: txn.id, status: "processed" });
      return txn;
    }),
    delete: protectedProcedure.input(z.object({ id: z.number() })).mutation(async ({ ctx, input }) => {
      await db.deleteReceipt(input.id, ctx.user.id);
      return { success: true };
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
      })).mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id && input.role !== "admin") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "自分自身のロールを管理者から変更することはできません" });
        }
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
      updatePlan: adminProcedure.input(z.object({
        userId: z.number(),
        plan: z.enum(["free", "premium"]),
      })).mutation(async ({ input }) => {
        await db.upsertSubscription(input.userId, input.plan);
        return { success: true };
      }),
    }),
    // 管理者によるユーザー削除
    users2: router({
      delete: adminProcedure.input(z.object({
        userId: z.number(),
      })).mutation(async ({ ctx, input }) => {
        if (input.userId === ctx.user.id) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "自分自身を削除することはできません" });
        }
        await db.deleteUser(input.userId);
        return { success: true };
      }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
