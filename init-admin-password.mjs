import { setAdminPassword } from "./server/db.ts";

const password = process.argv[2] || "123456";

(async () => {
  try {
    console.log(`Setting admin password to: ${password}`);
    await setAdminPassword(password);
    console.log("✅ Admin password set successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to set admin password:", error);
    process.exit(1);
  }
})();
