import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

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

// Admin password authentication (for standalone deployment)
export const adminAuth = mysqlTable("admin_auth", {
  id: int("id").autoincrement().primaryKey(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type AdminAuth = typeof adminAuth.$inferSelect;
export type InsertAdminAuth = typeof adminAuth.$inferInsert;

// Form submissions table - phone is unique for deduplication
export const submissions = mysqlTable("submissions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  ip: varchar("ip", { length: 64 }).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Submission = typeof submissions.$inferSelect;
export type InsertSubmission = typeof submissions.$inferInsert;

// Landing page editable text content
export const pageContent = mysqlTable("page_content", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  value: text("value").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PageContent = typeof pageContent.$inferSelect;
export type InsertPageContent = typeof pageContent.$inferInsert;

// Landing page editable images
export const pageImages = mysqlTable("page_images", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  label: varchar("label", { length: 200 }).notNull(),
  url: text("url").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PageImage = typeof pageImages.$inferSelect;
export type InsertPageImage = typeof pageImages.$inferInsert;
