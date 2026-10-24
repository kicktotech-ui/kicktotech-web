import { cookies, headers } from "next/headers";
import { config } from "../config";
import { sign, unsign } from "../crypto";
import { getStore, type AccountType, type UserRecord, type SessionRecord } from "../data";

/**
 * Server-side sessions. The cookie holds only a signed session id (HMAC). The
 * session record lives in the DataStore so it can be revoked on logout. Cookies
 * are HTTP-only, SameSite=Lax, Secure in production. We also accept Authorization:
 * Bearer <signedToken> for resilient cross-environment authentication.
 */

function cookieName(type: AccountType): string {
  return type === "admin" ? config.cookies.admin : config.cookies.student;
}

export async function createSession(type: AccountType, user: UserRecord): Promise<{ session: SessionRecord; token: string }> {
  const store = getStore();
  const now = Date.now();
  const session: SessionRecord = {
    id: store.newId(),
    userId: user.id,
    type,
    role: user.role,
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + config.sessionTtlHours * 3600_000).toISOString(),
  };
  await store.createSession(session);
  const token = sign(session.id);

  try {
    cookies().set(cookieName(type), token, {
      httpOnly: true,
      sameSite: "lax",
      secure: config.cookieSecure,
      path: "/",
      maxAge: config.sessionTtlHours * 3600,
    });
  } catch (err) {
    console.warn("[session] Failed to set cookie (falling back to bearer token):", err);
  }
  return { session, token };
}

export async function readSession(type: AccountType, req?: Request): Promise<{ session: SessionRecord; user: UserRecord } | null> {
  let raw: string | undefined;

  // 1. Try Cookie
  try {
    raw = cookies().get(cookieName(type))?.value;
  } catch {
    // Outside cookie context
  }

  // 2. Try Authorization Bearer Header or custom token header fallback
  if (!raw) {
    try {
      const h = req ? req.headers : headers();
      const authHeader = h.get("authorization") || h.get("Authorization");
      if (authHeader?.startsWith("Bearer ")) {
        raw = authHeader.substring(7).trim();
      }
      if (!raw) {
        raw = h.get("x-admin-token") || h.get("x-session-token") || undefined;
      }
    } catch {
      // Outside headers context
    }
  }

  if (!raw) return null;
  const sessionId = unsign(raw);
  if (!sessionId) return null;

  try {
    const store = getStore();
    const session = await store.getSessionById(sessionId);
    if (!session || session.type !== type) return null;
    if (Date.now() > new Date(session.expiresAt).getTime()) {
      await store.deleteSession(session.id).catch(() => {});
      return null;
    }
    const user = await store.getUserById(session.userId);
    if (!user || user.status !== "active") return null;
    return { session, user };
  } catch (err) {
    console.warn("[session] Database unreachable when reading session:", err);
    return null;
  }
}

export async function clearSession(type: AccountType): Promise<void> {
  try {
    const raw = cookies().get(cookieName(type))?.value;
    if (raw) {
      const sessionId = unsign(raw);
      if (sessionId) await getStore().deleteSession(sessionId);
    }
    cookies().delete(cookieName(type));
  } catch {
    // Outside request scope
  }
}

/** Public-safe projection of a user (never exposes password material). */
export function publicUser(user: UserRecord) {
  return {
    id: user.id,
    type: user.type,
    role: user.role,
    name: user.name,
    email: user.email,
    phone: user.phone,
    college: user.college,
    company: user.company,
    status: user.status,
    createdAt: user.createdAt,
  };
}
export type PublicUser = ReturnType<typeof publicUser>;
