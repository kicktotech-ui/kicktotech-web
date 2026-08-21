"use client";

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  reload,
  onAuthStateChanged,
  GoogleAuthProvider,
  signInWithPopup,
  type User,
  type Unsubscribe,
} from "firebase/auth";
import { getFirebaseClient } from "./client";

/* ============================================================================
   Firebase Auth Service — REAL Firebase Authentication operations.
   No mocks, no fakes, no localStorage auth. Firebase is the source of truth.
   ========================================================================== */

/** Human-readable error messages for Firebase Auth error codes. */
const ERROR_MAP: Record<string, string> = {
  "auth/invalid-credential": "Email or password is incorrect.",
  "auth/invalid-email": "Enter a valid email address.",
  "auth/email-already-in-use": "An account with this email already exists.",
  "auth/weak-password": "Choose a stronger password (at least 6 characters).",
  "auth/user-not-found": "No account found with this email.",
  "auth/wrong-password": "Email or password is incorrect.",
  "auth/too-many-requests": "Too many attempts. Please wait a moment and try again.",
  "auth/network-request-failed": "Connection problem. Check your internet and try again.",
  "auth/user-disabled": "This account has been disabled. Contact support.",
  "auth/operation-not-allowed": "This sign-in method is not enabled.",
  "auth/popup-closed-by-user": "Sign-in popup was closed before completing.",
  "auth/popup-blocked": "Sign-in popup was blocked by your browser.",
  "auth/requires-recent-login": "Please sign in again to complete this action.",
};

function friendlyError(error: unknown): string {
  if (error && typeof error === "object" && "code" in error) {
    const code = (error as { code: string }).code;
    return ERROR_MAP[code] ?? "Something went wrong. Please try again.";
  }
  return "Something went wrong. Please try again.";
}

export interface AuthActionResult {
  success: boolean;
  user?: User;
  error?: string;
}

/**
 * Get the Firebase Auth instance. Returns null if Firebase is not configured.
 */
function getAuth() {
  const client = getFirebaseClient();
  return client?.auth ?? null;
}

/**
 * Create a new user with email and password.
 * Returns the Firebase User on success.
 */
export async function firebaseSignUp(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const auth = getAuth();
  if (!auth) return { success: false, error: "Firebase is not configured." };

  try {
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    return { success: true, user: credential.user };
  } catch (e) {
    return { success: false, error: friendlyError(e) };
  }
}

/**
 * Sign in with email and password.
 * Does NOT check emailVerified — caller must do that.
 */
export async function firebaseSignIn(
  email: string,
  password: string,
): Promise<AuthActionResult> {
  const auth = getAuth();
  if (!auth) return { success: false, error: "Firebase is not configured." };

  try {
    const credential = await signInWithEmailAndPassword(auth, email, password);
    return { success: true, user: credential.user };
  } catch (e) {
    return { success: false, error: friendlyError(e) };
  }
}

/**
 * Sign in with Google popup.
 */
export async function firebaseGoogleSignIn(): Promise<AuthActionResult> {
  const auth = getAuth();
  if (!auth) return { success: false, error: "Firebase is not configured." };

  try {
    const provider = new GoogleAuthProvider();
    const credential = await signInWithPopup(auth, provider);
    return { success: true, user: credential.user };
  } catch (e) {
    return { success: false, error: friendlyError(e) };
  }
}

/**
 * Sign out the current user.
 */
export async function firebaseLogout(): Promise<void> {
  const auth = getAuth();
  if (auth) {
    await firebaseSignOut(auth);
  }
}

/**
 * Send email verification to the current user.
 */
export async function firebaseSendVerificationEmail(): Promise<AuthActionResult> {
  const auth = getAuth();
  if (!auth?.currentUser) {
    return { success: false, error: "No user is signed in." };
  }
  try {
    await sendEmailVerification(auth.currentUser);
    return { success: true };
  } catch (e) {
    return { success: false, error: friendlyError(e) };
  }
}

/**
 * Send password reset email.
 */
export async function firebaseResetPassword(email: string): Promise<AuthActionResult> {
  const auth = getAuth();
  if (!auth) return { success: false, error: "Firebase is not configured." };

  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (e) {
    // For security, don't reveal whether the email exists
    const code = (e as { code?: string })?.code;
    if (code === "auth/user-not-found") {
      // Still show success to prevent email enumeration
      return { success: true };
    }
    return { success: false, error: friendlyError(e) };
  }
}

/**
 * Reload the current Firebase user to get fresh data (especially emailVerified).
 * Returns the updated emailVerified status.
 */
export async function firebaseRefreshUser(): Promise<{
  emailVerified: boolean;
  user: User | null;
}> {
  const auth = getAuth();
  if (!auth?.currentUser) return { emailVerified: false, user: null };

  try {
    await reload(auth.currentUser);
    return {
      emailVerified: auth.currentUser.emailVerified,
      user: auth.currentUser,
    };
  } catch {
    return { emailVerified: false, user: auth.currentUser };
  }
}

/**
 * Subscribe to auth state changes. Returns an unsubscribe function.
 */
export function firebaseOnAuthStateChanged(
  callback: (user: User | null) => void,
): Unsubscribe {
  const auth = getAuth();
  if (!auth) {
    // If Firebase isn't configured, immediately report no user
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

/**
 * Get the current Firebase user (synchronous snapshot).
 */
export function firebaseCurrentUser(): User | null {
  const auth = getAuth();
  return auth?.currentUser ?? null;
}
