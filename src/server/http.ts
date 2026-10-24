import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { uuid } from "./crypto";

/* Consistent API envelope, error taxonomy, and a safe route wrapper. */

export type ErrorCode =
  | "VALIDATION_ERROR" | "INVALID_CREDENTIALS" | "UNAUTHENTICATED" | "FORBIDDEN"
  | "NOT_FOUND" | "CONFLICT" | "RATE_LIMITED" | "BOOTSTRAP_REQUIRED" | "MAINTENANCE_MODE" | "SERVER_ERROR";

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

function withHeaders(res: NextResponse, requestId: string): NextResponse {
  for (const [k, v] of Object.entries(SECURITY_HEADERS)) res.headers.set(k, v);
  res.headers.set("X-Request-Id", requestId);
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
    try {
      return await handler(req, { requestId, params: context?.params });
    } catch (err) {
      if (err instanceof AppError) {
        return fail(err.code, err.message, err.details, requestId);
      }
      if (err instanceof ZodError) {
        return fail("VALIDATION_ERROR", "Invalid request.", err.flatten(), requestId);
      }
      // Firestore quota / rate-limit (RESOURCE_EXHAUSTED) → honest 429 so the UI
      // can tell the user the data source is throttled, not "disconnected".
      const code = (err as { code?: number | string })?.code;
      if (code === 8 || code === 429) {
        console.error(`[api] ${requestId} Firestore quota/rate limit (RESOURCE_EXHAUSTED)`);
        return fail(
          "RATE_LIMITED",
          "The Firebase project's read quota is currently exhausted. Live data is temporarily unavailable — it resets when the daily Firestore quota rolls over (midnight US Pacific), or upgrade the project to the Blaze plan.",
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
