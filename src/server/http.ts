import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { uuid } from "./crypto";

/* Consistent API envelope, error taxonomy, and a safe route wrapper. */

export type ErrorCode =
  | "VALIDATION_ERROR" | "INVALID_CREDENTIALS" | "UNAUTHENTICATED" | "FORBIDDEN"
  | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "BOOTSTRAP_REQUIRED" | "MAINTENANCE_MODE" | "SERVER_ERROR"
  | "SERVICE_UNAVAILABLE";

const STATUS: Record<ErrorCode, number> = {
  VALIDATION_ERROR: 400,
  INVALID_CREDENTIALS: 401,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  BOOTSTRAP_REQUIRED: 503,
  MAINTENANCE_MODE: 503,
  SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
};

export class AppError extends Error {
  code: ErrorCode;
  details?: unknown;
  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Cache-Control": "no-store",
};

function withHeaders(res: NextResponse, requestId: string, req?: Request): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  res.headers.set("X-Request-Id", requestId);

  // CORS support: allow Vercel frontend and custom domain
  const origin = req?.headers.get("origin");
  if (origin) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set("Access-Control-Allow-Credentials", "true");
    res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, X-Request-Id, X-Admin-Token, X-Session-Token");
  }

  return res;
}

export function ok<T>(data: T, init?: { status?: number; requestId?: string }): NextResponse {
  const requestId = init?.requestId ?? uuid();
  return withHeaders(NextResponse.json({ success: true, data, requestId }, { status: init?.status ?? 200 }), requestId);
}

export function fail(code: ErrorCode, message: string, details?: unknown, requestId = uuid()): NextResponse {
  return withHeaders(
    NextResponse.json({ success: false, error: { code, message, details }, requestId }, { status: STATUS[code] }),
    requestId,
  );
}

/**
 * Wrap a route handler: assigns a requestId, converts AppError / ZodError into
 * the standard envelope, and never leaks stack traces to clients.
 */
export function route(handler: (req: Request, ctx: { requestId: string; params?: Record<string, string> }) => Promise<NextResponse>) {
  return async (req: Request, context?: { params?: Record<string, string> }) => {
    const requestId = uuid();

    if (req.method === "OPTIONS") {
      const preflight = new NextResponse(null, { status: 204 });
      return withHeaders(preflight, requestId, req);
    }

    try {
      const res = await handler(req, { requestId, params: context?.params });
      return withHeaders(res, requestId, req);
    } catch (err) {
      if (err instanceof AppError) {
        return fail(err.code, err.message, err.details, requestId);
      }
      if (err instanceof ZodError) {
        return fail("VALIDATION_ERROR", "Invalid request.", err.flatten(), requestId);
      }
      // Rate limit / Resource exhausted
      const code = (err as { code?: number | string })?.code;
      if (code === 8 || code === 429) {
        console.error(`[api] ${requestId} Rate limit / quota reached`);
        return fail(
          "RATE_LIMITED",
          "Database request limit reached. Please try again shortly.",
          undefined,
          requestId,
        );
      }
      // MongoDB Atlas IP Whitelist / TLS Rejection Error
      const errMsg = (err as Error)?.message || "";
      if (
        errMsg.includes("SSL alert number 80") ||
        errMsg.includes("tlsv1 alert internal error") ||
        errMsg.includes("MongoServerSelectionError")
      ) {
        console.error(`[api] ${requestId} MongoDB Atlas connection blocked by IP whitelist:`, err);
        return fail(
          "SERVICE_UNAVAILABLE",
          "Database connection blocked: Your current IP is not whitelisted in MongoDB Atlas. Please add 0.0.0.0/0 in MongoDB Atlas -> Network Access.",
          undefined,
          requestId,
        );
      }
      // Log server-side only; return a generic message.
      console.error(`[api] ${requestId} unhandled error:`, err);
      return fail("SERVER_ERROR", "Something went wrong. Please try again.", undefined, requestId);
    }
  };
}

/** Parse + validate a JSON body with a Zod schema (throws ZodError → 400). */
export async function parseJson<T>(req: Request, schema: { parse: (v: unknown) => T }): Promise<T> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    throw new AppError("VALIDATION_ERROR", "Request body must be valid JSON.");
  }
  return schema.parse(body);
}
