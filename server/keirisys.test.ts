import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module
vi.mock("./db", () => {
  let mockAccounts: any[] = [];
  let mockTransactions: any[] = [];
  let mockClients: any[] = [];
  let mockInvoices: any[] = [];
  let mockProfile: any = null;
  let mockSubscription: any = null;
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
    upsertSubscription: vi.fn(async (userId: number, plan: string) => {
      mockSubscription = { id: 1, userId, plan, startDate: Date.now() };
    }),
    // Required exports from original db.ts
    upsertUser: vi.fn(),
    getUserByOpenId: vi.fn(),
    getDb: vi.fn(async () => null),
  };
});

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-001",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
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
    const result = await caller.accounts.create({
      name: "テスト科目",
      type: "expense",
      code: "999",
      description: "テスト用",
    });
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
    const result = await caller.transactions.create({
      type: "income",
      accountId: 1,
      amount: "100000",
      date: Date.now(),
      description: "テスト売上",
    });
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
});

describe("Dashboard", () => {
  it("returns monthly summary", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.summary({ year: 2026, month: 3 });
    expect(result).toHaveProperty("income");
    expect(result).toHaveProperty("expense");
    expect(typeof result.income).toBe("number");
    expect(typeof result.expense).toBe("number");
  });

  it("returns yearly trend data", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.dashboard.trend({ year: 2026 });
    expect(Array.isArray(result)).toBe(true);
    if (result.length > 0) {
      expect(result[0]).toHaveProperty("type");
      expect(result[0]).toHaveProperty("month");
      expect(result[0]).toHaveProperty("total");
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
    const result = await caller.clients.create({
      name: "株式会社テスト",
      contactPerson: "田中太郎",
      email: "tanaka@test.co.jp",
    });
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
      invoiceNumber: "INV-0001",
      issueDate: Date.now(),
      dueDate: Date.now() + 30 * 86400000,
      subtotal: "100000",
      taxRate: "10",
      taxAmount: "10000",
      totalAmount: "110000",
      items: [
        { description: "Webデザイン", quantity: "1", unitPrice: "100000", amount: "100000" },
      ],
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
    // Can be null initially
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("upserts business profile", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.businessProfile.upsert({
      businessName: "テスト事務所",
      representativeName: "テスト太郎",
      email: "test@example.com",
      taxId: "T1234567890123",
    });
    expect(result).toHaveProperty("id");
  });
});

describe("Subscription (サブスクリプション)", () => {
  it("gets subscription (initially null)", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.get();
    // Can be null initially
    expect(result === null || typeof result === "object").toBe(true);
  });

  it("updates subscription plan", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.subscription.update({ plan: "premium" });
    expect(result).toEqual({ success: true });
  });
});
