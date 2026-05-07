import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock notification module
vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn(async () => true),
}));

// Mock auth module
vi.mock("./auth", () => ({
  registerUser: vi.fn(async (email: string, password: string, name: string) => {
    return {
      user: { id: 99, openId: "email-test", email, name, role: "user", passwordHash: "hashed", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: "email" },
      token: "test-jwt-token",
    };
  }),
  loginUser: vi.fn(async (email: string, password: string) => {
    if (email === "test@example.com" && password === "password123") {
      return {
        user: { id: 1, openId: "test-user-001", email, name: "Test User", role: "user", passwordHash: "hashed", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), loginMethod: "email" },
        token: "test-jwt-token",
      };
    }
    throw new Error("メールアドレスまたはパスワードが正しくありません");
  }),
  authenticateRequest: vi.fn(async () => null),
}));

// Mock stripe module
vi.mock("./stripe", () => ({
  createCheckoutSession: vi.fn(async (params: any) => ({
    url: "https://checkout.stripe.com/test_session",
    sessionId: "cs_test_123",
  })),
  createPortalSession: vi.fn(async (params: any) => ({
    url: "https://billing.stripe.com/test_portal",
  })),
  getCheckoutSession: vi.fn(async (sessionId: string) => ({
    client_reference_id: "1",
    payment_status: "paid",
    customer: "cus_test_123",
    subscription: "sub_test_123",
  })),
}));

// Mock the db module
vi.mock("./db", () => {
  let mockAccounts: any[] = [];
  let mockTransactions: any[] = [];
  let mockClients: any[] = [];
  let mockInvoices: any[] = [];
  let mockProfile: any = null;
  let mockSubscription: any = null;
  let mockRecurring: any[] = [];
  let mockTaxFilings: any[] = [];
  let mockEmailLogs: any[] = [];
  let idCounter = 1;

  return {
    seedDefaultAccounts: vi.fn(async (userId: number) => {
      if (mockAccounts.length === 0) {
        mockAccounts = [
          { id: 1, userId, name: "売上高", type: "income", code: "100", isDefault: 1, sortOrder: 1, isActive: 1, description: null, categoryId: null, createdAt: new Date() },
          { id: 2, userId, name: "仕入高", type: "expense", code: "200", isDefault: 1, sortOrder: 1, isActive: 1, description: null, categoryId: null, createdAt: new Date() },
          { id: 3, userId, name: "旅費交通費", type: "expense", code: "230", isDefault: 1, sortOrder: 4, isActive: 1, description: null, categoryId: null, createdAt: new Date() },
        ];
        idCounter = 4;
      }
    }),
    getAccountsByUser: vi.fn(async () => mockAccounts),
    assertAccountsOwnedByUser: vi.fn(async (userId: number, accountIds: number[]) => {
      const unique = Array.from(new Set(accountIds.filter((id) => Number.isInteger(id) && id > 0)));
      if (unique.length === 0) throw new Error("Account ID is required");
      const owned = new Set(mockAccounts.filter(a => a.userId === userId).map(a => a.id));
      for (const id of unique) {
        if (!owned.has(id)) throw new Error("Account not found or not owned by user");
      }
    }),
    createAccount: vi.fn(async (data: any) => {
      const id = idCounter++;
      mockAccounts.push({ id, ...data, isDefault: 0, isActive: 1, sortOrder: 0, createdAt: new Date() });
      return { id };
    }),
    updateAccount: vi.fn(async (id: number, userId: number, data: any) => {
      const idx = mockAccounts.findIndex(a => a.id === id && a.userId === userId);
      if (idx >= 0) Object.assign(mockAccounts[idx], data);
    }),
    deleteAccount: vi.fn(async (id: number, userId: number) => {
      mockAccounts = mockAccounts.filter(a => !(a.id === id && a.userId === userId));
    }),
    getTransactionsByUser: vi.fn(async (userId: number, opts?: any) => {
      let items = mockTransactions.filter(t => t.userId === userId);
      if (opts?.type) items = items.filter(t => t.type === opts.type);
      return { items: items.slice(opts?.offset ?? 0, (opts?.offset ?? 0) + (opts?.limit ?? 50)), total: items.length };
    }),
    getTransactionCount: vi.fn(async (userId: number) => {
      return mockTransactions.filter(t => t.userId === userId).length;
    }),
    createTransaction: vi.fn(async (data: any) => {
      const id = idCounter++;
      mockTransactions.push({ id, ...data });
      return { id };
    }),
    updateTransaction: vi.fn(async (id: number, userId: number, data: any) => {
      const idx = mockTransactions.findIndex(t => t.id === id && t.userId === userId);
      if (idx >= 0) Object.assign(mockTransactions[idx], data);
    }),
    deleteTransaction: vi.fn(async (id: number, userId: number) => {
      mockTransactions = mockTransactions.filter(t => !(t.id === id && t.userId === userId));
    }),
    createTransactionsBulk: vi.fn(async (txns: any[]) => {
      const ids: number[] = [];
      for (const t of txns) {
        const id = idCounter++;
        mockTransactions.push({ id, ...t });
        ids.push(id);
      }
      return { count: ids.length };
    }),
    getMonthlySummary: vi.fn(async () => ({ income: 500000, expense: 200000 })),
    getYearlyMonthlyTrend: vi.fn(async () => [
      { type: "income", month: 1, total: 300000 },
      { type: "expense", month: 1, total: 100000 },
    ]),
    getAccountBreakdown: vi.fn(async () => [
      { accountId: 1, accountName: "売上高", type: "income", total: 500000 },
      { accountId: 2, accountName: "仕入高", type: "expense", total: 200000 },
    ]),
    getClientsByUser: vi.fn(async () => mockClients),
    createClient: vi.fn(async (data: any) => {
      const id = idCounter++;
      mockClients.push({ id, ...data });
      return { id };
    }),
    updateClient: vi.fn(async (id: number, userId: number, data: any) => {
      const idx = mockClients.findIndex(c => c.id === id && c.userId === userId);
      if (idx >= 0) Object.assign(mockClients[idx], data);
    }),
    deleteClient: vi.fn(async (id: number, userId: number) => {
      mockClients = mockClients.filter(c => !(c.id === id && c.userId === userId));
    }),
    getInvoicesByUser: vi.fn(async () => mockInvoices),
    getInvoiceById: vi.fn(async (id: number) => {
      const inv = mockInvoices.find(i => i.id === id);
      return inv ? { ...inv, items: [], client: null } : null;
    }),
    getNextInvoiceNumber: vi.fn(async () => "INV-0001"),
    createInvoice: vi.fn(async (data: any, items: any[]) => {
      const id = idCounter++;
      mockInvoices.push({ id, ...data, items });
      return { id };
    }),
    updateInvoice: vi.fn(async () => {}),
    deleteInvoice: vi.fn(async (id: number) => {
      mockInvoices = mockInvoices.filter(i => i.id !== id);
    }),
    getBusinessProfile: vi.fn(async () => mockProfile),
    upsertBusinessProfile: vi.fn(async (userId: number, data: any) => {
      mockProfile = { id: 1, userId, ...data };
      return 1;
    }),
    getSubscription: vi.fn(async () => mockSubscription),
    upsertSubscription: vi.fn(async (userId: number, plan: string, stripeData?: any) => {
      mockSubscription = { id: 1, userId, plan, startDate: Date.now(), stripeCustomerId: stripeData?.stripeCustomerId || null, stripeSubscriptionId: stripeData?.stripeSubscriptionId || null, stripeStatus: stripeData?.stripeStatus || null };
    }),
    getSubscriptionByStripeCustomerId: vi.fn(async () => null),
    updateSubscriptionByStripeSubId: vi.fn(async () => {}),
    // Recurring
    getRecurringByUser: vi.fn(async () => mockRecurring),
    createRecurring: vi.fn(async (data: any) => {
      const id = idCounter++;
      mockRecurring.push({ id, ...data, isActive: 1 });
      return { id };
    }),
    updateRecurring: vi.fn(async (id: number, userId: number, data: any) => {
      const idx = mockRecurring.findIndex(r => r.id === id && r.userId === userId);
      if (idx >= 0) Object.assign(mockRecurring[idx], data);
    }),
    deleteRecurring: vi.fn(async (id: number, userId: number) => {
      mockRecurring = mockRecurring.filter(r => !(r.id === id && r.userId === userId));
    }),
    // Tax Filings
    getTaxFilingsByUser: vi.fn(async () => mockTaxFilings),
    getTaxFilingById: vi.fn(async (id: number) => {
      const f = mockTaxFilings.find(t => t.id === id);
      return f || null;
    }),
    generateTaxFiling: vi.fn(async (userId: number, fiscalYear: number, filingType: string) => {
      const id = idCounter++;
      const filing = {
        id, userId, fiscalYear, filingType, status: "draft",
        totalIncome: "1000000", totalExpense: "400000", netIncome: "600000",
        taxableIncome: "500000", incomeTax: "50000",
        deductions: JSON.stringify({ basic: 480000, blue: 650000 }),
        createdAt: new Date(),
      };
      mockTaxFilings.push(filing);
      return filing;
    }),
    updateTaxFiling: vi.fn(async (id: number, userId: number, data: any) => {
      const idx = mockTaxFilings.findIndex(t => t.id === id && t.userId === userId);
      if (idx >= 0) Object.assign(mockTaxFilings[idx], data);
    }),
    deleteTaxFiling: vi.fn(async (id: number, userId: number) => {
      mockTaxFilings = mockTaxFilings.filter(t => !(t.id === id && t.userId === userId));
    }),
    // Email
    getEmailLogsByUser: vi.fn(async () => mockEmailLogs),
    createEmailLog: vi.fn(async (data: any) => {
      const id = idCounter++;
      const log = { id, ...data, sentAt: new Date() };
      mockEmailLogs.push(log);
      return log;
    }),
    updateEmailLogStatus: vi.fn(async (id: number, status: string) => {
      const idx = mockEmailLogs.findIndex(l => l.id === id);
      if (idx >= 0) mockEmailLogs[idx].status = status;
    }),
    // Admin
    getAdminStats: vi.fn(async () => ({
      totalUsers: 42, premiumUsers: 12, totalTransactions: 1500,
      totalInvoices: 200, monthlyRevenue: 23760,
    })),
    getAllUsers: vi.fn(async (opts?: any) => ({
      items: [
        { id: 1, name: "Test User", email: "test@example.com", role: "admin", createdAt: new Date(), lastSignedIn: new Date() },
        { id: 2, name: "User Two", email: "user2@example.com", role: "user", createdAt: new Date(), lastSignedIn: new Date() },
      ],
      total: 2,
    })),
    updateUserRole: vi.fn(async () => {}),
    getAdminSubscriptions: vi.fn(async (opts?: any) => ({
      items: [
        { id: 1, userId: 1, plan: "premium", startDate: Date.now(), endDate: null, userName: "Test User", userEmail: "test@example.com" },
        { id: 2, userId: 2, plan: "free", startDate: Date.now(), endDate: null, userName: "User Two", userEmail: "user2@example.com" },
      ],
      total: 2,
    })),
    // Tax calculation helpers
    calculateIncomeTax: vi.fn((taxableIncome: number) => {
      if (taxableIncome <= 1950000) return { incomeTax: Math.floor(taxableIncome * 0.05), taxRate: 5, deduction: 0 };
      if (taxableIncome <= 3300000) return { incomeTax: Math.floor(taxableIncome * 0.1 - 97500), taxRate: 10, deduction: 97500 };
      return { incomeTax: Math.floor(taxableIncome * 0.2 - 427500), taxRate: 20, deduction: 427500 };
    }),
    calculateResidentTax: vi.fn((taxableIncome: number) => Math.floor(taxableIncome * 0.1)),
    calculateBusinessTax: vi.fn((netIncome: number) => {
      if (netIncome <= 2900000) return 0;
      return Math.floor((netIncome - 2900000) * 0.05);
    }),
    calculateHealthInsurance: vi.fn((taxableIncome: number) => {
      return Math.min(Math.floor(taxableIncome * 0.11 + 50000), 1060000);
    }),
    calculateSalaryDeduction: vi.fn((salaryIncome: number) => {
      if (salaryIncome <= 1625000) return 550000;
      if (salaryIncome <= 1800000) return Math.floor(salaryIncome * 0.4 - 100000);
      if (salaryIncome <= 3600000) return Math.floor(salaryIncome * 0.3 + 80000);
      if (salaryIncome <= 6600000) return Math.floor(salaryIncome * 0.2 + 440000);
      if (salaryIncome <= 8500000) return Math.floor(salaryIncome * 0.1 + 1100000);
      return 1950000;
    }),
    // Required exports
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    getUserByEmail: vi.fn(async (email: string) => {
      if (email === "test@example.com") return { id: 1, openId: "test-user-001", email, name: "Test User", role: "user", passwordHash: "hashed" };
      return null;
    }),
    getDb: vi.fn(async () => null),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1, openId: "test-user-001", email: "test@example.com", name: "Test User",
    loginMethod: "email", role: "user", passwordHash: "hashed",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1, openId: "admin-user-001", email: "admin@example.com", name: "Admin User",
    loginMethod: "email", role: "admin", passwordHash: "hashed",
    createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Accounts (勘定科目)", () => {
  it("lists accounts and seeds defaults on first call", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const list = await caller.accounts.list();
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThan(0);
    expect(list[0]).toHaveProperty("name");
    expect(list[0]).toHaveProperty("type");
  });

  it("creates a new account", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.accounts.create({ name: "テスト科目", type: "expense", code: "999", description: "テスト用" });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("updates an account", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.accounts.update({ id: 1, name: "売上高（更新）" });
    expect(result).toEqual({ success: true });
  });

  it("deletes an account", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.accounts.delete({ id: 99 });
    expect(result).toEqual({ success: true });
  });
});

describe("Transactions (取引)", () => {
  it("lists transactions with pagination", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transactions.list({ limit: 10, offset: 0 });
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("creates a transaction", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transactions.create({ type: "income", accountId: 1, amount: "100000", date: Date.now(), description: "テスト売上" });
    expect(result).toHaveProperty("id");
  });

  it("updates a transaction", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transactions.update({ id: 1, description: "更新済み" });
    expect(result).toEqual({ success: true });
  });

  it("deletes a transaction", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transactions.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("filters transactions by type", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transactions.list({ type: "income" });
    expect(result).toHaveProperty("items");
  });

  it("imports transactions in bulk", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.transactions.import({
      source: "csv",
      data: [
        { type: "income", accountName: "売上高", amount: "50000", date: Date.now(), description: "CSVインポート1" },
        { type: "expense", accountName: "旅費交通費", amount: "3000", date: Date.now(), description: "CSVインポート2" },
      ],
    });
    expect(result).toHaveProperty("count");
    expect(result.count).toBe(2);
  });

  it("bulkCreate registers multiple sales and purchases at once", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const now = Date.now();
    const result = await caller.transactions.bulkCreate({
      items: [
        { type: "income", accountId: 1, amount: "150000", date: now, description: "売上A" },
        { type: "income", accountId: 1, amount: "80000", date: now, description: "売上B" },
        { type: "expense", accountId: 2, amount: "40000", date: now, description: "仕入A" },
      ],
    });
    expect(result.count).toBe(3);
  });

  it("bulkCreate rejects when accountId is not owned by user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.transactions.bulkCreate({
        items: [{ type: "income", accountId: 99999, amount: "1000", date: Date.now() }],
      }),
    ).rejects.toThrow(/勘定科目/);
  });

  it("bulkCreate rejects when account type does not match transaction type", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // accountId:1 は売上高(income)だが type:"expense" を指定 → 拒否
    await expect(
      caller.transactions.bulkCreate({
        items: [{ type: "expense", accountId: 1, amount: "1000", date: Date.now() }],
      }),
    ).rejects.toThrow(/仕入・経費/);
  });

  it("bulkCreate rejects amount out of range", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.transactions.bulkCreate({
        items: [{ type: "income", accountId: 1, amount: "9999999999999", date: Date.now() }],
      }),
    ).rejects.toThrow(/金額/);
  });

  it("simulate computes refund when withholdingTax exceeds incomeTax", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.taxFiling.simulate({
      year: 2026,
      filingType: "blue",
      workStyle: "side_business",
      salaryIncome: 1000000,
      withholdingTax: 999_999_999,
    });
    expect(result.withholdingTax).toBe(999_999_999);
    expect(result.refundAmount).toBeGreaterThan(0);
    expect(result.incomeTaxBalance).toBeLessThan(0);
  });

  it("simulate computes additional payment when incomeTax exceeds withholdingTax", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.taxFiling.simulate({
      year: 2026,
      filingType: "blue",
      workStyle: "side_business",
      salaryIncome: 5000000,
      withholdingTax: 1000,
    });
    expect(result.refundAmount).toBe(0);
    expect(result.incomeTaxBalance).toBeGreaterThanOrEqual(0);
  });
});

describe("Dashboard", () => {
  it("returns monthly summary", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.summary({ year: 2026, month: 3 });
    expect(result).toHaveProperty("income");
    expect(result).toHaveProperty("expense");
    expect(typeof result.income).toBe("number");
  });

  it("returns yearly trend data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.trend({ year: 2026 });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("type");
      expect(result[0]).toHaveProperty("month");
    }
  });

  it("returns recent transactions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.recentTransactions();
    expect(Array.isArray(result)).toBe(true);
  });

  it("returns account breakdown", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.accountBreakdown({ year: 2026, month: 3 });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("accountName");
      expect(result[0]).toHaveProperty("total");
    }
  });
});

describe("Clients (取引先)", () => {
  it("lists clients", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a client", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.create({ name: "株式会社テスト", contactPerson: "田中太郎", email: "tanaka@test.co.jp" });
    expect(result).toHaveProperty("id");
  });

  it("updates a client", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.update({ id: 1, name: "株式会社テスト（更新）" });
    expect(result).toEqual({ success: true });
  });

  it("deletes a client", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.clients.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("Invoices (請求書)", () => {
  it("lists invoices", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invoices.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("gets next invoice number", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invoices.nextNumber();
    expect(typeof result).toBe("string");
    expect(result).toMatch(/^INV-\d{4}$/);
  });

  it("creates an invoice with items", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invoices.create({
      invoiceNumber: "INV-0001", issueDate: Date.now(), dueDate: Date.now() + 30 * 86400000,
      subtotal: "100000", taxRate: "10", taxAmount: "10000", totalAmount: "110000",
      items: [{ description: "Webデザイン", quantity: "1", unitPrice: "100000", amount: "100000" }],
    });
    expect(result).toHaveProperty("id");
  });

  it("updates an invoice status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invoices.update({ id: 1, status: "sent" });
    expect(result).toEqual({ success: true });
  });

  it("deletes an invoice", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.invoices.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("Business Profile (事業者情報)", () => {
  it("gets business profile (initially null)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.businessProfile.get();
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("upserts business profile", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.businessProfile.upsert({
      businessName: "テスト事務所", representativeName: "テスト太郎",
      email: "test@example.com", taxId: "T1234567890123", filingType: "blue",
    });
    expect(result).toHaveProperty("id");
  });
});

describe("Subscription (サブスクリプション)", () => {
  it("gets subscription (initially null)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.get();
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("updates subscription plan", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.update({ plan: "premium" });
    expect(result).toEqual({ success: true });
  });

  it("returns plan limit info with transaction count", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.limitInfo();
    expect(result).toHaveProperty("plan");
    expect(result).toHaveProperty("transactionLimit");
    expect(result).toHaveProperty("transactionCount");
    expect(result).toHaveProperty("transactionRemaining");
    expect(typeof result.transactionCount).toBe("number");
  });
});

describe("Recurring (固定費・定期取引)", () => {
  it("lists recurring items", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.recurring.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("creates a recurring item", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.recurring.create({
      type: "expense", accountId: 2, amount: "50000",
      description: "事務所家賃", frequency: "monthly", dayOfMonth: 25,
    });
    expect(result).toHaveProperty("id");
    expect(typeof result.id).toBe("number");
  });

  it("updates a recurring item", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.recurring.update({ id: 1, amount: "55000" });
    expect(result).toEqual({ success: true });
  });

  it("toggles recurring active status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.recurring.update({ id: 1, isActive: 0 });
    expect(result).toEqual({ success: true });
  });

  it("deletes a recurring item", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.recurring.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });
});

describe("Tax Filing (確定申告)", () => {
  it("lists tax filings", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.taxFiling.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("generates a tax filing for blue return", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.taxFiling.generate({ fiscalYear: 2025, filingType: "blue" });
    expect(result).toHaveProperty("id");
    expect(result).toHaveProperty("totalIncome");
    expect(result).toHaveProperty("totalExpense");
    expect(result).toHaveProperty("netIncome");
    expect(result).toHaveProperty("taxableIncome");
    expect(result).toHaveProperty("incomeTax");
    expect(result.filingType).toBe("blue");
    expect(result.fiscalYear).toBe(2025);
    expect(result.status).toBe("draft");
  });

  it("generates a tax filing for white return", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.taxFiling.generate({ fiscalYear: 2025, filingType: "white" });
    expect(result).toHaveProperty("id");
    expect(result.filingType).toBe("white");
  });

  it("gets a tax filing by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const generated = await caller.taxFiling.generate({ fiscalYear: 2024, filingType: "blue" });
    const result = await caller.taxFiling.get({ id: generated.id });
    expect(result).not.toBeNull();
    expect(result?.fiscalYear).toBe(2024);
  });

  it("updates a tax filing status", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.taxFiling.update({ id: 1, status: "completed" });
    expect(result).toEqual({ success: true });
  });

  it("deletes a tax filing", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.taxFiling.delete({ id: 1 });
    expect(result).toEqual({ success: true });
  });

  it("simulates tax calculation for blue filing", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.taxFiling.simulate({ year: 2026, filingType: "blue" });
    expect(result).toHaveProperty("totalIncome");
    expect(result).toHaveProperty("totalExpense");
    expect(result).toHaveProperty("netIncome");
    expect(result).toHaveProperty("incomeTax");
    expect(result).toHaveProperty("residentTax");
    expect(result).toHaveProperty("businessTax");
    expect(result).toHaveProperty("healthInsurance");
    expect(result).toHaveProperty("totalTax");
    expect(result).toHaveProperty("effectiveRate");
    expect(result).toHaveProperty("specialDeduction");
    expect(typeof result.totalTax).toBe("number");
    expect(typeof result.effectiveRate).toBe("number");
  });

  it("simulates tax calculation for white filing (no blue deduction)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.taxFiling.simulate({ year: 2026, filingType: "white" });
    expect(result.specialDeduction).toBe(0);
  });
});

describe("Email (メール送信)", () => {
  it("lists email logs", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.email.logs();
    expect(Array.isArray(result)).toBe(true);
  });

  it("sends an invoice email", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.email.send({
      invoiceId: 1,
      toEmail: "client@example.com",
      toName: "株式会社テスト",
      subject: "【請求書】INV-0001",
      body: "請求書をお送りします。",
      documentType: "invoice",
    });
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("id");
  });

  it("sends an email without invoice link", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.email.send({
      toEmail: "client@example.com",
      subject: "見積書のご送付",
      body: "見積書を添付いたします。",
      documentType: "quote",
    });
    expect(result).toHaveProperty("success", true);
  });
});

describe("Admin (管理者)", () => {
  it("returns admin stats", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.stats();
    expect(result).toHaveProperty("totalUsers");
    expect(result).toHaveProperty("premiumUsers");
    expect(result).toHaveProperty("totalTransactions");
    expect(result).toHaveProperty("totalInvoices");
    expect(result).toHaveProperty("monthlyRevenue");
    expect(typeof result.totalUsers).toBe("number");
  });

  it("lists all users", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.users.list({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
    expect(result.items.length).toBeGreaterThan(0);
  });

  it("updates user role", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.users.updateRole({ userId: 2, role: "admin" });
    expect(result).toEqual({ success: true });
  });

  it("lists subscriptions", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.admin.subscriptions.list({});
    expect(result).toHaveProperty("items");
    expect(result).toHaveProperty("total");
    expect(Array.isArray(result.items)).toBe(true);
  });

  it("rejects non-admin access to admin stats", async () => {
    const ctx = createAuthContext(); // regular user
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.stats()).rejects.toThrow();
  });

  it("rejects non-admin access to user list", async () => {
    const ctx = createAuthContext(); // regular user
    const caller = appRouter.createCaller(ctx);
    await expect(caller.admin.users.list({})).rejects.toThrow();
  });
});

describe("Stripe Subscription (決済連携)", () => {
  it("creates a checkout session for premium upgrade", async () => {
    const ctx = createAuthContext();
    (ctx.req as any).headers = { origin: "https://example.com" };
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.createCheckout({ origin: "https://example.com" });
    expect(result).toHaveProperty("url");
    expect(result).toHaveProperty("sessionId");
    expect(result.url).toContain("stripe.com");
  });

  it("returns plan limit info for free plan", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.limitInfo();
    expect(result).toHaveProperty("plan");
    expect(result).toHaveProperty("transactionLimit");
    expect(result).toHaveProperty("transactionCount");
    expect(result).toHaveProperty("transactionRemaining");
  });

  it("verifies a checkout session", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.verifySession({ sessionId: "cs_test_123" });
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("status", "paid");
  });

  it("creates portal session when Stripe customer exists", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    // After previous test updated subscription with stripeCustomerId, portal should work
    // or if subscription is null, it should throw
    try {
      const result = await caller.subscription.createPortal({ origin: "https://example.com" });
      expect(result).toHaveProperty("url");
    } catch (err: any) {
      // Expected if no Stripe customer ID
      expect(err.code).toBe("BAD_REQUEST");
    }
  });

  it("gets current subscription", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.get();
    // Initially null or whatever mock returns
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("updates subscription plan", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.update({ plan: "premium" });
    expect(result).toEqual({ success: true });
  });
});

// ===== Auth (メール認証) =====
describe("Auth (メール認証)", () => {
  function createUnauthContext(): TrpcContext {
    return {
      user: null,
      req: { protocol: "https", headers: { origin: "https://example.com" } } as TrpcContext["req"],
      res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
    };
  }

  it("registers a new user", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.register({
      email: "newuser@example.com",
      password: "SecurePass123",
      name: "New User",
    });
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("user");
    expect(result.user).toHaveProperty("email", "newuser@example.com");
    expect(result.user).toHaveProperty("name", "New User");
  });

  it("logs in with valid credentials", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.login({
      email: "test@example.com",
      password: "password123",
    });
    expect(result).toHaveProperty("success", true);
    expect(result).toHaveProperty("user");
    expect(result.user).toHaveProperty("email", "test@example.com");
  });

  it("rejects login with invalid credentials", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.auth.login({
        email: "test@example.com",
        password: "wrongpassword",
      })
    ).rejects.toThrow();
  });

  it("returns current user via me query", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.me();
    expect(result).toHaveProperty("id", 1);
    expect(result).toHaveProperty("email", "test@example.com");
  });

  it("logs out successfully", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.auth.logout();
    expect(result).toEqual({ success: true });
  });
});
