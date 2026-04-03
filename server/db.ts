import { eq, like, or, desc } from "drizzle-orm";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import { drizzle as drizzleSqlite } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import { users, submissions, pageContent, pageImages, adminAuth } from "../drizzle/schema";
import { scryptSync, randomBytes } from "crypto";
import path from "path";
import fs from "fs";

let _db: any = null;
let isSqlite = false;

export async function getDb() {
  if (!_db) {
    if (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith("mysql")) {
      try {
        _db = drizzleMysql(process.env.DATABASE_URL);
        isSqlite = false;
        console.log("[Database] Connected to MySQL");
      } catch (error) {
        console.warn("[Database] MySQL connection failed, falling back to SQLite:", error);
      }
    }
    
    if (!_db) {
      const dbPath = path.resolve(process.cwd(), "sqlite.db");
      const sqlite = new Database(dbPath);
      _db = drizzleSqlite(sqlite);
      isSqlite = true;
      console.log(`[Database] Using SQLite at ${dbPath}`);
      
      // Auto-create tables for SQLite if they don't exist
      sqlite.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          openId TEXT NOT NULL UNIQUE,
          name TEXT,
          email TEXT,
          loginMethod TEXT,
          role TEXT NOT NULL DEFAULT 'user',
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          lastSignedIn DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS admin_auth (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          password TEXT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS submissions (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          phone TEXT NOT NULL UNIQUE,
          ip TEXT NOT NULL,
          createdAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS page_content (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          \`key\` TEXT NOT NULL UNIQUE,
          label TEXT NOT NULL,
          value TEXT NOT NULL,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
        CREATE TABLE IF NOT EXISTS page_images (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          \`key\` TEXT NOT NULL UNIQUE,
          label TEXT NOT NULL,
          url TEXT NOT NULL,
          updatedAt DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
        );
      `);
    }
  }
  return _db;
}

// ---- Admin Password Auth ----

function hashPassword(password: string, salt?: Buffer): { hash: string; salt: string } {
  const s = salt || randomBytes(16);
  const hash = scryptSync(password, s, 64).toString("hex");
  return { hash, salt: s.toString("hex") };
}

function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(":");
  if (parts.length !== 2) return false;
  const salt = Buffer.from(parts[0], "hex");
  const { hash } = hashPassword(password, salt);
  return hash === parts[1];
}

export async function setAdminPassword(password: string) {
  const db = await getDb();
  const { hash, salt } = hashPassword(password);
  const combined = `${salt}:${hash}`;
  const existing = await db.select().from(adminAuth).limit(1);
  if (existing.length > 0) {
    if (isSqlite) {
      await db.update(adminAuth).set({ password: combined }).where(eq(adminAuth.id, existing[0].id));
    } else {
      await db.insert(adminAuth).values({ password: combined }).onDuplicateKeyUpdate({ set: { password: combined } });
    }
  } else {
    await db.insert(adminAuth).values({ password: combined });
  }
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const db = await getDb();
  const result = await db.select().from(adminAuth).limit(1);
  if (result.length === 0) {
    // Auto-seed default password if none exists
    await setAdminPassword("123456");
    return password === "123456";
  }
  return verifyPassword(password, result[0].password);
}

// ---- Submissions ----

export async function createSubmission(data: any) {
  const db = await getDb();
  const existing = await db.select().from(submissions).where(eq(submissions.phone, data.phone)).limit(1);
  if (existing.length > 0) {
    return { duplicate: true, submission: existing[0] };
  }
  await db.insert(submissions).values(data);
  const inserted = await db.select().from(submissions).where(eq(submissions.phone, data.phone)).limit(1);
  return { duplicate: false, submission: inserted[0] };
}

export async function listSubmissions(search?: string) {
  const db = await getDb();
  if (search && search.trim()) {
    const q = `%${search.trim()}%`;
    return db.select().from(submissions)
      .where(or(like(submissions.name, q), like(submissions.phone, q), like(submissions.ip, q)))
      .orderBy(desc(submissions.createdAt));
  }
  return db.select().from(submissions).orderBy(desc(submissions.createdAt));
}

export async function deleteSubmission(id: number) {
  const db = await getDb();
  await db.delete(submissions).where(eq(submissions.id, id));
}

// ---- Page Content ----

export async function getAllPageContent() {
  const db = await getDb();
  return db.select().from(pageContent).orderBy(pageContent.key);
}

export async function upsertPageContent(key: string, label: string, value: string) {
  const db = await getDb();
  if (isSqlite) {
    const existing = await db.select().from(pageContent).where(eq(pageContent.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(pageContent).set({ value, label }).where(eq(pageContent.key, key));
    } else {
      await db.insert(pageContent).values({ key, label, value });
    }
  } else {
    await db.insert(pageContent).values({ key, label, value }).onDuplicateKeyUpdate({ set: { value, label } });
  }
}

export async function seedPageContent(items: { key: string; label: string; value: string }[]) {
  const db = await getDb();
  for (const item of items) {
    const existing = await db.select().from(pageContent).where(eq(pageContent.key, item.key)).limit(1);
    if (existing.length === 0) {
      await db.insert(pageContent).values(item);
    }
  }
}

// ---- Page Images ----

export async function getAllPageImages() {
  const db = await getDb();
  return db.select().from(pageImages).orderBy(pageImages.key);
}

export async function upsertPageImage(key: string, label: string, url: string) {
  const db = await getDb();
  if (isSqlite) {
    const existing = await db.select().from(pageImages).where(eq(pageImages.key, key)).limit(1);
    if (existing.length > 0) {
      await db.update(pageImages).set({ url, label }).where(eq(pageImages.key, key));
    } else {
      await db.insert(pageImages).values({ key, label, url });
    }
  } else {
    await db.insert(pageImages).values({ key, label, url }).onDuplicateKeyUpdate({ set: { url, label } });
  }
}

export async function seedPageImages(items: { key: string; label: string; url: string }[]) {
  const db = await getDb();
  for (const item of items) {
    const existing = await db.select().from(pageImages).where(eq(pageImages.key, item.key)).limit(1);
    if (existing.length === 0) {
      await db.insert(pageImages).values(item);
    }
  }
}
