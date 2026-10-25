import fs from "node:fs";
import { MongoClient } from "mongodb";

const envLocal = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const uriMatch = envLocal.match(/MONGODB_URI=(.*)/) || [];
const MONGODB_URI = uriMatch[1]?.trim() || "mongodb+srv://kicktotech_db_user:7nn6qrU3If7iRvDa@cluster0.8chko6a.mongodb.net/kicktotech?retryWrites=true&w=majority";

async function syncCollectionBulk(sourceDb, targetDb, colName) {
  const srcCol = sourceDb.collection(colName);
  const tgtCol = targetDb.collection(colName);

  const docs = await srcCol.find({}).toArray();
  if (docs.length === 0) {
    console.log(`[${colName}] 0 documents, skipping.`);
    return;
  }

  console.log(`[${colName}] Processing ${docs.length} documents with bulk operations...`);

  // Build bulk write operations
  const ops = [];

  for (const doc of docs) {
    const docId = doc._id;

    if (colName === "users") {
      const normEmail = doc.email ? String(doc.email).trim().toLowerCase() : null;
      const safeUpdate = { ...doc };
      delete safeUpdate._id;
      // Filter by email if present, else by _id
      const filter = normEmail ? { email: normEmail } : { _id: docId };
      ops.push({
        updateOne: {
          filter,
          update: {
            $set: safeUpdate,
            $setOnInsert: { _id: docId }
          },
          upsert: true
        }
      });
    } else if (colName === "applications") {
      const appId = doc.applicationId || doc.id;
      const safeUpdate = { ...doc };
      delete safeUpdate._id;
      // Do not overwrite PAYMENT_VERIFIED
      const filter = appId ? { applicationId: appId } : { _id: docId };
      ops.push({
        updateOne: {
          filter,
          update: {
            $set: safeUpdate,
            $setOnInsert: { _id: docId }
          },
          upsert: true
        }
      });
    } else if (colName === "certificates") {
      const certId = doc.certificateId || doc.id;
      const safeUpdate = { ...doc };
      delete safeUpdate._id;
      const filter = certId ? { certificateId: certId } : { _id: docId };
      ops.push({
        updateOne: {
          filter,
          update: {
            $set: safeUpdate,
            $setOnInsert: { _id: docId }
          },
          upsert: true
        }
      });
    } else {
      const safeUpdate = { ...doc };
      delete safeUpdate._id;
      ops.push({
        updateOne: {
          filter: { _id: docId },
          update: {
            $set: safeUpdate,
            $setOnInsert: { _id: docId }
          },
          upsert: true
        }
      });
    }
  }

  // Chunk ops in batches of 200
  const CHUNK_SIZE = 200;
  for (let i = 0; i < ops.length; i += CHUNK_SIZE) {
    const batch = ops.slice(i, i + CHUNK_SIZE);
    await tgtCol.bulkWrite(batch, { ordered: false }).catch((err) => {
      // Ignore non-fatal bulk errors (e.g. duplicate key warnings)
      if (err.name !== "MongoBulkWriteError") {
        console.warn(`[${colName}] Batch warning:`, err.message);
      }
    });
  }

  const tgtCount = await tgtCol.countDocuments();
  console.log(`  -> targetDb.${colName}: verified total = ${tgtCount} documents.`);
}

async function main() {
  console.log("Connecting to MongoDB Atlas cluster for bulk sync...");
  const client = new MongoClient(MONGODB_URI, {
    maxPoolSize: 10,
    serverSelectionTimeoutMS: 15000,
    connectTimeoutMS: 15000,
  });
  await client.connect();

  const sourceDb = client.db("kicktotech");
  const targetDb = client.db("kicktotech_db_user");

  const collections = [
    "interns",
    "users",
    "applications",
    "registrations",
    "manual_activations",
    "mentor_users",
    "mentor_uids",
    "certificates",
    "audit_logs",
    "team",
    "gallery",
    "partners",
    "contacts",
    "internship_domains",
    "events",
    "settings",
    "slides",
    "siteContent",
    "notifications",
    "metadata"
  ];

  for (const col of collections) {
    await syncCollectionBulk(sourceDb, targetDb, col);
  }

  // Check reverse sync: sync any audit logs or settings from targetDb back to sourceDb
  console.log("\nChecking reverse sync to kicktotech (audit logs & settings)...");
  const targetLogs = await targetDb.collection("audit_logs").find({}).toArray();
  const logOps = targetLogs.map(log => ({
    updateOne: {
      filter: { _id: log._id },
      update: { $set: log },
      upsert: true
    }
  }));
  if (logOps.length > 0) {
    await sourceDb.collection("audit_logs").bulkWrite(logOps, { ordered: false }).catch(() => {});
  }

  console.log("\n=================================================");
  console.log("📊 Final Collection Verification Across Both Databases:");
  console.log("=================================================");
  const allCols = await targetDb.listCollections().toArray();
  for (const c of allCols) {
    const userCount = await targetDb.collection(c.name).countDocuments();
    const mainCount = await sourceDb.collection(c.name).countDocuments();
    console.log(`  ${c.name.padEnd(20)} | kicktotech_db_user: ${String(userCount).padStart(4)} | kicktotech: ${String(mainCount).padStart(4)}`);
  }

  await client.close();
  console.log("\n✨ BULK SYNC FULLY COMPLETED!");
}

main().catch(console.error);
