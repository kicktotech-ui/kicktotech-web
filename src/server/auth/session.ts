import { cookies } from "next/headers";
import { config } from "../config";
import { sign, unsign } from "../crypto";
import { getStore, type AccountType, type UserRecord, type SessionRecord } from "../data";

/**
 * Server-side sessions. The cookie holds only a signed session id (HMAC). The
 * session record lives in the DataStore so it can be revoked on logout. Cookies
 * are HTTP-only, SameSite=Lax, Secure in production. No credentials or roles
 * are trusted from the cookie itself.
 */

function cookieName(type: AccountType): string {
  return type === "admin" ? config.cookies.admin : config.cookies.student;
}

export async function createSession(type: AccountType, user: UserRecord): Promise<SessionRecord> {
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

  cookies().set(cookieName(type), sign(session.id), {
    httpOnly: true,
    sameSite: "lax",
    secure: config.cookieSecure,
    path: "/",
    maxAge: config.sessionTtlHours * 3600,
  });
  return session;
}

export async function readSession(type: AccountType): Promise<{ session: SessionRecord; user: UserRecord } | null> {
  const raw = cookies().get(cookieName(type))?.value;
  if (!raw) return null;
  const sessionId = unsign(raw);
  if (!sessionId) return null;

  const store = getStore();
  const session = await store.getSessionById(sessionId);
  if (!session || session.type !== type) return null;
  if (Date.now() > new Date(session.expiresAt).getTime()) {
    await store.deleteSession(session.id);
    return null;
  }
  const user = await store.getUserById(session.userId);
  if (!user || user.status !== "active") return null;
  return { session, user };
}

export async function clearSession(type: AccountType): Promise<void> {
  const raw = cookies().get(cookieName(type))?.value;
  if (raw) {
    const sessionId = unsign(raw);
    if (sessionId) await getStore().deleteSession(sessionId);
  }
  cookies().delete(cookieName(type));
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
