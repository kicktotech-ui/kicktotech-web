import { createHmac, timingSafeEqual } from "node:crypto";
import { AppError } from "../http";

/**
 * Razorpay Payment Gateway integration (server-side only).
 *
 * Implements server-side order creation, payment signature verification,
 * webhook signature verification, and authoritative payment status retrieval.
 *
 * SECURITY:
 * - RAZORPAY_KEY_SECRET and RAZORPAY_WEBHOOK_SECRET are NEVER exposed to clients or logged.
 * - Only RAZORPAY_KEY_ID is exposed to the browser when required by Checkout.
 * - Signatures are verified using constant-time timingSafeEqual.
 */

const RAZORPAY_API_BASE = "https://api.razorpay.com/v1";

export interface RazorpayConfig {
  keyId: string;
  keySecret: string;
  webhookSecret?: string;
}

/** Check and retrieve Razorpay credentials lazily at request time. */
export function getRazorpayConfig(): RazorpayConfig {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim();
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim();
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim();

  if (!keyId || !keySecret) {
    console.error(
      `[razorpay] Missing required credentials: ${[
        !keyId ? "RAZORPAY_KEY_ID" : null,
        !keySecret ? "RAZORPAY_KEY_SECRET" : null,
      ]
        .filter(Boolean)
        .join(", ")}`,
    );
    throw new AppError("SERVER_ERROR", "Payment service is currently unavailable.");
  }

  return { keyId, keySecret, webhookSecret };
}

/** Check whether Razorpay credentials exist without throwing or leaking values. */
export function checkRazorpayConfig(): {
  keyIdConfigured: boolean;
  keySecretConfigured: boolean;
  webhookSecretConfigured: boolean;
} {
  return {
    keyIdConfigured: Boolean(process.env.RAZORPAY_KEY_ID?.trim()),
    keySecretConfigured: Boolean(process.env.RAZORPAY_KEY_SECRET?.trim()),
    webhookSecretConfigured: Boolean(process.env.RAZORPAY_WEBHOOK_SECRET?.trim()),
  };
}

function basicAuthHeader(keyId: string, keySecret: string): string {
  return `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`;
}

export interface CreateOrderParams {
  applicationId: string;
  amountPaise: number;
  currency?: string;
  notes?: Record<string, string>;
}

export interface RazorpayOrderResult {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

/**
 * Create a Razorpay Order via the official Orders API.
 * The amount and currency must be strictly enforced server-side.
 */
export async function createRazorpayOrder(
  params: CreateOrderParams,
): Promise<RazorpayOrderResult> {
  const { keyId, keySecret } = getRazorpayConfig();
  const currency = params.currency ?? "INR";

  const res = await fetch(`${RAZORPAY_API_BASE}/orders`, {
    method: "POST",
    headers: {
      Authorization: basicAuthHeader(keyId, keySecret),
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount: params.amountPaise,
      currency,
      receipt: params.applicationId,
      notes: {
        applicationId: params.applicationId,
        ...(params.notes ?? {}),
      },
    }),
  });

  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;

  if (!res.ok || !data?.id) {
    const errorDetails = data?.error as Record<string, unknown> | undefined;
    console.error(
      `[razorpay] Order creation failed (${res.status}): ${
        (errorDetails?.description as string) || "Unknown error"
      }`,
    );
    throw new AppError("SERVER_ERROR", "Could not create payment order. Please try again.");
  }

  return {
    id: data.id as string,
    amount: Number(data.amount),
    currency: (data.currency as string) || currency,
    receipt: (data.receipt as string) || params.applicationId,
    status: (data.status as string) || "created",
  };
}

/**
 * Constant-time payment signature verification for Razorpay Standard Checkout.
 * Signature payload is `${razorpay_order_id}|${razorpay_payment_id}`.
 */
export function verifyPaymentSignature(opts: {
  orderId: string;
  paymentId: string;
  signature: string;
}): boolean {
  const { keySecret } = getRazorpayConfig();
  const text = `${opts.orderId.trim()}|${opts.paymentId.trim()}`;
  const expected = createHmac("sha256", keySecret).update(text).digest("hex");

  try {
    const a = Buffer.from(opts.signature.trim(), "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || a.length === 0) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Constant-time webhook signature verification.
 * Compares raw body HMAC-SHA256 with the X-Razorpay-Signature header.
 */
export function verifyWebhookSignature(opts: {
  rawBody: string;
  signature: string;
}): boolean {
  const { webhookSecret } = getRazorpayConfig();
  if (!webhookSecret) {
    console.error("[razorpay] RAZORPAY_WEBHOOK_SECRET is not configured.");
    return false;
  }

  const expected = createHmac("sha256", webhookSecret).update(opts.rawBody).digest("hex");

  try {
    const a = Buffer.from(opts.signature.trim(), "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || a.length === 0) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export interface RazorpayPaymentDetails {
  id: string;
  orderId: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method?: string;
  email?: string;
  contact?: string;
  notes?: Record<string, string>;
}

/**
 * Fetch authoritative payment details from Razorpay API.
 */
export async function fetchRazorpayPayment(
  paymentId: string,
): Promise<RazorpayPaymentDetails | null> {
  const { keyId, keySecret } = getRazorpayConfig();

  const res = await fetch(`${RAZORPAY_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
    method: "GET",
    headers: {
      Authorization: basicAuthHeader(keyId, keySecret),
    },
  });

  if (!res.ok) {
    console.warn(`[razorpay] Failed to fetch payment ${paymentId}: ${res.status}`);
    return null;
  }

  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data?.id) return null;

  return {
    id: data.id as string,
    orderId: (data.order_id as string) || "",
    amount: Number(data.amount),
    currency: (data.currency as string) || "INR",
    status: data.status as RazorpayPaymentDetails["status"],
    method: data.method as string | undefined,
    email: data.email as string | undefined,
    contact: data.contact as string | undefined,
    notes: data.notes as Record<string, string> | undefined,
  };
}
