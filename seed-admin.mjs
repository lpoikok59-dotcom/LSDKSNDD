import mysql from "mysql2/promise";

const password = "123456";
const { scryptSync, randomBytes } = await import("crypto");

function hashPassword(password, salt) {
  const s = salt || randomBytes(16);
  const hash = scryptSync(password, s, 64).toString("hex");
  return { hash, salt: s.toString("hex") };
}

const { hash, salt } = hashPassword(password);
const combined = `${salt}:${hash}`;

const connection = await mysql.createConnection(process.env.DATABASE_URL);
try {
  await connection.execute("INSERT INTO admin_auth (password) VALUES (?) ON DUPLICATE KEY UPDATE password = ?", [combined, combined]);
  console.log("✅ Admin password set to: 123456");
} catch (e) {
  console.error("❌ Error:", e.message);
} finally {
  await connection.end();
}
