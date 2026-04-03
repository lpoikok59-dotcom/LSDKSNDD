import { eq, like, or, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { InsertUser, users, submissions, pageContent, pageImages, InsertSubmission, adminAuth } from "../drizzle/schema";
import { ENV } from './_core/env';
import { scryptSync, randomBytes } from "crypto";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) { console.warn("[Database] Cannot upsert user: database not available"); return; }

  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
    if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
    else if (user.openId === ENV.ownerOpenId) { values.role = 'admin'; updateSet.role = 'admin'; }
    if (!values.lastSignedIn) values.lastSignedIn = new Date();
    if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
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
  if (!db) throw new Error("Database not available");
  const { hash, salt } = hashPassword(password);
  const combined = `${salt}:${hash}`;
  const existing = await db.select().from(adminAuth).limit(1);
  if (existing.length > 0) {
    await db.insert(adminAuth).values({ password: combined }).onDuplicateKeyUpdate({ set: { password: combined } });
  } else {
    await db.insert(adminAuth).values({ password: combined });
  }
}

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.select().from(adminAuth).limit(1);
  if (result.length === 0) return false;
  return verifyPassword(password, result[0].password);
}

// ---- Submissions ----

export async function createSubmission(data: InsertSubmission) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
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
  if (!db) throw new Error("Database not available");
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
  if (!db) throw new Error("Database not available");
  await db.delete(submissions).where(eq(submissions.id, id));
}

// ---- Page Content ----

export async function getAllPageContent() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(pageContent).orderBy(pageContent.key);
}

export async function upsertPageContent(key: string, label: string, value: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(pageContent).values({ key, label, value })
    .onDuplicateKeyUpdate({ set: { value, label } });
}

export async function seedPageContent(items: { key: string; label: string; value: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const item of items) {
    await db.insert(pageContent).values(item).onDuplicateKeyUpdate({ set: { label: item.label } });
  }
}

// ---- Page Images ----

export async function getAllPageImages() {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.select().from(pageImages).orderBy(pageImages.key);
}

export async function upsertPageImage(key: string, label: string, url: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.insert(pageImages).values({ key, label, url })
    .onDuplicateKeyUpdate({ set: { url, label } });
}

export async function seedPageImages(items: { key: string; label: string; url: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const item of items) {
    await db.insert(pageImages).values(item).onDuplicateKeyUpdate({ set: { label: item.label } });
  }
}
