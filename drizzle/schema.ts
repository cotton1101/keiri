import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, bigint, json } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Business profile - 事業者情報
 */
export const businessProfiles = mysqlTable("business_profiles", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  businessName: varchar("businessName", { length: 255 }).notNull().default(""),
  representativeName: varchar("representativeName", { length: 255 }).notNull().default(""),
  postalCode: varchar("postalCode", { length: 10 }).notNull().default(""),
  address: text("address"),
  phone: varchar("phone", { length: 20 }).notNull().default(""),
  email: varchar("email", { length: 320 }).notNull().default(""),
  taxId: varchar("taxId", { length: 50 }).notNull().default(""),
  bankName: varchar("bankName", { length: 100 }).notNull().default(""),
  bankBranch: varchar("bankBranch", { length: 100 }).notNull().default(""),
  bankAccountType: varchar("bankAccountType", { length: 20 }).notNull().default(""),
  bankAccountNumber: varchar("bankAccountNumber", { length: 20 }).notNull().default(""),
  bankAccountName: varchar("bankAccountName", { length: 100 }).notNull().default(""),
  fiscalYearStart: int("fiscalYearStart").notNull().default(1),
  filingType: mysqlEnum("filingType", ["blue", "white"]).notNull().default("white"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type BusinessProfile = typeof businessProfiles.$inferSelect;
export type InsertBusinessProfile = typeof businessProfiles.$inferInsert;

/**
 * Account categories - 勘定科目カテゴリ
 */
export const accountCategories = mysqlTable("account_categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["income", "expense", "asset", "liability"]).notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AccountCategory = typeof accountCategories.$inferSelect;
export type InsertAccountCategory = typeof accountCategories.$inferInsert;

/**
 * Accounts - 勘定科目
 */
export const accounts = mysqlTable("accounts", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  categoryId: int("categoryId"),
  name: varchar("name", { length: 100 }).notNull(),
  type: mysqlEnum("type", ["income", "expense", "asset", "liability"]).notNull(),
  code: varchar("code", { length: 10 }).notNull().default(""),
  description: text("description"),
  isDefault: int("isDefault").notNull().default(0),
  isActive: int("isActive").notNull().default(1),
  sortOrder: int("sortOrder").notNull().default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Account = typeof accounts.$inferSelect;
export type InsertAccount = typeof accounts.$inferInsert;

/**
 * Transactions - 取引
 */
export const transactions = mysqlTable("transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["income", "expense"]).notNull(),
  accountId: int("accountId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 0 }).notNull(),
  date: bigint("date", { mode: "number" }).notNull(),
  description: varchar("description", { length: 500 }).notNull().default(""),
  memo: text("memo"),
  receiptUrl: text("receiptUrl"),
  importSource: varchar("importSource", { length: 50 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = typeof transactions.$inferInsert;

/**
 * Recurring transactions - 固定費・定期取引
 */
export const recurringTransactions = mysqlTable("recurring_transactions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["income", "expense"]).notNull(),
  accountId: int("accountId").notNull(),
  amount: decimal("amount", { precision: 12, scale: 0 }).notNull(),
  description: varchar("description", { length: 500 }).notNull().default(""),
  frequency: mysqlEnum("frequency", ["monthly", "yearly"]).notNull().default("monthly"),
  dayOfMonth: int("dayOfMonth").notNull().default(1),
  isActive: int("isActive").notNull().default(1),
  lastGeneratedDate: bigint("lastGeneratedDate", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RecurringTransaction = typeof recurringTransactions.$inferSelect;
export type InsertRecurringTransaction = typeof recurringTransactions.$inferInsert;

/**
 * Tax filings - 確定申告データ
 */
export const taxFilings = mysqlTable("tax_filings", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  fiscalYear: int("fiscalYear").notNull(),
  filingType: mysqlEnum("filingType", ["blue", "white"]).notNull(),
  status: mysqlEnum("status", ["draft", "completed"]).notNull().default("draft"),
  totalIncome: decimal("totalIncome", { precision: 12, scale: 0 }).notNull().default("0"),
  totalExpense: decimal("totalExpense", { precision: 12, scale: 0 }).notNull().default("0"),
  netIncome: decimal("netIncome", { precision: 12, scale: 0 }).notNull().default("0"),
  specialDeduction: decimal("specialDeduction", { precision: 12, scale: 0 }).notNull().default("0"),
  taxableIncome: decimal("taxableIncome", { precision: 12, scale: 0 }).notNull().default("0"),
  incomeTax: decimal("incomeTax", { precision: 12, scale: 0 }).notNull().default("0"),
  breakdownData: json("breakdownData"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TaxFiling = typeof taxFilings.$inferSelect;
export type InsertTaxFiling = typeof taxFilings.$inferInsert;

/**
 * Clients - 取引先
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  contactPerson: varchar("contactPerson", { length: 255 }).notNull().default(""),
  email: varchar("email", { length: 320 }).notNull().default(""),
  phone: varchar("phone", { length: 20 }).notNull().default(""),
  postalCode: varchar("postalCode", { length: 10 }).notNull().default(""),
  address: text("address"),
  memo: text("memo"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Invoices - 請求書
 */
export const invoices = mysqlTable("invoices", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  clientId: int("clientId"),
  invoiceNumber: varchar("invoiceNumber", { length: 50 }).notNull(),
  status: mysqlEnum("status", ["draft", "sent", "paid", "overdue", "cancelled"]).notNull().default("draft"),
  issueDate: bigint("issueDate", { mode: "number" }).notNull(),
  dueDate: bigint("dueDate", { mode: "number" }).notNull(),
  subtotal: decimal("subtotal", { precision: 12, scale: 0 }).notNull().default("0"),
  taxRate: decimal("taxRate", { precision: 5, scale: 2 }).notNull().default("10.00"),
  taxAmount: decimal("taxAmount", { precision: 12, scale: 0 }).notNull().default("0"),
  totalAmount: decimal("totalAmount", { precision: 12, scale: 0 }).notNull().default("0"),
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Invoice = typeof invoices.$inferSelect;
export type InsertInvoice = typeof invoices.$inferInsert;

/**
 * Invoice items - 請求書明細
 */
export const invoiceItems = mysqlTable("invoice_items", {
  id: int("id").autoincrement().primaryKey(),
  invoiceId: int("invoiceId").notNull(),
  description: varchar("description", { length: 500 }).notNull(),
  quantity: decimal("quantity", { precision: 10, scale: 2 }).notNull().default("1.00"),
  unitPrice: decimal("unitPrice", { precision: 12, scale: 0 }).notNull(),
  amount: decimal("amount", { precision: 12, scale: 0 }).notNull(),
  sortOrder: int("sortOrder").notNull().default(0),
});

export type InvoiceItem = typeof invoiceItems.$inferSelect;
export type InsertInvoiceItem = typeof invoiceItems.$inferInsert;

/**
 * Subscription plans - サブスクリプション
 */
export const subscriptions = mysqlTable("subscriptions", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  plan: mysqlEnum("plan", ["free", "premium"]).notNull().default("free"),
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  stripeSubscriptionId: varchar("stripeSubscriptionId", { length: 255 }),
  stripeStatus: varchar("stripeStatus", { length: 50 }),
  startDate: bigint("startDate", { mode: "number" }),
  endDate: bigint("endDate", { mode: "number" }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = typeof subscriptions.$inferInsert;

/**
 * Email logs - メール送信履歴
 */
export const emailLogs = mysqlTable("email_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  invoiceId: int("invoiceId"),
  toEmail: varchar("toEmail", { length: 320 }).notNull(),
  toName: varchar("toName", { length: 255 }).notNull().default(""),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body"),
  documentType: mysqlEnum("documentType", ["invoice", "quote", "order"]).notNull().default("invoice"),
  status: mysqlEnum("emailStatus", ["sent", "failed", "pending"]).notNull().default("pending"),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailLog = typeof emailLogs.$inferSelect;
export type InsertEmailLog = typeof emailLogs.$inferInsert;
