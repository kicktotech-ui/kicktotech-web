import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { MongoClient } from "mongodb";

// 1. Firebase Credentials
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL || "firebase-adminsdk-fbsvc@kicktotech-c6e18.iam.gserviceaccount.com";
const rawKey = process.env.FIREBASE_PRIVATE_KEY || (fs.existsSync("scripts/fb_key.txt") ? fs.readFileSync("scripts/fb_key.txt", "utf8") : "");
const privateKey = rawKey ? rawKey.replace(/\\n/g, "\n") : "";
const projectId = process.env.FIREBASE_PROJECT_ID || "kicktotech-c6e18";

// 2. MongoDB Credentials
const envLocal = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const uriMatch = envLocal.match(/MONGODB_URI=(.*)/) || [];
const dbMatch = envLocal.match(/MONGODB_DB_NAME=(.*)/) || [];
const MONGODB_URI = uriMatch[1]?.trim() || "mongodb+srv://kicktotech_db_user:7nn6qrU3If7iRvDa@cluster0.8chko6a.mongodb.net/kicktotech?retryWrites=true&w=majority";
const DB_NAME = dbMatch[1]?.trim() || "kicktotech";

async function getAccessToken() {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: "RS256", typ: "JWT" };
  const claimSet = {
    iss: clientEmail,
    scope: "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/cloud-platform",
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encodeBase64Url = (obj) => Buffer.from(JSON.stringify(obj)).toString("base64url");
  const signInput = `${encodeBase64Url(header)}.${encodeBase64Url(claimSet)}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signInput);
  sign.end();
  const signature = sign.sign(privateKey, "base64url");
  const jwt = `${signInput}.${signature}`;

  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`Auth failed: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

function parseFirestoreValue(val) {
  if (val === undefined || val === null) return null;
  if ("stringValue" in val) return val.stringValue;
  if ("integerValue" in val) return Number(val.integerValue);
  if ("doubleValue" in val) return Number(val.doubleValue);
  if ("booleanValue" in val) return val.booleanValue;
  if ("timestampValue" in val) return val.timestampValue;
  if ("nullValue" in val) return null;
  if ("arrayValue" in val) return (val.arrayValue.values || []).map(parseFirestoreValue);
  if ("mapValue" in val) {
    const res = {};
    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
      res[k] = parseFirestoreValue(v);
    }
    return res;
  }
  return val;
}

function parseDocument(doc) {
  const id = doc.name.split("/").pop();
  const fields = {};
  for (const [key, val] of Object.entries(doc.fields || {})) {
    fields[key] = parseFirestoreValue(val);
  }
  return {
    _id: id,
    id: fields.id || id,
    ...fields,
    _fbCreateTime: doc.createTime,
    _fbUpdateTime: doc.updateTime,
  };
}

async function fetchEntireCollection(token, colName) {
  const documents = [];
  let pageToken = null;
  let page = 1;

  while (true) {
    let url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${colName}?pageSize=300`;
    if (pageToken) {
      url += `&pageToken=${encodeURIComponent(pageToken)}`;
    }

    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!res.ok) {
      console.warn(`[export] Warning: Failed to fetch ${colName} (HTTP ${res.status})`);
      break;
    }

    const data = await res.json();
    if (data.documents && data.documents.length > 0) {
      for (const d of data.documents) {
        documents.push(parseDocument(d));
      }
    }

    pageToken = data.nextPageToken;
    if (!pageToken) break;
    page++;
  }

  return documents;
}

const ALL_COLLECTIONS = [
  "certificates",
  "contacts",
  "events",
  "gallery",
  "interns",
  "internship_domains",
  "ktt_applications",
  "ktt_audit_logs",
  "ktt_sessions",
  "ktt_users",
  "manual_activations",
  "mentor_uids",
  "mentor_users",
  "metadata",
  "notifications",
  "partners",
  "registrations",
  "settings",
  "siteContent",
  "slides",
  "team",
  "users"
];

async function main() {
  console.log("=================================================");
  console.log("🚀 Kick To Tech — Full Firebase to MongoDB Migration");
  console.log("=================================================\n");

  // 1. Get Firebase Token
  console.log("1. Authenticating with Firebase...");
  const token = await getAccessToken();
  console.log("   ✓ Firebase auth successful!\n");

  // 2. Prepare backup folder
  const dumpDir = path.resolve("scripts/firebase_dump");
  if (!fs.existsSync(dumpDir)) fs.mkdirSync(dumpDir, { recursive: true });

  // 3. Connect to MongoDB
  console.log("2. Connecting to MongoDB Atlas...");
  const mongo = new MongoClient(MONGODB_URI);
  await mongo.connect();
  const db = mongo.db(DB_NAME);
  console.log(`   ✓ Connected to MongoDB database: "${DB_NAME}"\n`);

  const summary = {};

  // 4. Download and Migrate each collection
  console.log("3. Downloading all collections from Firebase Firestore and migrating to MongoDB...\n");

  for (const colName of ALL_COLLECTIONS) {
    process.stdout.write(`   Fetching "${colName}"... `);
    const docs = await fetchEntireCollection(token, colName);
    console.log(`Found ${docs.length} documents.`);

    // Save JSON backup
    fs.writeFileSync(path.join(dumpDir, `${colName}.json`), JSON.stringify(docs, null, 2));

    summary[colName] = docs.length;

    if (docs.length === 0) continue;

    // Migrate into corresponding MongoDB collection
    // We map collection names appropriately
    let targetCollection = colName;
    if (colName === "ktt_applications") targetCollection = "applications";
    else if (colName === "ktt_users") targetCollection = "users";
    else if (colName === "ktt_sessions") targetCollection = "sessions";
    else if (colName === "ktt_audit_logs") targetCollection = "audit_logs";

    const collection = db.collection(targetCollection);

    // Write documents safely preserving existing documents
    let inserted = 0;
    let updated = 0;

    for (const doc of docs) {
      const docId = doc._id || doc.id;
      let filter;

      if (targetCollection === "certificates") {
        const certId = doc.certificateId || docId;
        filter = { $or: [{ _id: docId }, { certificateId: certId }] };
      } else if (targetCollection === "applications") {
        const appId = doc.applicationId || docId;
        filter = { $or: [{ _id: docId }, { applicationId: appId }] };
      } else if (targetCollection === "users") {
        const email = doc.email ? doc.email.trim().toLowerCase() : null;
        if (email) {
          filter = { $or: [{ _id: docId }, { email: email }] };
        } else {
          filter = { _id: docId };
        }
      } else if (targetCollection === "interns") {
        const internId = doc.internId || docId;
        filter = { $or: [{ _id: docId }, { internId: internId }] };
      } else if (targetCollection === "registrations") {
        const regId = doc.registrationId || doc.id || docId;
        filter = { $or: [{ _id: docId }, { registrationId: regId }] };
      } else {
        filter = { _id: docId };
      }

      // Check if existing doc exists
      const existing = await collection.findOne(filter);
      if (existing) {
        // Update without overwriting sensitive password or verified payment fields
        const safeDoc = { ...doc };
        delete safeDoc._id;
        if (existing.passwordHash) {
          delete safeDoc.passwordHash;
          delete safeDoc.passwordSalt;
        }
        if (existing.status === "PAYMENT_VERIFIED") {
          delete safeDoc.status;
          delete safeDoc.razorpayPaymentId;
          delete safeDoc.razorpayOrderId;
        }
        await collection.updateOne({ _id: existing._id }, { $set: safeDoc });
        updated++;
      } else {
        // Double check by _id to avoid any duplicate key conflict
        const byId = await collection.findOne({ _id: docId });
        if (byId) {
          const safeDoc = { ...doc };
          delete safeDoc._id;
          await collection.updateOne({ _id: byId._id }, { $set: safeDoc });
          updated++;
        } else {
          await collection.insertOne({ ...doc, _id: docId });
          inserted++;
        }
      }
    }

    console.log(`     -> MongoDB "${targetCollection}": ${inserted} inserted, ${updated} merged/updated.`);
  }

  // 5. Special Step: Also merge the 'users' collection from Firebase into MongoDB 'users'
  // (In Firebase there is both 'ktt_users' and 'users')
  const fbUsers = JSON.parse(fs.readFileSync(path.join(dumpDir, "users.json"), "utf8"));
  let userCount = 0;
  for (const u of fbUsers) {
    if (!u.email) continue;
    const normEmail = u.email.trim().toLowerCase();
    const docId = u.uid || u.id || normEmail;
    const existing = await db.collection("users").findOne({ email: normEmail });
    const byId = await db.collection("users").findOne({ _id: docId });
    if (!existing && !byId) {
      await db.collection("users").insertOne({
        _id: docId,
        id: docId,
        name: u.name || "Student",
        email: normEmail,
        phone: u.phone || "",
        role: u.role || "student",
        type: u.role === "admin" ? "admin" : "student",
        status: "active",
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt || new Date().toISOString(),
      });
      userCount++;
    }
  }
  if (userCount > 0) {
    console.log(`   ✓ Merged ${userCount} additional users from Firebase 'users' collection into MongoDB 'users'.`);
  }

  // 6. Verify Final MongoDB Counts
  console.log("\n=================================================");
  console.log("📊 Final MongoDB Collection Counts:");
  console.log("=================================================");
  const allDbCollections = await db.listCollections().toArray();
  for (const c of allDbCollections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`   - ${c.name}: ${count} documents`);
  }

  await mongo.close();
  console.log("\n✨ MIGRATION TO MONGODB COMPLETED SUCCESSFULLY!");
}

main().catch(console.error);
