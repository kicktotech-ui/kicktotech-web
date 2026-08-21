/**
 * Frontend flow-separation rules for Student vs Admin.
 *
 * IMPORTANT: these are UX-only guards to keep the two experiences separate.
 * They are NOT a security boundary. Real role authorization is enforced by the
 * backend in a later phase. Never treat a passing frontend check as auth.
 *
 * The admin email is read from a public, non-secret env var (defaults to the
 * known admin identity). It is an identifier used for routing UX only — never a
 * credential, and never a secret.
 */
export const ADMIN_EMAIL = (process.env.NEXT_PUBLIC_ADMIN_DEV_EMAIL ?? "admin@kicktotech.in").toLowerCase();
export const ADMIN_EMAIL_DOMAIN = "@kicktotech.in";

/** True when an email should use the Admin Portal instead of the student flow. */
export function isAdminEmail(email: string): boolean {
  const value = email.trim().toLowerCase();
  return value === ADMIN_EMAIL || value.endsWith(ADMIN_EMAIL_DOMAIN);
}
