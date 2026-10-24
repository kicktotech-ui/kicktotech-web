import { route, ok } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import { getStore } from "@/server/data";
import type { SystemService } from "@/lib/admin/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Real system health — performs a live database probe. */
export const GET = route(async (req, { requestId }) => {
  await requireAdmin("system.read", req);

  let dbStatus: SystemService;
  try {
    const store = getStore();
    const count = await store.countCertificates();
    const isMongo = Boolean(process.env.MONGODB_URI);
    dbStatus = {
      name: "Database",
      state: isMongo ? "OPERATIONAL" : "MOCK",
      detail: isMongo
        ? `MongoDB connected · ${count} certificates`
        : "In-memory mode · Set MONGODB_URI in deployment environment variables to sync real database",
    };
  } catch (err) {
    console.error("[system] Database connection probe failed:", err);
    dbStatus = { name: "Database", state: "NOT_CONNECTED", detail: "Database unreachable. Check connection logs." };
  }

  const services: SystemService[] = [
    { name: "Frontend", state: "OPERATIONAL", detail: "Next.js app running" },
    { name: "API", state: "OPERATIONAL", detail: "/api/v1 serving requests" },
    dbStatus,
    { name: "Authentication", state: "OPERATIONAL", detail: "Native Session + PBKDF2 Password Auth" },
    { name: "Email", state: process.env.BREVO_API_KEY ? "OPERATIONAL" : "NOT_CONNECTED", detail: process.env.BREVO_API_KEY ? "Brevo connected" : "Brevo API key not set" },
    { name: "Storage", state: process.env.NEXT_PUBLIC_SUPABASE_URL ? "OPERATIONAL" : "NOT_CONNECTED", detail: process.env.NEXT_PUBLIC_SUPABASE_URL ? "Supabase Storage active" : "Supabase credentials pending" },
    { name: "Payments", state: process.env.RAZORPAY_KEY_ID ? "OPERATIONAL" : "NOT_CONNECTED", detail: process.env.RAZORPAY_KEY_ID ? "Razorpay Gateway active" : "Manual UPI mode active" },
  ];
  return ok(services, { requestId });
});
