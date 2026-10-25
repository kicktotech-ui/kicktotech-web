import fs from "node:fs";
import path from "node:path";
import pg from "pg";
import { MongoClient } from "mongodb";

// 1. Environment credentials
const envLocal = fs.existsSync(".env.local") ? fs.readFileSync(".env.local", "utf8") : "";
const pgMatch = envLocal.match(/SUPABASE_DB_URL=(.*)/) || [];
const SUPABASE_DB_URL = pgMatch[1]?.trim() || "postgresql://postgres:Mayur%40kicktotech@db.qzwtyldprahlpcuweoyo.supabase.co:5432/postgres";

const uriMatch = envLocal.match(/MONGODB_URI=(.*)/) || [];
const dbMatch = envLocal.match(/MONGODB_DB_NAME=(.*)/) || [];
const MONGODB_URI = uriMatch[1]?.trim() || "mongodb+srv://kicktotech_db_user:7nn6qrU3If7iRvDa@cluster0.8chko6a.mongodb.net/kicktotech?retryWrites=true&w=majority";
const DB_NAME = dbMatch[1]?.trim() || "kicktotech";

async function main() {
  console.log("=================================================");
  console.log("🖼️ Kick To Tech — Media Migration to Supabase");
  console.log("=================================================\n");

  // 1. Connect to Supabase Postgres
  console.log("1. Connecting to Supabase PostgreSQL...");
  const pgClient = new pg.Client({ connectionString: SUPABASE_DB_URL, ssl: { rejectUnauthorized: false } });
  await pgClient.connect();
  console.log("   ✓ Connected to Supabase PostgreSQL!\n");

  // Ensure table exists
  await pgClient.query(`
    CREATE TABLE IF NOT EXISTS public.media_assets (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      collection TEXT NOT NULL,
      doc_id TEXT NOT NULL,
      field_name TEXT NOT NULL,
      filename TEXT NOT NULL,
      original_url TEXT NOT NULL UNIQUE,
      mime_type TEXT,
      file_size INT,
      data_base64 TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      updated_at TIMESTAMPTZ DEFAULT now()
    );
  `);

  // 2. Connect to MongoDB Atlas
  console.log("2. Connecting to MongoDB Atlas...");
  const mongoClient = new MongoClient(MONGODB_URI);
  await mongoClient.connect();
  const db = mongoClient.db(DB_NAME);
  console.log(`   ✓ Connected to MongoDB Atlas ("${DB_NAME}")\n`);

  // 3. Prepare public local media directory
  const localMediaDir = path.resolve("public/uploads/media");
  if (!fs.existsSync(localMediaDir)) fs.mkdirSync(localMediaDir, { recursive: true });

  const dumpDir = path.resolve("scripts/firebase_dump");
  const mediaCollections = ["events", "gallery", "partners", "slides", "team"];

  let migratedCount = 0;
  let mongoUpdatedCount = 0;

  for (const col of mediaCollections) {
    const filePath = path.join(dumpDir, `${col}.json`);
    if (!fs.existsSync(filePath)) continue;

    const docs = JSON.parse(fs.readFileSync(filePath, "utf8"));
    const colDir = path.join(localMediaDir, col);
    if (!fs.existsSync(colDir)) fs.mkdirSync(colDir, { recursive: true });

    console.log(`3. Processing collection: "${col}" (${docs.length} documents)...`);

    for (const doc of docs) {
      let docModified = false;
      const updatedDoc = { ...doc };

      for (const [key, val] of Object.entries(doc)) {
        if (typeof val !== "string") continue;
        let imgUrl = val.trim();

        // Check if field is an image URL
        const isImage = (
          (imgUrl.startsWith("http://") || imgUrl.startsWith("https://")) &&
          (imgUrl.includes("image") || imgUrl.includes(".png") || imgUrl.includes(".jpg") ||
           imgUrl.includes(".jpeg") || imgUrl.includes(".webp") || imgUrl.includes("favicon") ||
           imgUrl.includes("i.ibb.co") || imgUrl.includes("github.com") || imgUrl.includes("image2url.com"))
        );

        if (!isImage) continue;

        // Fix GitHub blob URLs to raw user content
        if (imgUrl.includes("github.com/") && imgUrl.includes("/blob/")) {
          imgUrl = imgUrl.replace("github.com", "raw.githubusercontent.com").replace("/blob/", "/").replace("?raw=true", "");
        }

        try {
          process.stdout.write(`   Fetching image for [${col}] ${doc.name || doc.title || doc._id}... `);
          const res = await fetch(imgUrl, {
            headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
          });

          if (!res.ok) {
            console.log(`Failed (HTTP ${res.status})`);
            continue;
          }

          const mimeType = res.headers.get("content-type") || "image/png";
          const ext = mimeType.includes("jpeg") || mimeType.includes("jpg") ? "jpg"
                    : mimeType.includes("png") ? "png"
                    : mimeType.includes("webp") ? "webp"
                    : mimeType.includes("svg") ? "svg" : "png";

          const buffer = Buffer.from(await res.arrayBuffer());
          const safeName = (doc.name || doc.title || doc._id)
            .toLowerCase()
            .replace(/[^a-z0-9_-]/g, "-")
            .replace(/-+/g, "-")
            .slice(0, 50);
          const filename = `${safeName}-${doc._id || "img"}.${ext}`;

          // Save local backup file
          const localPath = path.join(colDir, filename);
          fs.writeFileSync(localPath, buffer);

          // Upload/Insert into Supabase PostgreSQL media_assets table
          const base64 = buffer.toString("base64");
          await pgClient.query(`
            INSERT INTO public.media_assets (
              collection, doc_id, field_name, filename, original_url, mime_type, file_size, data_base64, updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, now())
            ON CONFLICT (original_url) DO UPDATE SET
              mime_type = EXCLUDED.mime_type,
              file_size = EXCLUDED.file_size,
              data_base64 = EXCLUDED.data_base64,
              updated_at = now();
          `, [col, doc._id, key, filename, val, mimeType, buffer.length, base64]);

          migratedCount++;
          console.log(`✓ Saved (${(buffer.length / 1024).toFixed(1)} KB) -> Supabase media_assets`);

          // Update MongoDB document with local served path as fallback or Supabase reference
          const relativeWebPath = `/uploads/media/${col}/${filename}`;
          updatedDoc[key] = relativeWebPath;
          updatedDoc[`${key}_original`] = val;
          docModified = true;
        } catch (err) {
          console.log(`Error: ${err.message}`);
        }
      }

      if (docModified) {
        delete updatedDoc._id;
        await db.collection(col).updateOne({ _id: doc._id }, { $set: updatedDoc });
        mongoUpdatedCount++;
      }
    }
  }

  // 4. Verify Supabase media_assets count
  const pgCountRes = await pgClient.query("SELECT count(*) FROM public.media_assets;");
  const count = pgCountRes.rows[0].count;

  console.log("\n=================================================");
  console.log("📊 Final Media Migration Results:");
  console.log("=================================================");
  console.log(`   - Supabase public.media_assets: ${count} images stored`);
  console.log(`   - MongoDB documents updated with verified assets: ${mongoUpdatedCount}`);
  console.log(`   - Local public/uploads/media backup: Ready`);

  await pgClient.end();
  await mongoClient.close();
  console.log("\n✨ SUPABASE & MONGODB MEDIA MIGRATION COMPLETED SUCCESSFULLY!");
}

main().catch(console.error);
