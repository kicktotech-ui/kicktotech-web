import { route, ok } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import { queryCollection } from "@/server/adminData";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Read-only admin data access mapped to the REAL Firestore collections.
 * GET /api/v1/admin/data/:collection?search&page&pageSize&status&domain&payment&type&id
 */
export const GET = route(async (req, { requestId, params }) => {
  await requireAdmin("users.read", req);
  const name = params?.collection ?? "";
  const url = new URL(req.url);
  const id = url.searchParams.get("id") ?? undefined;
  const search = url.searchParams.get("search") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get("pageSize") ?? 10)));
  const filters = {
    status: url.searchParams.get("status") ?? undefined,
    domain: url.searchParams.get("domain") ?? undefined,
    payment: url.searchParams.get("payment") ?? undefined,
    type: url.searchParams.get("type") ?? undefined,
  };

  const result = await queryCollection(name, { id, search, page, pageSize, filters });
  if (id) return ok({ row: result.row }, { requestId });
  return ok({ rows: result.rows, total: result.total, page, pageSize }, { requestId });
});
