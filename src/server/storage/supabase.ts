import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase Storage integration for Kick To Tech 2.0.
 * Replaces Firebase Storage for media, payment proofs, certificate assets, and images.
 */

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || "";
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  "";

let _supabaseClient: SupabaseClient | null = null;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return null;
  }
  if (!_supabaseClient) {
    _supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }
  return _supabaseClient;
}

export interface UploadOptions {
  bucket: "images" | "certificates" | "payment-proofs" | string;
  path: string;
  fileBuffer: Buffer | ArrayBuffer | Uint8Array;
  contentType?: string;
  upsert?: boolean;
}

/**
 * Uploads a file/image to Supabase Storage and returns its authoritative public URL.
 */
export async function uploadToSupabaseStorage({
  bucket,
  path,
  fileBuffer,
  contentType,
  upsert = true,
}: UploadOptions): Promise<{ url: string | null; error?: string }> {
  const supabase = getSupabaseServerClient();
  if (!supabase) {
    return {
      url: null,
      error: "Supabase storage is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    };
  }

  try {
    const cleanPath = path.replace(/^\/+/, "");
    const { data, error } = await supabase.storage.from(bucket).upload(cleanPath, fileBuffer, {
      contentType: contentType || "image/png",
      upsert,
    });

    if (error) {
      console.error("[supabase] Upload error:", error.message);
      return { url: null, error: error.message };
    }

    const { data: publicUrlData } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
    return { url: publicUrlData.publicUrl };
  } catch (err) {
    console.error("[supabase] Storage upload failed:", err);
    return { url: null, error: (err as Error)?.message || "Upload failed" };
  }
}

/**
 * Returns the public URL for an asset in Supabase Storage.
 */
export function getSupabasePublicUrl(bucket: string, path: string): string | null {
  const supabase = getSupabaseServerClient();
  if (!supabase) return null;
  const cleanPath = path.replace(/^\/+/, "");
  const { data } = supabase.storage.from(bucket).getPublicUrl(cleanPath);
  return data.publicUrl;
}
