import { eq, and, desc, asc, sql, gte, lte } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  accounts, InsertAccount,
  accountCategories, InsertAccountCategory,
  transactions, InsertTransaction,
  clients, InsertClient,
  invoices, InsertInvoice,
  invoiceItems, InsertInvoiceItem,
  businessProfiles, InsertBusinessProfile,
  subscriptions,
  recurringTransactions, InsertRecurringTransaction,
  taxFilings, InsertTaxFiling,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── User ───
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => { const value = user[field]; if (value === undefined) return; const normalized = value ?? null; values[field] = normalized; updateSet[field] = normalized; };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; } else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) { console.error("[Database] Failed to upsert user:", error); throw error; }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Accounts (勘定科目) ───
export async function getAccountsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.type), asc(accounts.sortOrder));
}

export async function createAccount(data: InsertAccount) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(accounts).values(data);
  return { id: result[0].insertId };
}

export async function updateAccount(id: number, userId: number, data: Partial<InsertAccount>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(accounts).set(data).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
}

export async function deleteAccount(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
}

export async function seedDefaultAccounts(userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1);
  if (existing.length > 0) return;
  const defaults: Omit<InsertAccount, "id">[] = [
    { userId, name: "売上高", type: "income", code: "100", isDefault: 1, sortOrder: 1 },
    { userId, name: "雑収入", type: "income", code: "110", isDefault: 1, sortOrder: 2 },
    { userId, name: "受取利息", type: "income", code: "120", isDefault: 1, sortOrder: 3 },
    { userId, name: "仕入高", type: "expense", code: "200", isDefault: 1, sortOrder: 1 },
    { userId, name: "給料賃金", type: "expense", code: "210", isDefault: 1, sortOrder: 2 },
    { userId, name: "外注工賃", type: "expense", code: "220", isDefault: 1, sortOrder: 3 },
    { userId, name: "旅費交通費", type: "expense", code: "230", isDefault: 1, sortOrder: 4 },
    { userId, name: "通信費", type: "expense", code: "240", isDefault: 1, sortOrder: 5 },
    { userId, name: "広告宣伝費", type: "expense", code: "250", isDefault: 1, sortOrder: 6 },
    { userId, name: "接待交際費", type: "expense", code: "260", isDefault: 1, sortOrder: 7 },
    { userId, name: "消耗品費", type: "expense", code: "270", isDefault: 1, sortOrder: 8 },
    { userId, name: "地代家賃", type: "expense", code: "280", isDefault: 1, sortOrder: 9 },
    { userId, name: "水道光熱費", type: "expense", code: "290", isDefault: 1, sortOrder: 10 },
    { userId, name: "保険料", type: "expense", code: "300", isDefault: 1, sortOrder: 11 },
    { userId, name: "修繕費", type: "expense", code: "310", isDefault: 1, sortOrder: 12 },
    { userId, name: "減価償却費", type: "expense", code: "320", isDefault: 1, sortOrder: 13 },
    { userId, name: "租税公課", type: "expense", code: "330", isDefault: 1, sortOrder: 14 },
    { userId, name: "雑費", type: "expense", code: "340", isDefault: 1, sortOrder: 15 },
    { userId, name: "新聞図書費", type: "expense", code: "350", isDefault: 1, sortOrder: 16 },
    { userId, name: "研修費", type: "expense", code: "360", isDefault: 1, sortOrder: 17 },
  ];
  await db.insert(accounts).values(defaults);
}

// ─── Account Categories ───
export async function getCategoriesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accountCategories).where(eq(accountCategories.userId, userId)).orderBy(asc(accountCategories.sortOrder));
}

export async function createCategory(data: InsertAccountCategory) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(accountCategories).values(data);
  return { id: result[0].insertId };
}

export async function deleteCategory(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(accountCategories).where(and(eq(accountCategories.id, id), eq(accountCategories.userId, userId)));
}

// ─── Transactions (取引) ───
export async function getTransactionsByUser(userId: number, opts?: { startDate?: number; endDate?: number; type?: string; accountId?: number; limit?: number; offset?: number }) {
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions = [eq(transactions.userId, userId)];
  if (opts?.startDate) conditions.push(gte(transactions.date, opts.startDate));
  if (opts?.endDate) conditions.push(lte(transactions.date, opts.endDate));
  if (opts?.type && (opts.type === "income" || opts.type === "expense")) conditions.push(eq(transactions.type, opts.type));
  if (opts?.accountId) conditions.push(eq(transactions.accountId, opts.accountId));
  const where = and(...conditions);
  const [items, countResult] = await Promise.all([
    db.select().from(transactions).where(where).orderBy(desc(transactions.date), desc(transactions.id)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(transactions).where(where),
  ]);
  return { items, total: countResult[0]?.count ?? 0 };
}

export async function createTransaction(data: InsertTransaction) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(transactions).values(data);
  return { id: result[0].insertId };
}

export async function createTransactionsBulk(dataList: InsertTransaction[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (dataList.length === 0) return { count: 0 };
  await db.insert(transactions).values(dataList);
  return { count: dataList.length };
}

export async function updateTransaction(id: number, userId: number, data: Partial<InsertTransaction>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(transactions).set(data).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

export async function deleteTransaction(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

// ─── Dashboard Aggregations ───
export async function getMonthlySummary(userId: number, year: number, month: number) {
  const db = await getDb();
  if (!db) return { income: 0, expense: 0 };
  const startDate = new Date(year, month - 1, 1).getTime();
  const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime();
  const result = await db.select({
    type: transactions.type,
    total: sql<string>`COALESCE(SUM(amount), 0)`,
  }).from(transactions).where(and(eq(transactions.userId, userId), gte(transactions.date, startDate), lte(transactions.date, endDate))).groupBy(transactions.type);
  let income = 0, expense = 0;
  for (const r of result) {
    if (r.type === "income") income = Number(r.total);
    if (r.type === "expense") expense = Number(r.total);
  }
  return { income, expense };
}

export async function getYearlyMonthlyTrend(userId: number, year: number) {
  const db = await getDb();
  if (!db) return [];
  const startDate = new Date(year, 0, 1).getTime();
  const endDate = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
  const result = await db.select({
    type: transactions.type,
    month: sql<string>`MONTH(FROM_UNIXTIME(date / 1000))`,
    total: sql<string>`COALESCE(SUM(amount), 0)`,
  }).from(transactions).where(and(eq(transactions.userId, userId), gte(transactions.date, startDate), lte(transactions.date, endDate))).groupBy(transactions.type, sql`MONTH(FROM_UNIXTIME(date / 1000))`);
  return result.map(r => ({ type: r.type, month: Number(r.month), total: Number(r.total) }));
}

export async function getAccountBreakdown(userId: number, year: number, month?: number) {
  const db = await getDb();
  if (!db) return [];
  let startDate: number, endDate: number;
  if (month) {
    startDate = new Date(year, month - 1, 1).getTime();
    endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime();
  } else {
    startDate = new Date(year, 0, 1).getTime();
    endDate = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
  }
  const result = await db.select({
    accountId: transactions.accountId,
    accountName: accounts.name,
    type: transactions.type,
    total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
  }).from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(eq(transactions.userId, userId), gte(transactions.date, startDate), lte(transactions.date, endDate)))
    .groupBy(transactions.accountId, accounts.name, transactions.type);
  return result.map(r => ({ accountId: r.accountId, accountName: r.accountName, type: r.type, total: Number(r.total) }));
}

// ─── Clients (取引先) ───
export async function getClientsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients).where(eq(clients.userId, userId)).orderBy(asc(clients.name));
}

export async function createClient(data: InsertClient) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(clients).values(data);
  return { id: result[0].insertId };
}

export async function updateClient(id: number, userId: number, data: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(clients).set(data).where(and(eq(clients.id, id), eq(clients.userId, userId)));
}

export async function deleteClient(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)));
}

// ─── Invoices (請求書) ───
export async function getInvoicesByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.issueDate));
}

export async function getInvoiceById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId))).limit(1);
  if (result.length === 0) return null;
  const items = await db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id)).orderBy(asc(invoiceItems.sortOrder));
  let client = null;
  if (result[0].clientId) {
    const c = await db.select().from(clients).where(eq(clients.id, result[0].clientId)).limit(1);
    if (c.length > 0) client = c[0];
  }
  return { ...result[0], items, client };
}

export async function createInvoice(data: InsertInvoice, items: Omit<InsertInvoiceItem, "invoiceId">[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(invoices).values(data);
  const invoiceId = result[0].insertId;
  if (items.length > 0) {
    await db.insert(invoiceItems).values(items.map((item, i) => ({ ...item, invoiceId, sortOrder: i })));
  }
  return { id: invoiceId };
}

export async function updateInvoice(id: number, userId: number, data: Partial<InsertInvoice>, items?: Omit<InsertInvoiceItem, "invoiceId">[]) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(invoices).set(data).where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
  if (items !== undefined) {
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
    if (items.length > 0) {
      await db.insert(invoiceItems).values(items.map((item, i) => ({ ...item, invoiceId: id, sortOrder: i })));
    }
  }
}

export async function deleteInvoice(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
}

export async function getNextInvoiceNumber(userId: number): Promise<string> {
  const db = await getDb();
  if (!db) return "INV-0001";
  const result = await db.select({ invoiceNumber: invoices.invoiceNumber }).from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.id)).limit(1);
  if (result.length === 0) return "INV-0001";
  const last = result[0].invoiceNumber;
  const match = last.match(/(\d+)$/);
  if (!match) return "INV-0001";
  const next = String(Number(match[1]) + 1).padStart(4, "0");
  return `INV-${next}`;
}

// ─── Business Profile ───
export async function getBusinessProfile(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertBusinessProfile(userId: number, data: Partial<InsertBusinessProfile>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getBusinessProfile(userId);
  if (existing) {
    await db.update(businessProfiles).set({ ...data, userId }).where(eq(businessProfiles.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(businessProfiles).values({ ...data, userId } as InsertBusinessProfile);
    return result[0].insertId;
  }
}

// ─── Subscriptions ───
export async function getSubscription(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertSubscription(userId: number, plan: "free" | "premium") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getSubscription(userId);
  const now = Date.now();
  if (existing) {
    await db.update(subscriptions).set({ plan, startDate: now }).where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values({ userId, plan, startDate: now });
  }
}

// ─── Recurring Transactions (固定費・定期取引) ───
export async function getRecurringByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, userId)).orderBy(asc(recurringTransactions.description));
}

export async function createRecurring(data: InsertRecurringTransaction) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(recurringTransactions).values(data);
  return { id: result[0].insertId };
}

export async function updateRecurring(id: number, userId: number, data: Partial<InsertRecurringTransaction>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(recurringTransactions).set(data).where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)));
}

export async function deleteRecurring(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(recurringTransactions).where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)));
}

// ─── Tax Filings (確定申告) ───
export async function getTaxFilingsByUser(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taxFilings).where(eq(taxFilings.userId, userId)).orderBy(desc(taxFilings.fiscalYear));
}

export async function getTaxFilingById(id: number, userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(taxFilings).where(and(eq(taxFilings.id, id), eq(taxFilings.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function generateTaxFiling(userId: number, fiscalYear: number, filingType: "blue" | "white") {
  const db = await getDb();
  if (!db) throw new Error("DB not available");

  // Calculate totals from transactions for the fiscal year
  const startDate = new Date(fiscalYear, 0, 1).getTime();
  const endDate = new Date(fiscalYear, 11, 31, 23, 59, 59, 999).getTime();

  const result = await db.select({
    type: transactions.type,
    total: sql<string>`COALESCE(SUM(amount), 0)`,
  }).from(transactions).where(and(eq(transactions.userId, userId), gte(transactions.date, startDate), lte(transactions.date, endDate))).groupBy(transactions.type);

  let totalIncome = 0, totalExpense = 0;
  for (const r of result) {
    if (r.type === "income") totalIncome = Number(r.total);
    if (r.type === "expense") totalExpense = Number(r.total);
  }

  const netIncome = totalIncome - totalExpense;
  const specialDeduction = filingType === "blue" ? Math.min(650000, netIncome) : 0;
  const taxableIncome = Math.max(0, netIncome - specialDeduction);

  // Get account-level breakdown
  const breakdown = await db.select({
    accountId: transactions.accountId,
    accountName: accounts.name,
    type: transactions.type,
    total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
  }).from(transactions)
    .innerJoin(accounts, eq(transactions.accountId, accounts.id))
    .where(and(eq(transactions.userId, userId), gte(transactions.date, startDate), lte(transactions.date, endDate)))
    .groupBy(transactions.accountId, accounts.name, transactions.type);

  const breakdownData = breakdown.map(b => ({ accountId: b.accountId, accountName: b.accountName, type: b.type, total: Number(b.total) }));

  // Check if filing already exists for this year
  const existing = await db.select().from(taxFilings).where(and(eq(taxFilings.userId, userId), eq(taxFilings.fiscalYear, fiscalYear))).limit(1);

  const filingData = {
    userId,
    fiscalYear,
    filingType,
    totalIncome: String(totalIncome),
    totalExpense: String(totalExpense),
    netIncome: String(netIncome),
    specialDeduction: String(specialDeduction),
    taxableIncome: String(taxableIncome),
    breakdownData: JSON.stringify(breakdownData),
    status: "draft" as const,
  };

  if (existing.length > 0) {
    await db.update(taxFilings).set(filingData).where(eq(taxFilings.id, existing[0].id));
    return { id: existing[0].id };
  } else {
    const insertResult = await db.insert(taxFilings).values(filingData);
    return { id: insertResult[0].insertId };
  }
}

export async function updateTaxFiling(id: number, userId: number, data: Partial<InsertTaxFiling>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(taxFilings).set(data).where(and(eq(taxFilings.id, id), eq(taxFilings.userId, userId)));
}

export async function deleteTaxFiling(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(taxFilings).where(and(eq(taxFilings.id, id), eq(taxFilings.userId, userId)));
}
