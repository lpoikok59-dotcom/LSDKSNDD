import { eq, like, or, desc } from "drizzle-orm";
import { drizzle as drizzleMysql } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import { users, submissions, pageContent, pageImages, adminAuth } from "../drizzle/schema";
import { scryptSync, randomBytes } from "crypto";

let _db: any = null;

// 硬编码 Railway MySQL 连接信息，确保万无一失
const dbConfig = {
  host: 'roundhouse.proxy.rlwy.net',
  port: 10453,
  user: 'root',
  password: 'ckNQrGKQJkSTCMpEHDFBwVwnopptSWfq',
  database: 'railway',
};

const connectionString = `mysql://${dbConfig.user}:${dbConfig.password}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}`;

export async function getDb() {
  if (!_db) {
    console.log("[Database] Connecting to MySQL with hardcoded config...");
    try {
      const connection = await mysql.createPool({
        uri: connectionString,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
      });
      _db = drizzleMysql(connection);
      console.log("[Database] Connected to MySQL successfully");
    } catch (error) {
      console.error("[Database] MySQL connection failed:", error);
      throw error;
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
  
  // 使用 MySQL 的 INSERT ... ON DUPLICATE KEY UPDATE 语法
  // 由于没有唯一键冲突，我们先查一下
  const existing = await db.select().from(adminAuth).limit(1);
  if (existing.length > 0) {
    await db.update(adminAuth).set({ password: combined }).where(eq(adminAuth.id, existing[0].id));
  } else {
    await db.insert(adminAuth).values({ password: combined });
  }
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const db = await getDb();
  let result;
  try {
    result = await db.select().from(adminAuth).limit(1);
  } catch (e) {
    console.log("[Database] Table admin_auth might not exist, initializing...");
    return password === "123456";
  }

  if (result.length === 0) {
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
  const existing = await db.select().from(pageContent).where(eq(pageContent.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(pageContent).set({ value, label }).where(eq(pageContent.key, key));
  } else {
    await db.insert(pageContent).values({ key, label, value });
  }
}

export async function seedPageContent(items: { key: string; label: string; value: string }[]) {
  const db = await getDb();
  for (const item of items) {
    try {
      const existing = await db.select().from(pageContent).where(eq(pageContent.key, item.key)).limit(1);
      if (existing.length === 0) {
        await db.insert(pageContent).values(item);
      }
    } catch (e) {
      console.warn(`[Database] Failed to seed content for ${item.key}:`, e);
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
  const existing = await db.select().from(pageImages).where(eq(pageImages.key, key)).limit(1);
  if (existing.length > 0) {
    await db.update(pageImages).set({ url, label }).where(eq(pageImages.key, key));
  } else {
    await db.insert(pageImages).values({ key, label, url });
  }
}

export async function seedPageImages(items: { key: string; label: string; url: string }[]) {
  const db = await getDb();
  for (const item of items) {
    try {
      const existing = await db.select().from(pageImages).where(eq(pageImages.key, item.key)).limit(1);
      if (existing.length === 0) {
        await db.insert(pageImages).values(item);
      }
    } catch (e) {
      console.warn(`[Database] Failed to seed image for ${item.key}:`, e);
    }
  }
}
