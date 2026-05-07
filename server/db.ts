import { eq, and, desc, asc, sql, gte, lte, count, ne, inArray } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users, User,
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
  emailLogs, InsertEmailLog,
  receipts,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

// ─── In-Memory Store (used when DATABASE_URL is not set) ───
const inMemoryUsers: Map<string, User & { passwordHash?: string | null }> = new Map();
let inMemoryIdCounter = 1;

function isInMemoryMode() {
  return !process.env.DATABASE_URL;
}

function getInMemoryUserByEmail(email: string) {
  for (const u of Array.from(inMemoryUsers.values())) {
    if (u.email === email) return u;
  }
  return undefined;
}

function getInMemoryUserByOpenId(openId: string) {
  return inMemoryUsers.get(openId);
}

function getInMemoryUserById(id: number) {
  for (const u of Array.from(inMemoryUsers.values())) {
    if (u.id === id) return u;
  }
  return undefined;
}

// ─── User ───
export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");

  if (isInMemoryMode()) {
    const existing = inMemoryUsers.get(user.openId);
    if (existing) {
      if (user.name !== undefined) existing.name = user.name ?? null;
      if (user.email !== undefined) existing.email = user.email ?? null;
      if (user.passwordHash !== undefined) existing.passwordHash = user.passwordHash ?? null;
      if (user.loginMethod !== undefined) existing.loginMethod = user.loginMethod ?? null;
      if (user.role !== undefined) existing.role = user.role;
      if (user.lastSignedIn !== undefined) existing.lastSignedIn = user.lastSignedIn as Date;
      else existing.lastSignedIn = new Date();
    } else {
      const now = new Date();
      inMemoryUsers.set(user.openId, {
        id: inMemoryIdCounter++,
        openId: user.openId,
        name: user.name ?? null,
        email: user.email ?? null,
        passwordHash: user.passwordHash ?? null,
        loginMethod: user.loginMethod ?? null,
        role: user.role ?? "user",
        createdAt: now,
        updatedAt: now,
        lastSignedIn: (user.lastSignedIn as Date) ?? now,
      });
    }
    return;
  }

  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod", "passwordHash"] as const;
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
  if (isInMemoryMode()) return getInMemoryUserByOpenId(openId);
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  if (isInMemoryMode()) return getInMemoryUserByEmail(email);
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── In-Memory Data Stores ───
const inMemoryAccounts: any[] = [];
const inMemoryTransactions: any[] = [];
const inMemoryInvoices: any[] = [];
const inMemoryInvoiceItems: any[] = [];
const inMemoryClients: any[] = [];
const inMemoryRecurring: any[] = [];
const inMemoryTaxFilings: any[] = [];
const inMemorySubscriptions: any[] = [];
const inMemoryEmailLogs: any[] = [];
const inMemoryBusinessProfiles: any[] = [];
const inMemoryCategories: any[] = [];
const inMemoryReceipts: any[] = [];
let inMemoryGeneralIdCounter = 1000;

// ─── Seed Default Admin User (in-memory mode) ───
export async function seedInMemoryAdmin() {
  if (!isInMemoryMode()) return;
  const adminEmail = ENV.adminEmail;
  const adminPassword = ENV.adminPassword;
  if (!adminEmail || !adminPassword) {
    console.warn("[InMemory] ADMIN_EMAIL and ADMIN_PASSWORD env vars required for admin seed. Skipping.");
    return;
  }
  const bcrypt = await import("bcryptjs");
  const hash = await bcrypt.hash(adminPassword, 12);
  const openId = "email-admin-default";
  if (!inMemoryUsers.has(openId)) {
    const now = new Date();
    inMemoryUsers.set(openId, {
      id: inMemoryIdCounter++,
      openId,
      name: ENV.adminName,
      email: adminEmail,
      passwordHash: hash,
      loginMethod: "email",
      role: "admin",
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    });
    // Auto-assign premium plan to admin
    const adminUser = inMemoryUsers.get(openId)!;
    const existingSub = inMemorySubscriptions.find((s: any) => s.userId === adminUser.id);
    if (!existingSub) {
      inMemorySubscriptions.push({
        id: inMemoryGeneralIdCounter++,
        userId: adminUser.id,
        plan: "premium",
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        stripeStatus: "active",
        startDate: now.getTime(),
        endDate: null,
        createdAt: now,
        updatedAt: now,
      });
    }
    console.log("[InMemory] Admin user seeded (premium)");
  }
}

// ─── Accounts (勘定科目) ───
export async function getAccountsByUser(userId: number) {
  if (isInMemoryMode()) return inMemoryAccounts.filter(a => a.userId === userId).sort((a: any, b: any) => a.type.localeCompare(b.type) || a.sortOrder - b.sortOrder);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accounts).where(eq(accounts.userId, userId)).orderBy(asc(accounts.type), asc(accounts.sortOrder));
}

// 所有権チェック: accountIds がすべて userId のものか検証する。不正な場合は throw。
export async function assertAccountsOwnedByUser(userId: number, accountIds: number[]): Promise<void> {
  const uniqueIds = Array.from(new Set(accountIds.filter((id) => Number.isInteger(id) && id > 0)));
  if (uniqueIds.length === 0) throw new Error("Account ID is required");
  if (isInMemoryMode()) {
    const owned = new Set(inMemoryAccounts.filter((a: any) => a.userId === userId).map((a: any) => a.id));
    for (const id of uniqueIds) {
      if (!owned.has(id)) throw new Error("Account not found or not owned by user");
    }
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const rows = await db.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.userId, userId), inArray(accounts.id, uniqueIds)));
  if (rows.length !== uniqueIds.length) throw new Error("Account not found or not owned by user");
}

export async function createAccount(data: InsertAccount) {
  if (isInMemoryMode()) {
    const id = inMemoryGeneralIdCounter++;
    const now = new Date();
    inMemoryAccounts.push({ id, ...data, isDefault: data.isDefault ?? 0, isActive: 1, sortOrder: data.sortOrder ?? 0, createdAt: now, updatedAt: now });
    return { id };
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(accounts).values(data);
  return { id: result[0].insertId };
}

export async function updateAccount(id: number, userId: number, data: Partial<InsertAccount>) {
  if (isInMemoryMode()) {
    const a = inMemoryAccounts.find((a: any) => a.id === id && a.userId === userId);
    if (a) Object.assign(a, data, { updatedAt: new Date() });
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(accounts).set(data).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
}

export async function deleteAccount(id: number, userId: number) {
  if (isInMemoryMode()) {
    const idx = inMemoryAccounts.findIndex((a: any) => a.id === id && a.userId === userId);
    if (idx >= 0) inMemoryAccounts.splice(idx, 1);
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(accounts).where(and(eq(accounts.id, id), eq(accounts.userId, userId)));
}

function getDefaultAccounts(userId: number): Omit<InsertAccount, "id">[] {
  return [
    // ─── 収入科目 ───
    { userId, name: "売上高", type: "income", code: "100", isDefault: 1, sortOrder: 1 },
    { userId, name: "売上値引・返品", type: "income", code: "101", isDefault: 1, sortOrder: 2 },
    { userId, name: "雑収入", type: "income", code: "110", isDefault: 1, sortOrder: 3 },
    { userId, name: "受取利息", type: "income", code: "120", isDefault: 1, sortOrder: 4 },
    { userId, name: "受取配当金", type: "income", code: "121", isDefault: 1, sortOrder: 5 },
    { userId, name: "受取手数料", type: "income", code: "130", isDefault: 1, sortOrder: 6 },
    { userId, name: "為替差益", type: "income", code: "140", isDefault: 1, sortOrder: 7 },
    { userId, name: "固定資産売却益", type: "income", code: "150", isDefault: 1, sortOrder: 8 },
    { userId, name: "事業主借", type: "income", code: "160", isDefault: 1, sortOrder: 9 },

    // ─── 経費科目 ───
    { userId, name: "仕入高", type: "expense", code: "200", isDefault: 1, sortOrder: 1 },
    { userId, name: "給料賃金", type: "expense", code: "210", isDefault: 1, sortOrder: 2 },
    { userId, name: "賞与", type: "expense", code: "211", isDefault: 1, sortOrder: 3 },
    { userId, name: "法定福利費", type: "expense", code: "212", isDefault: 1, sortOrder: 4 },
    { userId, name: "福利厚生費", type: "expense", code: "213", isDefault: 1, sortOrder: 5 },
    { userId, name: "外注工賃", type: "expense", code: "220", isDefault: 1, sortOrder: 6 },
    { userId, name: "旅費交通費", type: "expense", code: "230", isDefault: 1, sortOrder: 7 },
    { userId, name: "通信費", type: "expense", code: "240", isDefault: 1, sortOrder: 8 },
    { userId, name: "広告宣伝費", type: "expense", code: "250", isDefault: 1, sortOrder: 9 },
    { userId, name: "接待交際費", type: "expense", code: "260", isDefault: 1, sortOrder: 10 },
    { userId, name: "会議費", type: "expense", code: "261", isDefault: 1, sortOrder: 11 },
    { userId, name: "消耗品費", type: "expense", code: "270", isDefault: 1, sortOrder: 12 },
    { userId, name: "事務用品費", type: "expense", code: "271", isDefault: 1, sortOrder: 13 },
    { userId, name: "地代家賃", type: "expense", code: "280", isDefault: 1, sortOrder: 14 },
    { userId, name: "水道光熱費", type: "expense", code: "290", isDefault: 1, sortOrder: 15 },
    { userId, name: "保険料", type: "expense", code: "300", isDefault: 1, sortOrder: 16 },
    { userId, name: "修繕費", type: "expense", code: "310", isDefault: 1, sortOrder: 17 },
    { userId, name: "減価償却費", type: "expense", code: "320", isDefault: 1, sortOrder: 18 },
    { userId, name: "租税公課", type: "expense", code: "330", isDefault: 1, sortOrder: 19 },
    { userId, name: "荷造運賃", type: "expense", code: "331", isDefault: 1, sortOrder: 20 },
    { userId, name: "車両費", type: "expense", code: "332", isDefault: 1, sortOrder: 21 },
    { userId, name: "リース料", type: "expense", code: "333", isDefault: 1, sortOrder: 22 },
    { userId, name: "支払手数料", type: "expense", code: "334", isDefault: 1, sortOrder: 23 },
    { userId, name: "振込手数料", type: "expense", code: "335", isDefault: 1, sortOrder: 24 },
    { userId, name: "支払報酬", type: "expense", code: "336", isDefault: 1, sortOrder: 25 },
    { userId, name: "諸会費", type: "expense", code: "337", isDefault: 1, sortOrder: 26 },
    { userId, name: "寄附金", type: "expense", code: "338", isDefault: 1, sortOrder: 27 },
    { userId, name: "雑費", type: "expense", code: "340", isDefault: 1, sortOrder: 28 },
    { userId, name: "新聞図書費", type: "expense", code: "350", isDefault: 1, sortOrder: 29 },
    { userId, name: "研修費", type: "expense", code: "360", isDefault: 1, sortOrder: 30 },
    { userId, name: "ソフトウェア利用料", type: "expense", code: "370", isDefault: 1, sortOrder: 31 },
    { userId, name: "クラウドサービス利用料", type: "expense", code: "371", isDefault: 1, sortOrder: 32 },
    { userId, name: "貸倒損失", type: "expense", code: "380", isDefault: 1, sortOrder: 33 },
    { userId, name: "貸倒引当金繰入", type: "expense", code: "381", isDefault: 1, sortOrder: 34 },
    { userId, name: "支払利息", type: "expense", code: "390", isDefault: 1, sortOrder: 35 },
    { userId, name: "為替差損", type: "expense", code: "391", isDefault: 1, sortOrder: 36 },
    { userId, name: "固定資産売却損", type: "expense", code: "392", isDefault: 1, sortOrder: 37 },
    { userId, name: "雑損失", type: "expense", code: "395", isDefault: 1, sortOrder: 38 },
    { userId, name: "事業主貸", type: "expense", code: "399", isDefault: 1, sortOrder: 39 },

    // ─── 資産科目 ───
    { userId, name: "現金", type: "asset", code: "400", isDefault: 1, sortOrder: 1 },
    { userId, name: "普通預金", type: "asset", code: "410", isDefault: 1, sortOrder: 2 },
    { userId, name: "当座預金", type: "asset", code: "411", isDefault: 1, sortOrder: 3 },
    { userId, name: "定期預金", type: "asset", code: "412", isDefault: 1, sortOrder: 4 },
    { userId, name: "売掛金", type: "asset", code: "420", isDefault: 1, sortOrder: 5 },
    { userId, name: "受取手形", type: "asset", code: "421", isDefault: 1, sortOrder: 6 },
    { userId, name: "未収入金", type: "asset", code: "422", isDefault: 1, sortOrder: 7 },
    { userId, name: "前払金", type: "asset", code: "430", isDefault: 1, sortOrder: 8 },
    { userId, name: "前払費用", type: "asset", code: "431", isDefault: 1, sortOrder: 9 },
    { userId, name: "仮払金", type: "asset", code: "432", isDefault: 1, sortOrder: 10 },
    { userId, name: "立替金", type: "asset", code: "433", isDefault: 1, sortOrder: 11 },
    { userId, name: "棚卸資産（商品）", type: "asset", code: "440", isDefault: 1, sortOrder: 12 },
    { userId, name: "棚卸資産（製品）", type: "asset", code: "441", isDefault: 1, sortOrder: 13 },
    { userId, name: "棚卸資産（原材料）", type: "asset", code: "442", isDefault: 1, sortOrder: 14 },
    { userId, name: "建物", type: "asset", code: "450", isDefault: 1, sortOrder: 15 },
    { userId, name: "建物附属設備", type: "asset", code: "451", isDefault: 1, sortOrder: 16 },
    { userId, name: "機械装置", type: "asset", code: "452", isDefault: 1, sortOrder: 17 },
    { userId, name: "車両運搬具", type: "asset", code: "453", isDefault: 1, sortOrder: 18 },
    { userId, name: "工具器具備品", type: "asset", code: "454", isDefault: 1, sortOrder: 19 },
    { userId, name: "土地", type: "asset", code: "460", isDefault: 1, sortOrder: 20 },
    { userId, name: "ソフトウェア", type: "asset", code: "470", isDefault: 1, sortOrder: 21 },
    { userId, name: "敷金・保証金", type: "asset", code: "480", isDefault: 1, sortOrder: 22 },
    { userId, name: "長期前払費用", type: "asset", code: "481", isDefault: 1, sortOrder: 23 },
    { userId, name: "開業費", type: "asset", code: "490", isDefault: 1, sortOrder: 24 },

    // ─── 負債科目 ───
    { userId, name: "買掛金", type: "liability", code: "500", isDefault: 1, sortOrder: 1 },
    { userId, name: "支払手形", type: "liability", code: "501", isDefault: 1, sortOrder: 2 },
    { userId, name: "未払金", type: "liability", code: "510", isDefault: 1, sortOrder: 3 },
    { userId, name: "未払費用", type: "liability", code: "511", isDefault: 1, sortOrder: 4 },
    { userId, name: "未払法人税等", type: "liability", code: "512", isDefault: 1, sortOrder: 5 },
    { userId, name: "未払消費税", type: "liability", code: "513", isDefault: 1, sortOrder: 6 },
    { userId, name: "預り金", type: "liability", code: "520", isDefault: 1, sortOrder: 7 },
    { userId, name: "源泉所得税預り金", type: "liability", code: "521", isDefault: 1, sortOrder: 8 },
    { userId, name: "前受金", type: "liability", code: "530", isDefault: 1, sortOrder: 9 },
    { userId, name: "仮受金", type: "liability", code: "531", isDefault: 1, sortOrder: 10 },
    { userId, name: "短期借入金", type: "liability", code: "540", isDefault: 1, sortOrder: 11 },
    { userId, name: "長期借入金", type: "liability", code: "550", isDefault: 1, sortOrder: 12 },
    { userId, name: "クレジットカード未払金", type: "liability", code: "560", isDefault: 1, sortOrder: 13 },
  ];
}

export async function seedDefaultAccounts(userId: number) {
  if (isInMemoryMode()) {
    const existing = inMemoryAccounts.find((a: any) => a.userId === userId);
    if (existing) return;
    const defaults = getDefaultAccounts(userId);
    const now = new Date();
    for (const d of defaults) {
      inMemoryAccounts.push({ id: inMemoryGeneralIdCounter++, ...d, isActive: 1, description: null, categoryId: null, createdAt: now, updatedAt: now });
    }
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await db.select().from(accounts).where(eq(accounts.userId, userId)).limit(1);
  if (existing.length > 0) return;
  const defaults = getDefaultAccounts(userId);
  await db.insert(accounts).values(defaults);
}

// ─── Account Categories ───
export async function getCategoriesByUser(userId: number) {
  if (isInMemoryMode()) return inMemoryCategories.filter((c: any) => c.userId === userId);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(accountCategories).where(eq(accountCategories.userId, userId)).orderBy(asc(accountCategories.sortOrder));
}

export async function createCategory(data: InsertAccountCategory) {
  if (isInMemoryMode()) { const id = inMemoryGeneralIdCounter++; inMemoryCategories.push({ id, ...data, createdAt: new Date() }); return { id }; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(accountCategories).values(data);
  return { id: result[0].insertId };
}

export async function deleteCategory(id: number, userId: number) {
  if (isInMemoryMode()) { const idx = inMemoryCategories.findIndex((c: any) => c.id === id && c.userId === userId); if (idx >= 0) inMemoryCategories.splice(idx, 1); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(accountCategories).where(and(eq(accountCategories.id, id), eq(accountCategories.userId, userId)));
}

// ─── Transactions (取引) ───
export async function getTransactionsByUser(userId: number, opts?: { startDate?: number; endDate?: number; type?: string; accountId?: number; limit?: number; offset?: number }) {
  if (isInMemoryMode()) {
    let items = inMemoryTransactions.filter((t: any) => t.userId === userId);
    if (opts?.startDate) items = items.filter((t: any) => t.date >= opts.startDate!);
    if (opts?.endDate) items = items.filter((t: any) => t.date <= opts.endDate!);
    if (opts?.type && (opts.type === "income" || opts.type === "expense")) items = items.filter((t: any) => t.type === opts.type);
    if (opts?.accountId) items = items.filter((t: any) => t.accountId === opts.accountId);
    items.sort((a: any, b: any) => b.date - a.date || b.id - a.id);
    const total = items.length;
    const offset = opts?.offset ?? 0;
    const limit = opts?.limit ?? 50;
    return { items: items.slice(offset, offset + limit), total };
  }
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
  if (isInMemoryMode()) {
    const id = inMemoryGeneralIdCounter++;
    const now = new Date();
    inMemoryTransactions.push({ id, ...data, receiptUrl: null, importSource: null, taxCategory: data.taxCategory ?? "taxable_10", taxIncluded: data.taxIncluded ?? 1, createdAt: now, updatedAt: now });
    return { id };
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(transactions).values(data);
  return { id: result[0].insertId };
}

export async function createTransactionsBulk(dataList: InsertTransaction[]) {
  if (isInMemoryMode()) {
    const now = new Date();
    for (const d of dataList) { inMemoryTransactions.push({ id: inMemoryGeneralIdCounter++, ...d, receiptUrl: null, taxCategory: d.taxCategory ?? "taxable_10", taxIncluded: d.taxIncluded ?? 1, createdAt: now, updatedAt: now }); }
    return { count: dataList.length };
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  if (dataList.length === 0) return { count: 0 };
  await db.insert(transactions).values(dataList);
  return { count: dataList.length };
}

export async function updateTransaction(id: number, userId: number, data: Partial<InsertTransaction>) {
  if (isInMemoryMode()) { const t = inMemoryTransactions.find((t: any) => t.id === id && t.userId === userId); if (t) Object.assign(t, data, { updatedAt: new Date() }); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(transactions).set(data).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

export async function deleteTransaction(id: number, userId: number) {
  if (isInMemoryMode()) { const idx = inMemoryTransactions.findIndex((t: any) => t.id === id && t.userId === userId); if (idx >= 0) inMemoryTransactions.splice(idx, 1); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(transactions).where(and(eq(transactions.id, id), eq(transactions.userId, userId)));
}

// ─── Transaction Count (for plan limits) ───
export async function getTransactionCount(userId: number): Promise<number> {
  if (isInMemoryMode()) return inMemoryTransactions.filter((t: any) => t.userId === userId).length;
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`count(*)` }).from(transactions).where(eq(transactions.userId, userId));
  return result[0]?.count ?? 0;
}

// ─── Dashboard Aggregations ───
export async function getMonthlySummary(userId: number, year: number, month: number) {
  if (isInMemoryMode()) {
    const startDate = new Date(year, month - 1, 1).getTime();
    const endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime();
    let income = 0, expense = 0;
    for (const t of inMemoryTransactions) {
      if (t.userId !== userId || t.date < startDate || t.date > endDate) continue;
      if (t.type === "income") income += Number(t.amount);
      if (t.type === "expense") expense += Number(t.amount);
    }
    return { income, expense };
  }
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
  if (isInMemoryMode()) {
    const startDate = new Date(year, 0, 1).getTime();
    const endDate = new Date(year, 11, 31, 23, 59, 59, 999).getTime();
    const monthMap = new Map<string, number>();
    for (const t of inMemoryTransactions) {
      if (t.userId !== userId || t.date < startDate || t.date > endDate) continue;
      const d = new Date(t.date);
      const key = `${t.type}-${d.getMonth() + 1}`;
      monthMap.set(key, (monthMap.get(key) ?? 0) + Number(t.amount));
    }
    return Array.from(monthMap.entries()).map(([k, v]) => { const [type, month] = k.split("-"); return { type, month: Number(month), total: v }; });
  }
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
  if (isInMemoryMode()) {
    let startDate: number, endDate: number;
    if (month) { startDate = new Date(year, month - 1, 1).getTime(); endDate = new Date(year, month, 0, 23, 59, 59, 999).getTime(); }
    else { startDate = new Date(year, 0, 1).getTime(); endDate = new Date(year, 11, 31, 23, 59, 59, 999).getTime(); }
    const map = new Map<number, { accountId: number; accountName: string; type: string; total: number }>();
    for (const t of inMemoryTransactions) {
      if (t.userId !== userId || t.date < startDate || t.date > endDate) continue;
      const existing = map.get(t.accountId);
      const acct = inMemoryAccounts.find((a: any) => a.id === t.accountId);
      if (existing) { existing.total += Number(t.amount); }
      else { map.set(t.accountId, { accountId: t.accountId, accountName: acct?.name ?? "", type: t.type, total: Number(t.amount) }); }
    }
    return Array.from(map.values());
  }
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
  if (isInMemoryMode()) return inMemoryClients.filter((c: any) => c.userId === userId).sort((a: any, b: any) => a.name.localeCompare(b.name));
  const db = await getDb();
  if (!db) return [];
  return db.select().from(clients).where(eq(clients.userId, userId)).orderBy(asc(clients.name));
}

export async function createClient(data: InsertClient) {
  if (isInMemoryMode()) { const id = inMemoryGeneralIdCounter++; const now = new Date(); inMemoryClients.push({ id, ...data, createdAt: now, updatedAt: now }); return { id }; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(clients).values(data);
  return { id: result[0].insertId };
}

export async function updateClient(id: number, userId: number, data: Partial<InsertClient>) {
  if (isInMemoryMode()) { const c = inMemoryClients.find((c: any) => c.id === id && c.userId === userId); if (c) Object.assign(c, data, { updatedAt: new Date() }); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(clients).set(data).where(and(eq(clients.id, id), eq(clients.userId, userId)));
}

export async function deleteClient(id: number, userId: number) {
  if (isInMemoryMode()) { const idx = inMemoryClients.findIndex((c: any) => c.id === id && c.userId === userId); if (idx >= 0) inMemoryClients.splice(idx, 1); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(clients).where(and(eq(clients.id, id), eq(clients.userId, userId)));
}

// ─── Invoices (請求書) ───
export async function getInvoicesByUser(userId: number) {
  if (isInMemoryMode()) return inMemoryInvoices.filter((i: any) => i.userId === userId).sort((a: any, b: any) => b.issueDate - a.issueDate);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(invoices).where(eq(invoices.userId, userId)).orderBy(desc(invoices.issueDate));
}

export async function getInvoiceById(id: number, userId: number) {
  if (isInMemoryMode()) {
    const inv = inMemoryInvoices.find((i: any) => i.id === id && i.userId === userId);
    if (!inv) return null;
    const items = inMemoryInvoiceItems.filter((it: any) => it.invoiceId === id).sort((a: any, b: any) => a.sortOrder - b.sortOrder);
    let client = null;
    if (inv.clientId) client = inMemoryClients.find((c: any) => c.id === inv.clientId) ?? null;
    return { ...inv, items, client };
  }
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
  if (isInMemoryMode()) {
    const id = inMemoryGeneralIdCounter++;
    const now = new Date();
    inMemoryInvoices.push({ id, ...data, createdAt: now, updatedAt: now });
    for (let i = 0; i < items.length; i++) { inMemoryInvoiceItems.push({ id: inMemoryGeneralIdCounter++, invoiceId: id, ...items[i], sortOrder: i }); }
    return { id };
  }
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
  if (isInMemoryMode()) {
    const inv = inMemoryInvoices.find((i: any) => i.id === id && i.userId === userId);
    if (inv) Object.assign(inv, data, { updatedAt: new Date() });
    if (items !== undefined) {
      const idxs = inMemoryInvoiceItems.map((it: any, idx: number) => it.invoiceId === id ? idx : -1).filter((i: number) => i >= 0).reverse();
      for (const idx of idxs) inMemoryInvoiceItems.splice(idx, 1);
      for (let i = 0; i < items.length; i++) { inMemoryInvoiceItems.push({ id: inMemoryGeneralIdCounter++, invoiceId: id, ...items[i], sortOrder: i }); }
    }
    return;
  }
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
  if (isInMemoryMode()) {
    const idxs = inMemoryInvoiceItems.map((it: any, idx: number) => it.invoiceId === id ? idx : -1).filter((i: number) => i >= 0).reverse();
    for (const idx of idxs) inMemoryInvoiceItems.splice(idx, 1);
    const invIdx = inMemoryInvoices.findIndex((i: any) => i.id === id && i.userId === userId);
    if (invIdx >= 0) inMemoryInvoices.splice(invIdx, 1);
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));
  await db.delete(invoices).where(and(eq(invoices.id, id), eq(invoices.userId, userId)));
}

export async function getNextQuoteNumber(userId: number): Promise<string> {
  if (isInMemoryMode()) {
    const userQuotes = inMemoryInvoices.filter((i: any) => i.userId === userId && typeof i.invoiceNumber === "string" && i.invoiceNumber.startsWith("Q-"));
    if (userQuotes.length === 0) return "Q-0001";
    const last = userQuotes.sort((a: any, b: any) => b.id - a.id)[0].invoiceNumber;
    const match = last.match(/(\d+)$/);
    if (!match) return "Q-0001";
    return `Q-${String(Number(match[1]) + 1).padStart(4, "0")}`;
  }
  const db = await getDb();
  if (!db) return "Q-0001";
  const result = await db.select({ invoiceNumber: invoices.invoiceNumber }).from(invoices).where(and(eq(invoices.userId, userId), sql`${invoices.invoiceNumber} LIKE 'Q-%'`)).orderBy(desc(invoices.id)).limit(1);
  if (result.length === 0) return "Q-0001";
  const last = result[0].invoiceNumber;
  const match = last.match(/(\d+)$/);
  if (!match) return "Q-0001";
  const next = String(Number(match[1]) + 1).padStart(4, "0");
  return `Q-${next}`;
}

export async function getNextInvoiceNumber(userId: number): Promise<string> {
  if (isInMemoryMode()) {
    const userInvoices = inMemoryInvoices.filter((i: any) => i.userId === userId);
    if (userInvoices.length === 0) return "INV-0001";
    const last = userInvoices.sort((a: any, b: any) => b.id - a.id)[0].invoiceNumber;
    const match = last.match(/(\d+)$/);
    if (!match) return "INV-0001";
    return `INV-${String(Number(match[1]) + 1).padStart(4, "0")}`;
  }
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
  if (isInMemoryMode()) return inMemoryBusinessProfiles.find((b: any) => b.userId === userId) ?? null;
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(businessProfiles).where(eq(businessProfiles.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertBusinessProfile(userId: number, data: Partial<InsertBusinessProfile>) {
  if (isInMemoryMode()) {
    const existing = inMemoryBusinessProfiles.find((b: any) => b.userId === userId);
    if (existing) { Object.assign(existing, data, { updatedAt: new Date() }); return existing.id; }
    const id = inMemoryGeneralIdCounter++; const now = new Date();
    inMemoryBusinessProfiles.push({ id, userId, businessName: "", representativeName: "", postalCode: "", address: null, phone: "", email: "", taxId: "", bankName: "", bankBranch: "", bankAccountType: "", bankAccountNumber: "", bankAccountName: "", fiscalYearStart: 1, filingType: "white", ...data, createdAt: now, updatedAt: now });
    return id;
  }
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
  if (isInMemoryMode()) return inMemorySubscriptions.find((s: any) => s.userId === userId) ?? null;
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function upsertSubscription(userId: number, plan: "free" | "premium", stripeData?: {
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  stripeStatus?: string;
}) {
  if (isInMemoryMode()) {
    const existing = inMemorySubscriptions.find((s: any) => s.userId === userId);
    const now = Date.now();
    if (existing) { existing.plan = plan; existing.startDate = now; if (stripeData?.stripeCustomerId) existing.stripeCustomerId = stripeData.stripeCustomerId; if (stripeData?.stripeSubscriptionId) existing.stripeSubscriptionId = stripeData.stripeSubscriptionId; if (stripeData?.stripeStatus) existing.stripeStatus = stripeData.stripeStatus; }
    else { inMemorySubscriptions.push({ id: inMemoryGeneralIdCounter++, userId, plan, startDate: now, endDate: null, stripeCustomerId: stripeData?.stripeCustomerId ?? null, stripeSubscriptionId: stripeData?.stripeSubscriptionId ?? null, stripeStatus: stripeData?.stripeStatus ?? null, createdAt: new Date(), updatedAt: new Date() }); }
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const existing = await getSubscription(userId);
  const now = Date.now();
  const setData: Record<string, unknown> = { plan, startDate: now };
  if (stripeData?.stripeCustomerId) setData.stripeCustomerId = stripeData.stripeCustomerId;
  if (stripeData?.stripeSubscriptionId) setData.stripeSubscriptionId = stripeData.stripeSubscriptionId;
  if (stripeData?.stripeStatus) setData.stripeStatus = stripeData.stripeStatus;
  if (existing) {
    await db.update(subscriptions).set(setData).where(eq(subscriptions.id, existing.id));
  } else {
    await db.insert(subscriptions).values({ userId, plan, startDate: now, ...stripeData });
  }
}

export async function getSubscriptionByStripeCustomerId(stripeCustomerId: string) {
  if (isInMemoryMode()) return inMemorySubscriptions.find((s: any) => s.stripeCustomerId === stripeCustomerId) ?? null;
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(subscriptions).where(eq(subscriptions.stripeCustomerId, stripeCustomerId)).limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function updateSubscriptionByStripeSubId(stripeSubscriptionId: string, data: Partial<{
  plan: "free" | "premium";
  stripeStatus: string;
  endDate: number;
}>) {
  if (isInMemoryMode()) { const s = inMemorySubscriptions.find((s: any) => s.stripeSubscriptionId === stripeSubscriptionId); if (s) Object.assign(s, data); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(subscriptions).set(data).where(eq(subscriptions.stripeSubscriptionId, stripeSubscriptionId));
}

// ─── Recurring Transactions (固定費・定期取引) ───
export async function getRecurringByUser(userId: number) {
  if (isInMemoryMode()) return inMemoryRecurring.filter((r: any) => r.userId === userId);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(recurringTransactions).where(eq(recurringTransactions.userId, userId)).orderBy(asc(recurringTransactions.description));
}

export async function createRecurring(data: InsertRecurringTransaction) {
  if (isInMemoryMode()) { const id = inMemoryGeneralIdCounter++; const now = new Date(); inMemoryRecurring.push({ id, ...data, isActive: 1, lastGeneratedDate: null, createdAt: now, updatedAt: now }); return { id }; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(recurringTransactions).values(data);
  return { id: result[0].insertId };
}

export async function updateRecurring(id: number, userId: number, data: Partial<InsertRecurringTransaction>) {
  if (isInMemoryMode()) { const r = inMemoryRecurring.find((r: any) => r.id === id && r.userId === userId); if (r) Object.assign(r, data, { updatedAt: new Date() }); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(recurringTransactions).set(data).where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)));
}

export async function deleteRecurring(id: number, userId: number) {
  if (isInMemoryMode()) { const idx = inMemoryRecurring.findIndex((r: any) => r.id === id && r.userId === userId); if (idx >= 0) inMemoryRecurring.splice(idx, 1); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(recurringTransactions).where(and(eq(recurringTransactions.id, id), eq(recurringTransactions.userId, userId)));
}

// ─── Tax Filings (確定申告) ───
export async function getTaxFilingsByUser(userId: number) {
  if (isInMemoryMode()) return inMemoryTaxFilings.filter((t: any) => t.userId === userId).sort((a: any, b: any) => b.fiscalYear - a.fiscalYear);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(taxFilings).where(eq(taxFilings.userId, userId)).orderBy(desc(taxFilings.fiscalYear));
}

export async function getTaxFilingById(id: number, userId: number) {
  if (isInMemoryMode()) return inMemoryTaxFilings.find((t: any) => t.id === id && t.userId === userId) ?? null;
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(taxFilings).where(and(eq(taxFilings.id, id), eq(taxFilings.userId, userId))).limit(1);
  return result.length > 0 ? result[0] : null;
}

/** 所得税の計算ロジック（2024年以降の税率表に基づく） */
export function calculateIncomeTax(taxableIncome: number): { incomeTax: number; taxRate: number; deduction: number } {
  if (taxableIncome <= 0) return { incomeTax: 0, taxRate: 0, deduction: 0 };
  // 所得税速算表
  const brackets = [
    { limit: 1950000, rate: 0.05, deduction: 0 },
    { limit: 3300000, rate: 0.10, deduction: 97500 },
    { limit: 6950000, rate: 0.20, deduction: 427500 },
    { limit: 9000000, rate: 0.23, deduction: 636000 },
    { limit: 18000000, rate: 0.33, deduction: 1536000 },
    { limit: 40000000, rate: 0.40, deduction: 2796000 },
    { limit: Infinity, rate: 0.45, deduction: 4796000 },
  ];
  for (const b of brackets) {
    if (taxableIncome <= b.limit) {
      const incomeTax = Math.floor(taxableIncome * b.rate - b.deduction);
      return { incomeTax, taxRate: b.rate * 100, deduction: b.deduction };
    }
  }
  return { incomeTax: 0, taxRate: 0, deduction: 0 };
}

/** 住民税の概算（一律10%） */
export function calculateResidentTax(taxableIncome: number): number {
  if (taxableIncome <= 0) return 0;
  return Math.floor(taxableIncome * 0.10);
}

/** 個人事業税の概算（事業所得290万超の部分に5%） */
export function calculateBusinessTax(netIncome: number): number {
  const threshold = 2900000;
  if (netIncome <= threshold) return 0;
  return Math.floor((netIncome - threshold) * 0.05);
}

/** 国民健康保険料の概算（所得割率 約11%、均等割 約5万円） */
export function calculateHealthInsurance(taxableIncome: number): number {
  if (taxableIncome <= 0) return 50000;
  return Math.min(Math.floor(taxableIncome * 0.11 + 50000), 1060000); // 上限106万
}

/** 給与所得控除の計算（2020年以降の税制に基づく） */
export function calculateSalaryDeduction(salaryIncome: number): number {
  if (salaryIncome <= 0) return 0;
  if (salaryIncome <= 1625000) return 550000;
  if (salaryIncome <= 1800000) return Math.floor(salaryIncome * 0.40 - 100000);
  if (salaryIncome <= 3600000) return Math.floor(salaryIncome * 0.30 + 80000);
  if (salaryIncome <= 6600000) return Math.floor(salaryIncome * 0.20 + 440000);
  if (salaryIncome <= 8500000) return Math.floor(salaryIncome * 0.10 + 1100000);
  return 1950000; // 上限195万円
}

export async function generateTaxFiling(userId: number, fiscalYear: number, filingType: "blue" | "white") {
  if (isInMemoryMode()) {
    const startDate = new Date(fiscalYear, 0, 1).getTime();
    const endDate = new Date(fiscalYear, 11, 31, 23, 59, 59, 999).getTime();
    let totalIncome = 0, totalExpense = 0;
    for (const t of inMemoryTransactions) {
      if (t.userId !== userId || t.date < startDate || t.date > endDate) continue;
      if (t.type === "income") totalIncome += Number(t.amount);
      if (t.type === "expense") totalExpense += Number(t.amount);
    }
    const netIncome = totalIncome - totalExpense;
    const specialDeduction = filingType === "blue" ? Math.min(650000, Math.max(0, netIncome)) : 0;
    const taxableIncome = Math.max(0, netIncome - specialDeduction - 480000);
    const { incomeTax } = calculateIncomeTax(taxableIncome);
    const filingData = { userId, fiscalYear, filingType, totalIncome: String(totalIncome), totalExpense: String(totalExpense), netIncome: String(netIncome), specialDeduction: String(specialDeduction), taxableIncome: String(taxableIncome), incomeTax: String(incomeTax), breakdownData: "[]", status: "draft" as const };
    const existing = inMemoryTaxFilings.find((t: any) => t.userId === userId && t.fiscalYear === fiscalYear);
    if (existing) { Object.assign(existing, filingData, { updatedAt: new Date() }); return { id: existing.id, ...filingData }; }
    const id = inMemoryGeneralIdCounter++; const now = new Date();
    inMemoryTaxFilings.push({ id, ...filingData, createdAt: now, updatedAt: now });
    return { id, ...filingData };
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");

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
  const specialDeduction = filingType === "blue" ? Math.min(650000, Math.max(0, netIncome)) : 0;
  const taxableIncome = Math.max(0, netIncome - specialDeduction - 480000); // 基礎控除48万
  const { incomeTax } = calculateIncomeTax(taxableIncome);

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

  const existing = await db.select().from(taxFilings).where(and(eq(taxFilings.userId, userId), eq(taxFilings.fiscalYear, fiscalYear))).limit(1);

  const filingData = {
    userId, fiscalYear, filingType,
    totalIncome: String(totalIncome), totalExpense: String(totalExpense),
    netIncome: String(netIncome), specialDeduction: String(specialDeduction),
    taxableIncome: String(taxableIncome), incomeTax: String(incomeTax),
    breakdownData: JSON.stringify(breakdownData),
    status: "draft" as const,
  };

  if (existing.length > 0) {
    await db.update(taxFilings).set(filingData).where(eq(taxFilings.id, existing[0].id));
    return { id: existing[0].id, ...filingData };
  } else {
    const insertResult = await db.insert(taxFilings).values(filingData);
    return { id: insertResult[0].insertId, ...filingData };
  }
}

export async function updateTaxFiling(id: number, userId: number, data: Partial<InsertTaxFiling>) {
  if (isInMemoryMode()) { const t = inMemoryTaxFilings.find((t: any) => t.id === id && t.userId === userId); if (t) Object.assign(t, data, { updatedAt: new Date() }); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(taxFilings).set(data).where(and(eq(taxFilings.id, id), eq(taxFilings.userId, userId)));
}

export async function deleteTaxFiling(id: number, userId: number) {
  if (isInMemoryMode()) { const idx = inMemoryTaxFilings.findIndex((t: any) => t.id === id && t.userId === userId); if (idx >= 0) inMemoryTaxFilings.splice(idx, 1); return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.delete(taxFilings).where(and(eq(taxFilings.id, id), eq(taxFilings.userId, userId)));
}

// ─── Email Logs (メール送信履歴) ───
export async function getEmailLogsByUser(userId: number) {
  if (isInMemoryMode()) return inMemoryEmailLogs.filter((e: any) => e.userId === userId).sort((a: any, b: any) => b.createdAt - a.createdAt);
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emailLogs).where(eq(emailLogs.userId, userId)).orderBy(desc(emailLogs.createdAt));
}

export async function createEmailLog(data: InsertEmailLog) {
  if (isInMemoryMode()) { const id = inMemoryGeneralIdCounter++; inMemoryEmailLogs.push({ id, ...data, sentAt: null, createdAt: new Date() }); return { id }; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(emailLogs).values(data);
  return { id: result[0].insertId };
}

export async function updateEmailLogStatus(id: number, status: "sent" | "failed") {
  if (isInMemoryMode()) { const e = inMemoryEmailLogs.find((e: any) => e.id === id); if (e) { e.status = status; if (status === "sent") e.sentAt = new Date(); } return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(emailLogs).set({ status, sentAt: status === "sent" ? new Date() : undefined }).where(eq(emailLogs.id, id));
}

// ─── Admin: User Management ───
export async function getAllUsers(opts?: { limit?: number; offset?: number; search?: string }) {
  if (isInMemoryMode()) {
    let items = Array.from(inMemoryUsers.values());
    if (opts?.search) { const s = opts.search.toLowerCase(); items = items.filter(u => (u.name?.toLowerCase().includes(s)) || (u.email?.toLowerCase().includes(s))); }
    const total = items.length;
    const offset = opts?.offset ?? 0;
    const limit = opts?.limit ?? 50;
    // プラン情報を付加
    const itemsWithPlan = items.slice(offset, offset + limit).map(u => {
      const sub = inMemorySubscriptions.find((s: any) => s.userId === u.id);
      return { ...u, plan: sub?.plan ?? "free" };
    });
    return { items: itemsWithPlan, total };
  }
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const conditions: any[] = [];
  if (opts?.search) {
    conditions.push(sql`(${users.name} LIKE ${`%${opts.search}%`} OR ${users.email} LIKE ${`%${opts.search}%`})`);
  }
  const where = conditions.length > 0 ? and(...conditions) : undefined;
  const [items, countResult] = await Promise.all([
    db.select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      createdAt: users.createdAt,
      lastSignedIn: users.lastSignedIn,
      openId: users.openId,
      loginMethod: users.loginMethod,
      passwordHash: users.passwordHash,
      plan: subscriptions.plan,
    }).from(users)
      .leftJoin(subscriptions, eq(users.id, subscriptions.userId))
      .where(where).orderBy(desc(users.createdAt)).limit(opts?.limit ?? 50).offset(opts?.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(users).where(where),
  ]);
  // plan が null の場合は "free" をセット
  const itemsWithPlan = items.map(u => ({ ...u, plan: u.plan ?? "free" }));
  return { items: itemsWithPlan, total: countResult[0]?.count ?? 0 };
}

export async function updateUserRole(userId: number, role: "user" | "admin") {
  if (isInMemoryMode()) { const u = getInMemoryUserById(userId); if (u) u.role = role; return; }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function deleteUser(userId: number) {
  if (isInMemoryMode()) {
    for (const [key, u] of Array.from(inMemoryUsers.entries())) {
      if (u.id === userId) { inMemoryUsers.delete(key); break; }
    }
    // Clean up related data
    const removeByUserId = (arr: any[]) => {
      for (let i = arr.length - 1; i >= 0; i--) { if (arr[i].userId === userId) arr.splice(i, 1); }
    };
    removeByUserId(inMemoryAccounts);
    removeByUserId(inMemoryTransactions);
    removeByUserId(inMemoryInvoices);
    removeByUserId(inMemoryClients);
    removeByUserId(inMemoryRecurring);
    removeByUserId(inMemoryTaxFilings);
    removeByUserId(inMemorySubscriptions);
    removeByUserId(inMemoryEmailLogs);
    removeByUserId(inMemoryBusinessProfiles);
    return;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Delete related data then user
  await db.delete(transactions).where(eq(transactions.userId, userId));
  await db.delete(accounts).where(eq(accounts.userId, userId));
  await db.delete(clients).where(eq(clients.userId, userId));
  await db.delete(recurringTransactions).where(eq(recurringTransactions.userId, userId));
  await db.delete(taxFilings).where(eq(taxFilings.userId, userId));
  await db.delete(subscriptions).where(eq(subscriptions.userId, userId));
  await db.delete(emailLogs).where(eq(emailLogs.userId, userId));
  await db.delete(receipts).where(eq(receipts.userId, userId));
  await db.delete(businessProfiles).where(eq(businessProfiles.userId, userId));
  await db.delete(users).where(eq(users.id, userId));
}

// ─── Admin: Stats ───
export async function getAdminStats() {
  if (isInMemoryMode()) {
    const totalUsers = inMemoryUsers.size;
    // 管理者ユーザーのIDを取得（売上に換算しない）
    const adminUserIds = new Set<number>();
    for (const u of Array.from(inMemoryUsers.values())) {
      if (u.role === "admin") adminUserIds.add(u.id);
    }
    let premiumUsers = 0;
    for (const s of inMemorySubscriptions) {
      if (adminUserIds.has(s.userId)) continue; // 管理者を除外
      if (s.plan === "premium") premiumUsers++;
    }
    // freeUsers = 非管理者ユーザー数 - プレミアムユーザー数（サブスクレコードがないユーザーも無料として計上）
    const nonAdminUsers = totalUsers - adminUserIds.size;
    const freeUsers = nonAdminUsers - premiumUsers;
    return { totalUsers, premiumUsers, freeUsers, totalTransactions: inMemoryTransactions.length, totalInvoices: inMemoryInvoices.length };
  }
  const db = await getDb();
  if (!db) return { totalUsers: 0, premiumUsers: 0, freeUsers: 0, totalTransactions: 0, totalInvoices: 0 };

  const [userCount, adminCount, subCounts, txnCount, invCount] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(users),
    // 管理者ユーザー数を取得
    db.select({ count: sql<number>`count(*)` }).from(users).where(sql`${users.role} = 'admin'`),
    // 管理者ユーザーを除外してプレミアムユーザー数をカウント
    db.select({ plan: subscriptions.plan, count: sql<number>`count(*)` })
      .from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .where(sql`${users.role} != 'admin'`)
      .groupBy(subscriptions.plan),
    db.select({ count: sql<number>`count(*)` }).from(transactions),
    db.select({ count: sql<number>`count(*)` }).from(invoices),
  ]);

  let premiumUsers = 0;
  for (const s of subCounts) {
    if (s.plan === "premium") premiumUsers = s.count;
  }
  // freeUsers = 非管理者ユーザー数 - プレミアムユーザー数（サブスクレコードがないユーザーも無料として計上）
  const totalUsersCount = userCount[0]?.count ?? 0;
  const adminUsersCount = adminCount[0]?.count ?? 0;
  const freeUsers = totalUsersCount - adminUsersCount - premiumUsers;

  return {
    totalUsers: totalUsersCount,
    premiumUsers,
    freeUsers,
    totalTransactions: txnCount[0]?.count ?? 0,
    totalInvoices: invCount[0]?.count ?? 0,
  };
}

export async function getAdminSubscriptions(opts?: { limit?: number; offset?: number }) {
  if (isInMemoryMode()) {
    const items = inMemorySubscriptions.map((s: any) => {
      const u = getInMemoryUserById(s.userId);
      return { id: s.id, userId: s.userId, plan: s.plan, startDate: s.startDate, endDate: s.endDate, stripeStatus: s.stripeStatus ?? null, stripeCustomerId: s.stripeCustomerId ?? null, userName: u?.name ?? null, userEmail: u?.email ?? null };
    });
    const total = items.length;
    const offset = opts?.offset ?? 0;
    const limit = opts?.limit ?? 50;
    return { items: items.slice(offset, offset + limit), total };
  }
  const db = await getDb();
  if (!db) return { items: [], total: 0 };
  const [items, countResult] = await Promise.all([
    db.select({
      id: subscriptions.id,
      userId: subscriptions.userId,
      plan: subscriptions.plan,
      startDate: subscriptions.startDate,
      endDate: subscriptions.endDate,
      stripeStatus: subscriptions.stripeStatus,
      stripeCustomerId: subscriptions.stripeCustomerId,
      userName: users.name,
      userEmail: users.email,
    }).from(subscriptions)
      .leftJoin(users, eq(subscriptions.userId, users.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(opts?.limit ?? 50)
      .offset(opts?.offset ?? 0),
    db.select({ count: sql<number>`count(*)` }).from(subscriptions),
  ]);
  return { items, total: countResult[0]?.count ?? 0 };
}

// ─── Consumption Tax (消費税) ───

/** 簡易課税のみなし仕入率（第1種〜第6種事業） */
const SIMPLIFIED_DEEMED_RATES: Record<number, number> = {
  1: 0.90, // 卸売業
  2: 0.80, // 小売業
  3: 0.70, // 製造業等
  4: 0.60, // その他
  5: 0.50, // サービス業等
  6: 0.40, // 不動産業
};

/** 税区分から税率を取得 */
function getTaxRate(taxCategory: string): number {
  if (taxCategory === "taxable_10") return 0.10;
  if (taxCategory === "taxable_8") return 0.08;
  return 0;
}

/** 税込金額から税抜金額を計算 */
function extractTaxExclusive(amount: number, taxRate: number): number {
  if (taxRate === 0) return amount;
  return Math.floor(amount / (1 + taxRate));
}

/** 消費税レポートデータを計算 */
export async function calculateConsumptionTax(
  userId: number,
  fiscalYear: number,
  method: "standard" | "simplified",
  industryType: number = 5,
) {
  const startDate = new Date(fiscalYear, 0, 1).getTime();
  const endDate = new Date(fiscalYear, 11, 31, 23, 59, 59, 999).getTime();

  let userTxns: any[];
  if (isInMemoryMode()) {
    userTxns = inMemoryTransactions.filter(
      (t: any) => t.userId === userId && t.date >= startDate && t.date <= endDate
    );
  } else {
    const db = await getDb();
    if (!db) throw new Error("DB not available");
    userTxns = await db.select().from(transactions)
      .where(and(eq(transactions.userId, userId), gte(transactions.date, startDate), lte(transactions.date, endDate)));
  }

  // 集計
  let salesTax10 = 0, salesTax8 = 0, salesExempt = 0;
  let purchaseTax10 = 0, purchaseTax8 = 0, purchaseExempt = 0;
  let salesAmount10 = 0, salesAmount8 = 0;
  let purchaseAmount10 = 0, purchaseAmount8 = 0;

  for (const t of userTxns) {
    const amount = Number(t.amount);
    const cat = t.taxCategory || "taxable_10";
    const taxIncluded = t.taxIncluded ?? 1;
    const rate = getTaxRate(cat);

    if (t.type === "income") {
      if (cat === "taxable_10" || cat === "taxable_8") {
        const excl = taxIncluded ? extractTaxExclusive(amount, rate) : amount;
        const tax = taxIncluded ? amount - excl : Math.floor(amount * rate);
        if (cat === "taxable_10") { salesTax10 += tax; salesAmount10 += excl; }
        else { salesTax8 += tax; salesAmount8 += excl; }
      } else {
        salesExempt += amount;
      }
    } else {
      if (cat === "taxable_10" || cat === "taxable_8") {
        const excl = taxIncluded ? extractTaxExclusive(amount, rate) : amount;
        const tax = taxIncluded ? amount - excl : Math.floor(amount * rate);
        if (cat === "taxable_10") { purchaseTax10 += tax; purchaseAmount10 += excl; }
        else { purchaseTax8 += tax; purchaseAmount8 += excl; }
      } else {
        purchaseExempt += amount;
      }
    }
  }

  const totalSalesTax = salesTax10 + salesTax8;
  const totalPurchaseTax = purchaseTax10 + purchaseTax8;
  const totalSalesAmount = salesAmount10 + salesAmount8 + salesExempt;
  const totalPurchaseAmount = purchaseAmount10 + purchaseAmount8 + purchaseExempt;

  let taxPayable: number;
  let deemedPurchaseTax = 0;

  if (method === "simplified") {
    const deemedRate = SIMPLIFIED_DEEMED_RATES[industryType] ?? 0.50;
    deemedPurchaseTax = Math.floor(totalSalesTax * deemedRate);
    taxPayable = totalSalesTax - deemedPurchaseTax;
  } else {
    taxPayable = totalSalesTax - totalPurchaseTax;
  }

  const isRefund = taxPayable < 0;

  return {
    method, industryType, fiscalYear,
    salesAmount10, salesTax10, salesAmount8, salesTax8, salesExempt,
    totalSalesAmount, totalSalesTax,
    purchaseAmount10, purchaseTax10, purchaseAmount8, purchaseTax8, purchaseExempt,
    totalPurchaseAmount, totalPurchaseTax,
    deemedPurchaseTax,
    taxPayable: Math.abs(taxPayable),
    isRefund,
    transactionCount: userTxns.length,
  };
}

// ─── Receipts (レシート・領収書) ───
export type Receipt = {
  id: number;
  userId: number;
  fileName: string;
  fileType: string; // "image/jpeg", "image/png", "application/pdf"
  fileData: string; // base64
  status: "pending" | "processed" | "error";
  extractedData: {
    vendor?: string;
    amount?: number;
    date?: string;
    items?: string[];
    rawText?: string;
  } | null;
  suggestedAccountId: number | null;
  suggestedAccountName: string | null;
  suggestedType: "income" | "expense" | null;
  transactionId: number | null; // linked transaction after approval
  createdAt: Date;
};

export async function getReceiptsByUser(userId: number): Promise<Receipt[]> {
  if (isInMemoryMode()) {
    return inMemoryReceipts
      .filter((r: any) => r.userId === userId)
      .sort((a: any, b: any) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(receipts).where(eq(receipts.userId, userId)).orderBy(desc(receipts.createdAt));
  return rows.map(r => ({
    id: r.id,
    userId: r.userId,
    fileName: r.fileName,
    fileType: r.fileType,
    fileData: r.fileData,
    status: r.status as "pending" | "processed" | "error",
    extractedData: r.extractedData as Receipt["extractedData"],
    suggestedAccountId: r.suggestedAccountId,
    suggestedAccountName: r.suggestedAccountName,
    suggestedType: r.suggestedType as "income" | "expense" | null,
    transactionId: r.transactionId,
    createdAt: r.createdAt,
  }));
}

export async function createReceipt(data: Omit<Receipt, "id" | "createdAt">): Promise<Receipt> {
  if (isInMemoryMode()) {
    const receipt: Receipt = { ...data, id: inMemoryGeneralIdCounter++, createdAt: new Date() };
    inMemoryReceipts.push(receipt);
    return receipt;
  }
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(receipts).values({
    userId: data.userId,
    fileName: data.fileName,
    fileType: data.fileType,
    fileData: data.fileData,
    status: data.status,
    extractedData: data.extractedData,
    suggestedAccountId: data.suggestedAccountId,
    suggestedAccountName: data.suggestedAccountName,
    suggestedType: data.suggestedType,
    transactionId: data.transactionId,
  });
  const id = result[0].insertId;
  return { ...data, id, createdAt: new Date() };
}

export async function updateReceipt(id: number, userId: number, data: Partial<Receipt>): Promise<void> {
  if (isInMemoryMode()) {
    const receipt = inMemoryReceipts.find((r: any) => r.id === id && r.userId === userId);
    if (receipt) Object.assign(receipt, data);
    return;
  }
  const db = await getDb();
  if (!db) return;
  const updateData: any = {};
  if (data.status !== undefined) updateData.status = data.status;
  if (data.extractedData !== undefined) updateData.extractedData = data.extractedData;
  if (data.suggestedAccountId !== undefined) updateData.suggestedAccountId = data.suggestedAccountId;
  if (data.suggestedAccountName !== undefined) updateData.suggestedAccountName = data.suggestedAccountName;
  if (data.suggestedType !== undefined) updateData.suggestedType = data.suggestedType;
  if (data.transactionId !== undefined) updateData.transactionId = data.transactionId;
  await db.update(receipts).set(updateData).where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
}

export async function deleteReceipt(id: number, userId: number): Promise<void> {
  if (isInMemoryMode()) {
    const idx = inMemoryReceipts.findIndex((r: any) => r.id === id && r.userId === userId);
    if (idx >= 0) inMemoryReceipts.splice(idx, 1);
    return;
  }
  const db = await getDb();
  if (!db) return;
  await db.delete(receipts).where(and(eq(receipts.id, id), eq(receipts.userId, userId)));
}

// ─── Receipt Auto-Categorization ───
const VENDOR_CATEGORY_MAP: Record<string, { accountName: string; type: "expense" | "income" }> = {
  // 交通費
  "jr": { accountName: "旅費交通費", type: "expense" },
  "suica": { accountName: "旅費交通費", type: "expense" },
  "pasmo": { accountName: "旅費交通費", type: "expense" },
  "タクシー": { accountName: "旅費交通費", type: "expense" },
  "駐車場": { accountName: "車両費", type: "expense" },
  "ガソリン": { accountName: "車両費", type: "expense" },
  "eneos": { accountName: "車両費", type: "expense" },
  // 通信費
  "ntt": { accountName: "通信費", type: "expense" },
  "docomo": { accountName: "通信費", type: "expense" },
  "au": { accountName: "通信費", type: "expense" },
  "softbank": { accountName: "通信費", type: "expense" },
  "楽天モバイル": { accountName: "通信費", type: "expense" },
  // 消耗品費
  "amazon": { accountName: "消耗品費", type: "expense" },
  "ヨドバシ": { accountName: "消耗品費", type: "expense" },
  "ビックカメラ": { accountName: "消耗品費", type: "expense" },
  "ダイソー": { accountName: "消耗品費", type: "expense" },
  "100均": { accountName: "消耗品費", type: "expense" },
  // 事務用品費
  "コクヨ": { accountName: "事務用品費", type: "expense" },
  "アスクル": { accountName: "事務用品費", type: "expense" },
  "文具": { accountName: "事務用品費", type: "expense" },
  // 接待交際費
  "居酒屋": { accountName: "接待交際費", type: "expense" },
  "レストラン": { accountName: "接待交際費", type: "expense" },
  "飲食": { accountName: "接待交際費", type: "expense" },
  // 会議費
  "スターバックス": { accountName: "会議費", type: "expense" },
  "starbucks": { accountName: "会議費", type: "expense" },
  "タリーズ": { accountName: "会議費", type: "expense" },
  "ドトール": { accountName: "会議費", type: "expense" },
  "カフェ": { accountName: "会議費", type: "expense" },
  // 新聞図書費
  "書店": { accountName: "新聞図書費", type: "expense" },
  "本屋": { accountName: "新聞図書費", type: "expense" },
  "紀伊國屋": { accountName: "新聞図書費", type: "expense" },
  "丸善": { accountName: "新聞図書費", type: "expense" },
  "kindle": { accountName: "新聞図書費", type: "expense" },
  // 水道光熱費
  "電力": { accountName: "水道光熱費", type: "expense" },
  "ガス": { accountName: "水道光熱費", type: "expense" },
  "水道": { accountName: "水道光熱費", type: "expense" },
  "東京電力": { accountName: "水道光熱費", type: "expense" },
  "関西電力": { accountName: "水道光熱費", type: "expense" },
  // ソフトウェア
  "aws": { accountName: "クラウドサービス利用料", type: "expense" },
  "google cloud": { accountName: "クラウドサービス利用料", type: "expense" },
  "azure": { accountName: "クラウドサービス利用料", type: "expense" },
  "adobe": { accountName: "ソフトウェア利用料", type: "expense" },
  "microsoft": { accountName: "ソフトウェア利用料", type: "expense" },
  "slack": { accountName: "ソフトウェア利用料", type: "expense" },
  "zoom": { accountName: "ソフトウェア利用料", type: "expense" },
  // 荷造運賃
  "ヤマト": { accountName: "荷造運賃", type: "expense" },
  "佐川": { accountName: "荷造運賃", type: "expense" },
  "日本郵便": { accountName: "荷造運賃", type: "expense" },
  "郵便局": { accountName: "荷造運賃", type: "expense" },
  // 地代家賃
  "家賃": { accountName: "地代家賃", type: "expense" },
  "賃料": { accountName: "地代家賃", type: "expense" },
  // 保険料
  "保険": { accountName: "保険料", type: "expense" },
  "損保": { accountName: "保険料", type: "expense" },
  "生命保険": { accountName: "保険料", type: "expense" },
  // コンビニ（消耗品として初期分類）
  "セブンイレブン": { accountName: "消耗品費", type: "expense" },
  "ローソン": { accountName: "消耗品費", type: "expense" },
  "ファミリーマート": { accountName: "消耗品費", type: "expense" },
};

export function autoCategorizeReceipt(
  rawText: string,
  userAccounts: { id: number; name: string; type: string }[]
): { accountId: number | null; accountName: string | null; type: "income" | "expense" | null } {
  const lowerText = rawText.toLowerCase();

  for (const [keyword, mapping] of Object.entries(VENDOR_CATEGORY_MAP)) {
    if (lowerText.includes(keyword.toLowerCase())) {
      const account = userAccounts.find(a => a.name === mapping.accountName);
      return {
        accountId: account?.id ?? null,
        accountName: mapping.accountName,
        type: mapping.type,
      };
    }
  }

  return { accountId: null, accountName: null, type: "expense" };
}

// Extract amount from receipt text using common Japanese receipt patterns
export function extractAmountFromText(text: string): number | null {
  // Common patterns: ¥1,234  合計 1,234円  税込 1,234  お支払い ¥1,234
  const patterns = [
    /(?:合計|税込|お支払い?|お会計|請求|総額|支払金額|ご利用金額)\s*[¥￥]?\s*([\d,]+)/,
    /[¥￥]\s*([\d,]+)/,
    /([\d,]+)\s*円/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const amount = parseInt(match[1].replace(/,/g, ""), 10);
      if (amount > 0 && amount < 100_000_000) return amount;
    }
  }
  return null;
}

// Extract date from receipt text
export function extractDateFromText(text: string): string | null {
  // Patterns: 2024年3月15日, 2024/03/15, 2024-03-15, R6.3.15
  const patterns = [
    /(\d{4})[年/\-.](\d{1,2})[月/\-.](\d{1,2})/,
    /(?:令和|R)\s*(\d{1,2})[年/\-.](\d{1,2})[月/\-.](\d{1,2})/,
  ];
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      if (match[0].includes("令和") || match[0].includes("R")) {
        const year = 2018 + parseInt(match[1]);
        return `${year}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
      }
      return `${match[1]}-${match[2].padStart(2, "0")}-${match[3].padStart(2, "0")}`;
    }
  }
  return null;
}

// Extract vendor name from receipt text
export function extractVendorFromText(text: string): string | null {
  const lines = text.split("\n").map(l => l.trim()).filter(Boolean);
  // First non-empty line is usually the store name
  if (lines.length > 0 && lines[0].length > 0 && lines[0].length < 50) {
    return lines[0];
  }
  return null;
}
