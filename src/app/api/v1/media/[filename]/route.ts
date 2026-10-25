import { NextResponse } from "next/server";
import pg from "pg";

const SUPABASE_DB_URL =
  process.env.SUPABASE_DB_URL ||
  "postgresql://postgres:Mayur%40kicktotech@db.qzwtyldprahlpcuweoyo.supabase.co:5432/postgres";

let pool: pg.Pool | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: SUPABASE_DB_URL,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 30000,
    });
  }
  return pool;
}

export async function GET(
  _request: Request,
  { params }: { params: { filename: string } }
) {
  try {
    const filename = decodeURIComponent(params.filename);
    const dbPool = getPool();
    const result = await dbPool.query(
      "SELECT mime_type, data_base64 FROM public.media_assets WHERE filename = $1 LIMIT 1",
      [filename]
    );

    if (result.rows.length === 0) {
      return new NextResponse("Not Found", { status: 404 });
    }

    const { mime_type, data_base64 } = result.rows[0];
    const imageBuffer = Buffer.from(data_base64, "base64");

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        "Content-Type": mime_type || "image/png",
        "Content-Length": imageBuffer.length.toString(),
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("[media] Error serving media asset:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
