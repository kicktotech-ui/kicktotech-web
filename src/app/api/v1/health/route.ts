import { route, ok } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = route(async () => {
  return ok({
    status: "ok",
    service: "kicktotech-api",
    version: "v1",
    time: new Date().toISOString(),
  });
});
