import type { Firestore } from "firebase-admin/firestore";
import type { Auth } from "firebase-admin/auth";

/**
 * Firebase ADMIN SDK (server-side) initialization — singleton, HMR-safe, and
 * LAZY (dynamic import) so `next build` never loads it unless actually used.
 *
 * Credentials come ONLY from the environment (service account). Nothing is
 * hardcoded. Provide these in .env.local (git-ignored):
 *   FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY
 *
 * NOTE: The public web config (NEXT_PUBLIC_FIREBASE_*) is NOT sufficient here —
 * server-side privileged access requires a service account.
 */

const globalRef = globalThis as unknown as { __kttAdminDb?: Firestore; __kttAdminAuth?: Auth };

export function isAdminConfigured(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

export async function getAdminDb(): Promise<Firestore> {
  if (!isAdminConfigured()) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local.",
    );
  }
  if (globalRef.__kttAdminDb) return globalRef.__kttAdminDb;

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getFirestore } = await import("firebase-admin/firestore");

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Private keys arrive with escaped newlines in env vars.
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });

  const db = getFirestore(app);
  // REST transport is more stable than gRPC under Next.js route handlers and
  // avoids channel contention on rapid sequential reads. Safe to call once,
  // before the first operation; ignore if settings were already applied.
  try {
    db.settings({ preferRest: true });
  } catch {
    /* settings already frozen on a reused app — fine */
  }
  globalRef.__kttAdminDb = db;
  return db;
}

export async function getAdminAuth(): Promise<Auth> {
  if (!isAdminConfigured()) {
    throw new Error(
      "Firebase Admin is not configured. Set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY in .env.local.",
    );
  }
  if (globalRef.__kttAdminAuth) return globalRef.__kttAdminAuth;

  const { initializeApp, getApps, cert } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  const app = getApps().length
    ? getApps()[0]
    : initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
        }),
      });

  const auth = getAuth(app);
  globalRef.__kttAdminAuth = auth;
  return auth;
}
