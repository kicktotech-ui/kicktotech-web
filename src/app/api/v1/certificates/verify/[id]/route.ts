import { route, ok } from "@/server/http";
import { verifyCertificate } from "@/server/certificates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public certificate verification. No authentication required; safe fields only. */
export const GET = route(async (_req, { requestId, params }) => {
  const id = params?.id ?? "";
  return ok(await verifyCertificate(id), { requestId });
});
