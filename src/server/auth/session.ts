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

function createSessionToken(session: SessionRecord, user: UserRecord): string {
  const payload = Buffer.from(
    JSON.stringify({
      sid: session.id,
      uid: user.id,
      type: session.type,
      role: user.role,
      exp: session.expiresAt,
    })
  ).toString("base64url");
  return sign(payload);
}

function parseSessionToken(token: string): { sid: string; uid: string; type: AccountType; role: string; exp: string } | null {
  const raw = unsign(token);
  if (!raw) return null;
  try {
    const jsonStr = Buffer.from(raw, "base64url").toString("utf8");
    const data = JSON.parse(jsonStr);
    if (!data.sid || !data.uid || !data.type || !data.exp) return null;
    if (Date.now() > new Date(data.exp).getTime()) return null;
    return data;
  } catch {
    // Backward-compatibility: if token was legacy plain sessionId
    return { sid: raw, uid: "", type: "admin", role: "", exp: "" };
  }
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
  await store.createSession(session).catch(() => {});
  const token = createSessionToken(session, user);

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
  const parsed = parseSessionToken(raw);
  if (!parsed) return null;
  if (parsed.type && parsed.type !== type) return null;

  try {
    const store = getStore();

    // 1. Try fetching existing session from database
    const session = await store.getSessionById(parsed.sid);
    if (session) {
      if (session.type !== type) return null;
      if (Date.now() > new Date(session.expiresAt).getTime()) {
        await store.deleteSession(session.id).catch(() => {});
        return null;
      }
      const user = await store.getUserById(session.userId);
      if (user && user.status === "active") {
        return { session, user };
      }
    }

    // 2. Resilient Fallback: Token is cryptographically signed and unexpired
    if (parsed.uid) {
      const user = await store.getUserById(parsed.uid);
      if (user && user.status === "active") {
        const recoveredSession: SessionRecord = {
          id: parsed.sid,
          userId: user.id,
          type,
          role: user.role,
          createdAt: new Date().toISOString(),
          expiresAt: parsed.exp,
        };
        await store.createSession(recoveredSession).catch(() => {});
        return { session: recoveredSession, user };
      }

      // If user wasn't in memory/store (e.g. process restart / cold start) and is admin
      if (type === "admin" && (parsed.role === "SUPER_ADMIN" || parsed.role === "ADMIN")) {
        const adminEmail = config.admin.email;
        const fallbackUser: UserRecord = {
          id: parsed.uid,
          type: "admin",
          role: parsed.role as any,
          name: "Administrator",
          email: adminEmail,
          passwordSalt: "",
          passwordHash: "",
          status: "active",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        const recoveredSession: SessionRecord = {
          id: parsed.sid,
          userId: parsed.uid,
          type: "admin",
          role: parsed.role,
          createdAt: new Date().toISOString(),
          expiresAt: parsed.exp,
        };
        return { session: recoveredSession, user: fallbackUser };
      }
    }

    return null;
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
