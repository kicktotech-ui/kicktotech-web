import { route, ok } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import { getStore } from "@/server/data";
import { publicUser } from "@/server/auth/session";
import { isInternshipMaintenance } from "@/config/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Real interns (privacy-safe projection) from database, paginated + searchable. */
export const GET = route(async (req, { requestId }) => {
  await requireAdmin("users.read", req);
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 10)));

  const { rows, total } = await getStore().listStudents({ search, page, pageSize });
  return ok({ rows: rows.map(publicUser), total, page, pageSize }, { requestId });
});
