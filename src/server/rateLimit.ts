import { config } from "./config";
import { AppError } from "./http";

/**
 * In-memory fixed-window rate limiter (per key). Sufficient for local/single
 * instance. A Cloudflare KV/Durable-Object limiter implements the same guard in
 * production (multi-instance).
 */
const buckets = new Map<string, { count: number; resetAt: number }>();

export function clientIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0].trim();
  return req.headers.get("x-real-ip") ?? "local";
}

export function rateLimit(key: string, max: number = config.rateLimit.maxAuthAttempts, windowMs: number = config.rateLimit.windowMs): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || now > bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > max) {
    throw new AppError("RATE_LIMITED", "Too many attempts. Please wait a minute and try again.");
  }
}
