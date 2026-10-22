import { NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/server/payments/razorpay";
import { handleRazorpayWebhookEvent } from "@/server/hackathonApplications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Public: Razorpay Webhook Endpoint.
 *
 * Configured in Razorpay Dashboard:
 * URL: https://www.kicktotech.in/api/v1/webhooks/razorpay
 * Secret: Matching RAZORPAY_WEBHOOK_SECRET in Vercel environment variables.
 *
 * Supported events:
 * - payment.captured
 * - order.paid
 * - payment.failed
 *
 * Security:
 * - Strictly verifies X-Razorpay-Signature using raw request text before parsing JSON.
 * - Idempotent event processing prevents duplicate transitions or emails.
 * - Never leaks secrets or sensitive payloads in response.
 */
export async function POST(req: Request): Promise<NextResponse> {
  const signature = req.headers.get("x-razorpay-signature")?.trim();

  if (!signature) {
    console.warn("[webhook] Missing X-Razorpay-Signature header.");
    return NextResponse.json(
      { success: false, error: "Missing signature header." },
      { status: 400 },
    );
  }

  // Read raw body as text for exact byte-matching HMAC verification
  const rawBody = await req.text();

  const isValid = verifyWebhookSignature({ rawBody, signature });
  if (!isValid) {
    console.warn("[webhook] Invalid X-Razorpay-Signature.");
    return NextResponse.json(
      { success: false, error: "Invalid webhook signature." },
      { status: 400 },
    );
  }

  let eventPayload: { event?: string; payload?: Record<string, unknown> };
  try {
    eventPayload = JSON.parse(rawBody);
  } catch {
    console.warn("[webhook] Failed to parse webhook JSON payload.");
    return NextResponse.json(
      { success: false, error: "Invalid request payload." },
      { status: 400 },
    );
  }

  const event = eventPayload.event;
  const payload = eventPayload.payload;

  if (!event || !payload) {
    return NextResponse.json(
      { success: false, error: "Incomplete event payload." },
      { status: 400 },
    );
  }

  try {
    const result = await handleRazorpayWebhookEvent(event, payload);
    return NextResponse.json(
      { success: true, status: "ok", result },
      { status: 200 },
    );
  } catch (err) {
    console.error("[webhook] Error processing webhook event:", err);
    // Return 500 so Razorpay knows to retry if a transient error occurs
    return NextResponse.json(
      { success: false, error: "Failed to process event." },
      { status: 500 },
    );
  }
}
