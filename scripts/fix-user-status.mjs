import fs from "node:fs";
import { MongoClient } from "mongodb";

const envLocal = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const uriMatch = envLocal.match(/MONGODB_URI=(.*)/) || [];
const MONGODB_URI = uriMatch[1]?.trim() || "mongodb+srv://kicktotech_db_user:7nn6qrU3If7iRvDa@cluster0.8chko6a.mongodb.net/kicktotech?retryWrites=true&w=majority";

async function fixDb(db, dbName) {
  console.log(`\n--- Fixing users in database "${dbName}" ---`);
  
  // 1. Set status to "active" for all documents where status is missing, null, or not "disabled"
  const resStatus = await db.collection("users").updateMany(
    { status: { $ne: "disabled" } },
    { $set: { status: "active" } }
  );
  console.log(`  Updated status to "active": ${resStatus.modifiedCount} documents (matched: ${resStatus.matchedCount})`);

  // 2. Set type to "admin" for admin/SUPER_ADMIN roles
  const resAdminType = await db.collection("users").updateMany(
    { role: { $in: ["admin", "SUPER_ADMIN", "ADMIN", "MANAGER"] }, type: { $ne: "admin" } },
    { $set: { type: "admin" } }
  );
  console.log(`  Updated type to "admin": ${resAdminType.modifiedCount} documents`);

  // 3. Set type to "student" for other accounts
  const resStudentType = await db.collection("users").updateMany(
    { role: { $nin: ["admin", "SUPER_ADMIN", "ADMIN", "MANAGER"] }, type: { $ne: "student" } },
    { $set: { type: "student" } }
  );
  console.log(`  Updated type to "student": ${resStudentType.modifiedCount} documents`);

  // Verify
  const sample = await db.collection("users").findOne({ email: "omkarpawar5859@gmail.com" });
  console.log(`  Sample user (omkarpawar5859@gmail.com): status = ${sample?.status}, type = ${sample?.type}, role = ${sample?.role}`);
}

async function main() {
  const client = new MongoClient(MONGODB_URI);
  await client.connect();

  await fixDb(client.db("kicktotech"), "kicktotech");
  await fixDb(client.db("kicktotech_db_user"), "kicktotech_db_user");

  await client.close();
  console.log("\n✨ Database user status migration complete!");
}

main().catch(console.error);
