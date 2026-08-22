/**
 * KICK TO TECH — Brevo transactional email service (server-side only).
 *
 * Sends template-based transactional emails via the Brevo HTTP API.
 * All secrets are read lazily from process.env at call time — never at import
 * or build time — so `next build` never fails when env vars are absent.
 *
 * SECURITY:
 * - BREVO_API_KEY is NEVER logged, returned to clients, or exposed.
 * - Sender identity always comes from environment variables, never from
 *   client-provided data.
 * - This module never throws; failures are returned as typed result objects
 *   so callers can decide whether email failure is fatal.
 */

const BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

// ---------------------------------------------------------------------------
// Public types
// ---------------------------------------------------------------------------

export interface BrevoResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface BrevoRecipient {
  email: string;
  name?: string;
}

export interface SendBrevoTemplateEmailOptions {
  to: BrevoRecipient;
  templateId: number;
  params?: Record<string, string | number>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Basic RFC-5322-ish email check (same pattern used elsewhere in the project). */
function isValidEmail(email: string): boolean {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
}

/** Safe log prefix — never includes secrets or PII. */
function logPrefix(): string {
  return `[brevo]`;
}

// ---------------------------------------------------------------------------
// Main function
// ---------------------------------------------------------------------------

/**
 * Send a transactional email using a Brevo template.
 *
 * Returns a typed result — never throws. Callers decide whether to treat email
 * failure as fatal or non-fatal.
 */
export async function sendBrevoTemplateEmail(
  opts: SendBrevoTemplateEmailOptions,
): Promise<BrevoResult> {
  // --- 1. Validate recipient email ---
  if (!opts.to.email || !isValidEmail(opts.to.email)) {
    const msg = `Invalid recipient email.`;
    console.warn(`${logPrefix()} ${msg}`);
    return { success: false, error: msg };
  }

  // --- 2. Validate template ID ---
  if (!Number.isFinite(opts.templateId) || opts.templateId < 1) {
    const msg = `Invalid template ID: ${opts.templateId}`;
    console.warn(`${logPrefix()} ${msg}`);
    return { success: false, error: msg };
  }

  // --- 3. Verify API key exists ---
  const apiKey = process.env.BREVO_API_KEY?.trim();
  if (!apiKey) {
    const msg = "BREVO_API_KEY is not configured. Skipping email.";
    console.warn(`${logPrefix()} ${msg}`);
    return { success: false, error: msg };
  }

  // --- 4. Verify sender email exists ---
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim();
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "KICK To TECH";
  if (!senderEmail) {
    const msg = "BREVO_SENDER_EMAIL is not configured. Skipping email.";
    console.warn(`${logPrefix()} ${msg}`);
    return { success: false, error: msg };
  }

  // --- 5. Build the request body ---
  const body = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: opts.to.email, ...(opts.to.name ? { name: opts.to.name } : {}) }],
    templateId: opts.templateId,
    ...(opts.params && Object.keys(opts.params).length > 0 ? { params: opts.params } : {}),
  };

  // --- 6. Make the API request ---
  try {
    const response = await fetch(BREVO_API_URL, {
      method: "POST",
      headers: {
        "accept": "application/json",
        "content-type": "application/json",
        "api-key": apiKey,
      },
      body: JSON.stringify(body),
    });

    // --- 7. Handle non-2xx responses ---
    if (!response.ok) {
      let detail = "";
      try {
        const errBody = await response.text();
        // Truncate to avoid logging massive error payloads
        detail = errBody.length > 200 ? errBody.slice(0, 200) + "…" : errBody;
      } catch {
        detail = "(no response body)";
      }
      const msg = `Brevo API error (HTTP ${response.status}): ${detail}`;
      console.error(`${logPrefix()} ${msg}`);
      return { success: false, error: msg };
    }

    // --- 8. Parse success response ---
    let result: { messageId?: string } = {};
    try {
      result = (await response.json()) as { messageId?: string };
    } catch {
      // Non-JSON success response — unusual but not fatal.
    }

    console.info(
      `${logPrefix()} Email sent successfully. templateId=${opts.templateId} messageId=${result.messageId ?? "unknown"}`,
    );

    return { success: true, messageId: result.messageId };
  } catch (err) {
    // Network error or other fetch failure.
    const msg = `Network error sending Brevo email: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`${logPrefix()} ${msg}`);
    return { success: false, error: msg };
  }
}
