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

export interface SendBrevoEmailOptions {
  to: BrevoRecipient;
  templateId?: number;
  subject?: string;
  htmlContent?: string;
  textContent?: string;
  params?: Record<string, string | number>;
}

export type SendBrevoTemplateEmailOptions = SendBrevoEmailOptions;

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
 * Send a transactional email using a Brevo template or direct HTML content.
 *
 * Returns a typed result — never throws. Callers decide whether to treat email
 * failure as fatal or non-fatal.
 */
export async function sendBrevoEmail(
  opts: SendBrevoEmailOptions,
): Promise<BrevoResult> {
  // --- 1. Validate recipient email ---
  if (!opts.to.email || !isValidEmail(opts.to.email)) {
    const msg = `Invalid recipient email.`;
    console.warn(`${logPrefix()} ${msg}`);
    return { success: false, error: msg };
  }

  // --- 2. Validate template ID or HTML content ---
  const hasTemplate = typeof opts.templateId === "number" && opts.templateId > 0;
  const hasDirectHtml = Boolean(opts.subject && opts.htmlContent);

  if (!hasTemplate && !hasDirectHtml) {
    const msg = `Either valid templateId or (subject and htmlContent) must be provided.`;
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
  const senderEmail = process.env.BREVO_SENDER_EMAIL?.trim() || "internships@kicktotech.in";
  const senderName = process.env.BREVO_SENDER_NAME?.trim() || "KICK To TECH";
  if (!senderEmail) {
    const msg = "BREVO_SENDER_EMAIL is not configured. Skipping email.";
    console.warn(`${logPrefix()} ${msg}`);
    return { success: false, error: msg };
  }

  // --- 5. Build the request body ---
  const body: Record<string, unknown> = {
    sender: { email: senderEmail, name: senderName },
    to: [{ email: opts.to.email, ...(opts.to.name ? { name: opts.to.name } : {}) }],
  };

  if (hasTemplate) {
    body.templateId = opts.templateId;
    if (opts.params && Object.keys(opts.params).length > 0) {
      body.params = opts.params;
    }
  } else {
    body.subject = opts.subject;
    body.htmlContent = opts.htmlContent;
    if (opts.textContent) {
      body.textContent = opts.textContent;
    }
  }

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
      `${logPrefix()} Email sent successfully. ${opts.templateId ? `templateId=${opts.templateId}` : `subject=${opts.subject}`} messageId=${result.messageId ?? "unknown"}`,
    );

    return { success: true, messageId: result.messageId };
  } catch (err) {
    // Network error or other fetch failure.
    const msg = `Network error sending Brevo email: ${err instanceof Error ? err.message : String(err)}`;
    console.error(`${logPrefix()} ${msg}`);
    return { success: false, error: msg };
  }
}

/** Backward-compatible alias for existing template callers. */
export const sendBrevoTemplateEmail = sendBrevoEmail;

/**
 * Sends a password reset email with a secure time-limited link.
 * Supports custom Brevo Template ID if configured, or falls back to
 * a responsive Kick To Tech styled HTML email.
 */
export async function sendPasswordResetEmail(opts: {
  to: BrevoRecipient;
  resetUrl: string;
}): Promise<BrevoResult> {
  const customTemplateId = process.env.BREVO_RESET_PASSWORD_TEMPLATE_ID
    ? Number(process.env.BREVO_RESET_PASSWORD_TEMPLATE_ID)
    : undefined;

  const recipientName = opts.to.name?.trim() || "Student";

  if (customTemplateId && Number.isFinite(customTemplateId) && customTemplateId > 0) {
    return sendBrevoEmail({
      to: opts.to,
      templateId: customTemplateId,
      params: {
        name: recipientName,
        resetUrl: opts.resetUrl,
      },
    });
  }

  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset Your Kick To Tech Password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #050814; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #050814; padding: 40px 10px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="max-width: 560px; background-color: #0a0f24; border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);">
          <tr>
            <td style="padding: 32px 32px 20px 32px; text-align: center; border-bottom: 1px solid rgba(255, 255, 255, 0.06);">
              <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px; color: #ffffff;">
                KICK <span style="color: #38bdf8;">TO</span> TECH
              </h1>
              <p style="margin: 6px 0 0 0; font-size: 13px; color: #94a3b8; letter-spacing: 0.5px; text-transform: uppercase;">Password Reset Request</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #e2e8f0;">
                Hello <strong>${recipientName}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 24px; color: #94a3b8;">
                We received a request to reset the password for your Kick To Tech account. Click the button below to choose a new password:
              </p>
              <table role="presentation" border="0" cellspacing="0" cellpadding="0" style="margin: 0 auto 28px auto;">
                <tr>
                  <td align="center" style="border-radius: 10px; background: linear-gradient(135deg, #0284c7 0%, #2563eb 100%);">
                    <a href="${opts.resetUrl}" target="_blank" style="display: inline-block; padding: 14px 32px; font-size: 15px; font-weight: 700; color: #ffffff; text-decoration: none; border-radius: 10px;">
                      Reset Password
                    </a>
                  </td>
                </tr>
              </table>
              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 20px; color: #64748b; text-align: center;">
                This link will expire in <strong>1 hour</strong>.
              </p>
              <p style="margin: 0 0 24px 0; font-size: 13px; line-height: 20px; color: #64748b; text-align: center;">
                If you did not request this, you can safely ignore this email. Your password will remain unchanged.
              </p>
              <div style="border-top: 1px solid rgba(255, 255, 255, 0.08); padding-top: 20px;">
                <p style="margin: 0; font-size: 12px; line-height: 18px; color: #475569; word-break: break-all;">
                  Button not working? Copy and paste this link into your browser:<br>
                  <a href="${opts.resetUrl}" style="color: #38bdf8; text-decoration: underline;">${opts.resetUrl}</a>
                </p>
              </div>
            </td>
          </tr>
          <tr>
            <td style="padding: 20px 32px; background-color: #070b1a; text-align: center; border-top: 1px solid rgba(255, 255, 255, 0.06);">
              <p style="margin: 0; font-size: 12px; color: #64748b;">
                © ${new Date().getFullYear()} KICK TO TECH. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return sendBrevoEmail({
    to: opts.to,
    subject: "Reset your Kick To Tech Password",
    htmlContent,
    textContent: `Hello ${recipientName},\n\nWe received a request to reset your password. Use the link below to set a new password:\n\n${opts.resetUrl}\n\nThis link will expire in 1 hour.\n\nIf you did not make this request, you can safely ignore this email.`,
  });
}
