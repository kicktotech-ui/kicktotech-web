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
 * Fetch authoritative order details from Razorpay API.
 *
 * Distinguishes between:
 *  - Confirmed missing or invalid (HTTP 404 / 400) -> returns null
 *  - Transient / Inconclusive gateway errors (429 / 5xx / network drop) -> throws AppError
 */
export async function fetchRazorpayOrder(
  orderId: string,
): Promise<RazorpayOrderResult | null> {
  const { keyId, keySecret } = getRazorpayConfig();

  let res: Response;
  try {
    res = await fetch(`${RAZORPAY_API_BASE}/orders/${encodeURIComponent(orderId)}`, {
      method: "GET",
      headers: {
        Authorization: basicAuthHeader(keyId, keySecret),
      },
    });
  } catch (netErr) {
    console.error(`[razorpay] Network failure while verifying order ${orderId}:`, netErr);
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Payment gateway is temporarily unreachable. Please try again shortly.",
      { cause: "NETWORK_ERROR" },
    );
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as {
      error?: { code?: string; description?: string; field?: string };
    } | null;
    const errCode = (errBody?.error?.code || "").toUpperCase();
    const errDesc = (errBody?.error?.description || "").toLowerCase();

    // 1. Authoritative 404 (Not Found) -> order confirmed nonexistent on Razorpay
    if (res.status === 404) {
      console.warn(`[razorpay] Order ${orderId} authoritatively confirmed nonexistent (404): ${errBody?.error?.description || "Not Found"}`);
      return null;
    }

    // 2. HTTP 400 (Bad Request) -> inspect body; only treat as unusable if explicitly confirmed missing
    if (res.status === 400) {
      const isConfirmedNonexistent =
        errDesc.includes("does not exist") ||
        errDesc.includes("order not found") ||
        errCode === "BAD_REQUEST_ORDER_NOT_FOUND" ||
        errCode === "INVALID_ORDER_ID";

      if (isConfirmedNonexistent) {
        console.warn(`[razorpay] Order ${orderId} authoritatively confirmed invalid by Razorpay (400): ${errDesc}`);
        return null;
      }

      // If HTTP 400 is due to authentication, invalid credentials, or header/config issues
      const isAuthOrConfigError =
        errDesc.includes("auth") ||
        errDesc.includes("key") ||
        errDesc.includes("secret") ||
        errDesc.includes("unauthorized") ||
        errCode.includes("AUTH");

      if (isAuthOrConfigError) {
        console.error(`[razorpay] Gateway client/auth configuration error (400) checking order ${orderId}:`, errBody?.error);
        throw new AppError(
          "SERVER_ERROR",
          "Payment service configuration error. Please contact administrator.",
          { cause: "AUTH_CONFIG_ERROR", details: errBody?.error },
        );
      }

      // Other inconclusive 400 errors (malformed request, unexpected parameter) -> DO NOT create replacement order
      console.error(`[razorpay] Inconclusive bad request error (400) checking order ${orderId}:`, errBody?.error);
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Payment service could not verify order details. Please try again shortly.",
        { cause: "INCONCLUSIVE_BAD_REQUEST", details: errBody?.error },
      );
    }

    // 3. HTTP 401 / 403 -> Authentication / Permission error
    if (res.status === 401 || res.status === 403) {
      console.error(`[razorpay] Gateway authentication failure (${res.status}) checking order ${orderId}:`, errBody?.error);
      throw new AppError(
        "SERVER_ERROR",
        "Payment gateway authentication failure. Please contact administrator.",
        { cause: "AUTH_FAILURE", status: res.status },
      );
    }

    // 4. HTTP 429 -> Rate Limited
    if (res.status === 429) {
      console.warn(`[razorpay] Rate limit reached checking order ${orderId}`);
      throw new AppError(
        "RATE_LIMITED",
        "Payment gateway rate limit reached. Please try again shortly.",
        { cause: "RATE_LIMITED" },
      );
    }

    // 5. HTTP 5xx -> Upstream Razorpay server or gateway error (Inconclusive)
    if (res.status >= 500) {
      console.error(`[razorpay] Upstream gateway error (${res.status}) checking order ${orderId}:`, errBody?.error);
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Payment gateway is temporarily experiencing issues. Please try again in a moment.",
        { cause: "GATEWAY_ERROR", status: res.status },
      );
    }

    // Any other inconclusive non-ok status
    console.error(`[razorpay] Inconclusive status (${res.status}) checking order ${orderId}:`, errBody?.error);
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Payment service could not verify order status. Please try again shortly.",
      { cause: "INCONCLUSIVE_STATUS", status: res.status },
    );
  }

  const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
  if (!data?.id) {
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Invalid response received from payment gateway.",
      { cause: "INVALID_GATEWAY_RESPONSE" },
    );
  }

  return {
    id: data.id as string,
    amount: Number(data.amount),
    currency: (data.currency as string) || "INR",
    receipt: (data.receipt as string) || "",
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
 *
 * Distinguishes between:
 *  - Confirmed missing (HTTP 404 / 400) -> returns null
 *  - Transient / Inconclusive gateway errors (429 / 5xx / network drop) -> throws AppError
 */
export async function fetchRazorpayPayment(
  paymentId: string,
): Promise<RazorpayPaymentDetails | null> {
  const { keyId, keySecret } = getRazorpayConfig();

  let res: Response;
  try {
    res = await fetch(`${RAZORPAY_API_BASE}/payments/${encodeURIComponent(paymentId)}`, {
      method: "GET",
      headers: {
        Authorization: basicAuthHeader(keyId, keySecret),
      },
    });
  } catch (netErr) {
    console.error(`[razorpay] Network failure while verifying payment ${paymentId}:`, netErr);
    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Payment gateway is temporarily unreachable. Please try again shortly.",
      { cause: "NETWORK_ERROR" },
    );
  }

  if (!res.ok) {
    const errBody = (await res.json().catch(() => null)) as {
      error?: { code?: string; description?: string };
    } | null;
    const errCode = (errBody?.error?.code || "").toUpperCase();
    const errDesc = (errBody?.error?.description || "").toLowerCase();

    if (res.status === 404) {
      console.warn(`[razorpay] Payment ${paymentId} authoritatively confirmed nonexistent (404).`);
      return null;
    }

    if (res.status === 400) {
      const isConfirmedNonexistent =
        errDesc.includes("does not exist") ||
        errDesc.includes("payment not found") ||
        errCode === "BAD_REQUEST_PAYMENT_NOT_FOUND" ||
        errCode === "INVALID_PAYMENT_ID";

      if (isConfirmedNonexistent) {
        console.warn(`[razorpay] Payment ${paymentId} confirmed nonexistent (400): ${errDesc}`);
        return null;
      }

      console.error(`[razorpay] Bad request error (400) checking payment ${paymentId}:`, errBody?.error);
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Payment service could not verify payment details. Please try again shortly.",
        { cause: "INCONCLUSIVE_BAD_REQUEST", details: errBody?.error },
      );
    }

    if (res.status === 401 || res.status === 403) {
      throw new AppError(
        "SERVER_ERROR",
        "Payment gateway authentication failure. Please contact administrator.",
        { cause: "AUTH_FAILURE", status: res.status },
      );
    }

    if (res.status === 429) {
      throw new AppError(
        "RATE_LIMITED",
        "Payment gateway rate limit reached. Please try again shortly.",
        { cause: "RATE_LIMITED" },
      );
    }

    if (res.status >= 500) {
      console.error(`[razorpay] Upstream gateway error (${res.status}) checking payment ${paymentId}`);
      throw new AppError(
        "SERVICE_UNAVAILABLE",
        "Payment gateway is temporarily experiencing issues. Please try again in a moment.",
        { cause: "GATEWAY_ERROR", status: res.status },
      );
    }

    throw new AppError(
      "SERVICE_UNAVAILABLE",
      "Payment service could not verify payment status. Please try again shortly.",
      { cause: "INCONCLUSIVE_STATUS", status: res.status },
    );
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
