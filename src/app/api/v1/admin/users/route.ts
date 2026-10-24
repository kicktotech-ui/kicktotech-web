import { route, ok } from "@/server/http";
import { requireAdmin } from "@/server/auth/guard";
import { firebaseStore } from "@/server/data/firebase";
import { publicUser } from "@/server/auth/session";
import { isInternshipMaintenance } from "@/config/features";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Real interns (privacy-safe projection) from live Firestore, paginated + searchable. */
export const GET = route(async (req, { requestId }) => {
  await requireAdmin("users.read");
  const url = new URL(req.url);
  const search = url.searchParams.get("search") ?? undefined;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const pageSize = Math.min(100, Math.max(1, Number(url.searchParams.get("pageSize") ?? 10)));

  if (isInternshipMaintenance()) {
    return ok({ rows: [], total: 0, page, pageSize, maintenance: true }, { requestId });
  }

  const { rows, total } = await firebaseStore().listStudents({ search, page, pageSize });
  return ok({ rows: rows.map(publicUser), total, page, pageSize }, { requestId });
});
