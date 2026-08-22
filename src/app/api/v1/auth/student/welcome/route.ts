import { NextRequest, NextResponse } from "next/server";
import { getAdminDb, getAdminAuth } from "@/server/firebase/admin";
import { sendBrevoTemplateEmail } from "@/server/email/brevo";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/v1/auth/student/welcome
 *
 * Server-side welcome-email trigger with concurrency protection.
 *
 * State machine on students/{uid}.welcomeEmailStatus:
 *   "pending"  → not yet sent (initial / reset after Brevo failure)
 *   "sending"  → claimed by a server request (in-flight)
 *   "sent"     → Brevo successfully accepted the email
 *
 * Guarantees:
 * - No welcome email before Firebase email verification.
 * - AT-LEAST-ONCE delivery with server-side concurrency protection.
 * - Temporary Brevo failure leaves state retryable ("pending").
 * - Firebase verification state (emailVerified) is saved independently.
 * - A rare duplicate is possible if Brevo accepts but the subsequent
 *   Firestore write to "sent" fails. This is an accepted trade-off:
 *   a duplicate welcome email is preferable to permanently losing it.
 *
 * Does NOT guarantee exactly-once delivery — that would require a
 * two-phase commit protocol not available in this architecture.
 *
 * Security:
 * - UID and email come from the verified Firebase ID token, never from
 *   the request body.
 * - Brevo API key is server-only (never returned to the client).
 * - welcomeEmailStatus is server-controlled; clients cannot forge it.
 * - No secrets, tokens, or passwords are logged.
 */

/** Stale "sending" claim timeout. If a claim is older than this, allow reclaim. */
const STALE_CLAIM_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(req: NextRequest) {
  try {
    // ---- 1. Verify Firebase ID token (server-side, secure) ----
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Missing or invalid authorization header" },
        { status: 401 },
      );
    }
    const idToken = authHeader.substring(7);

    const adminAuth = await getAdminAuth();
    const decodedToken = await adminAuth.verifyIdToken(idToken);

    // ---- 2. Require email_verified from the VERIFIED token ----
    if (decodedToken.email_verified !== true) {
      return NextResponse.json(
        { error: "Email is not verified in Firebase Auth" },
        { status: 403 },
      );
    }

    const uid = decodedToken.uid;
    const email = decodedToken.email;
    if (!email) {
      return NextResponse.json(
        { error: "No email associated with account" },
        { status: 400 },
      );
    }

    // ---- 3. Firestore transaction: claim the welcome-email send ----
    const db = await getAdminDb();
    const studentRef = db.collection("students").doc(uid);

    const transactionResult = await db.runTransaction(async (t) => {
      const doc = await t.get(studentRef);
      if (!doc.exists) {
        throw new Error("STUDENT_NOT_FOUND");
      }

      const data = doc.data()!;
      const status = (data.welcomeEmailStatus as string | undefined) ?? "pending";

      // Already successfully sent — nothing to do.
      if (status === "sent") {
        return { action: "already_sent" as const, profile: data };
      }

      // Another request currently has the claim — check if it's stale.
      if (status === "sending") {
        const updatedAt = data.welcomeEmailStatusUpdatedAt;
        let updatedAtMs = 0;
        if (updatedAt) {
          if (typeof updatedAt === "string") {
            updatedAtMs = new Date(updatedAt).getTime();
          } else if (
            typeof updatedAt === "object" &&
            updatedAt !== null &&
            typeof (updatedAt as { toMillis?: unknown }).toMillis === "function"
          ) {
            updatedAtMs = (updatedAt as { toMillis: () => number }).toMillis();
          }
        }
        const elapsed = Date.now() - updatedAtMs;
        if (elapsed < STALE_CLAIM_MS) {
          // Recent claim by another request — do not compete.
          return { action: "already_claimed" as const, profile: data };
        }
        // Stale claim — fall through to reclaim below.
      }

      // ---- Claim the send operation atomically ----
      const now = new Date().toISOString();
      const updates: Record<string, unknown> = {
        welcomeEmailStatus: "sending",
        welcomeEmailStatusUpdatedAt: now,
        updatedAt: now,
      };

      // Sync emailVerified to Firestore if not already set.
      if (data.emailVerified !== true) {
        updates.emailVerified = true;
      }

      t.update(studentRef, updates);

      return { action: "claimed" as const, profile: data };
    });

    // ---- 4. If we claimed the send, call Brevo ----
    if (transactionResult.action === "claimed") {
      // Wrap in try/catch: email delivery failure must never affect authentication.
      try {
        const templateId = Number(
          process.env.BREVO_WELCOME_TEMPLATE_ID ??
            process.env.BREVO_TEMPLATE_ID ??
            1,
        );

        const recipientName =
          (transactionResult.profile.fullName as string) ?? "Student";

        // Safe log — UID + email domain only, no secrets.
        const emailDomain = email.split("@")[1] ?? "unknown";
        console.info(
          `[welcome-email] Attempting send. uid=${uid} domain=@${emailDomain} templateId=${templateId}`,
        );

        const result = await sendBrevoTemplateEmail({
          to: { email, name: recipientName },
          templateId,
          params: {
            name: recipientName,
            email,
          },
        });

        const now = new Date().toISOString();

        if (result.success) {
          // ---- 5a. Brevo accepted — mark "sent" ----
          try {
            await studentRef.update({
              welcomeEmailStatus: "sent",
              welcomeEmailStatusUpdatedAt: now,
              updatedAt: now,
            });
          } catch (updateErr) {
            // If this write fails, state stays "sending" → stale timeout → retry.
            // Worst case: one duplicate welcome email (at-least-once guarantee).
            console.error(
              `[welcome-email] Failed to record sent status (will be retried via stale timeout). uid=${uid}`,
              updateErr instanceof Error ? updateErr.message : String(updateErr),
            );
          }
          console.info(
            `[welcome-email] Welcome email sent successfully. uid=${uid} messageId=${result.messageId ?? "unknown"}`,
          );
        } else {
          // ---- 5b. Brevo failed — reset to "pending" for retry ----
          try {
            await studentRef.update({
              welcomeEmailStatus: "pending",
              welcomeEmailStatusUpdatedAt: now,
              updatedAt: now,
            });
          } catch (updateErr) {
            // If this write fails, state stays "sending" → stale timeout → retry.
            console.error(
              `[welcome-email] Failed to reset to pending (will be retried via stale timeout). uid=${uid}`,
              updateErr instanceof Error ? updateErr.message : String(updateErr),
            );
          }
          console.warn(
            `[welcome-email] Brevo send failed, reset to pending for retry. uid=${uid} error=${result.error}`,
          );
        }
      } catch (emailErr) {
        // Brevo call or post-Brevo Firestore update threw unexpectedly.
        // State may be stuck as "sending" → stale timeout will allow retry.
        console.error(
          `[welcome-email] Email delivery error (will be retried via stale timeout). uid=${uid}`,
          emailErr instanceof Error ? emailErr.message : String(emailErr),
        );
      }
    }

    // ---- 6. Always return success for the verification sync ----
    // The welcome-email delivery state is independent of the auth response.
    return NextResponse.json({
      success: true,
      alreadyVerified: transactionResult.action === "already_sent",
    });
  } catch (error) {
    console.error("[welcome-email] Error:", error);
    if (error instanceof Error && error.message === "STUDENT_NOT_FOUND") {
      return NextResponse.json(
        { error: "Student profile not found" },
        { status: 404 },
      );
    }
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
