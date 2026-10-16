/**
 * Manual UPI + WhatsApp payment configuration.
 *
 * This is NOT a payment gateway. There is no order/webhook/signature. The UPI
 * ID + WhatsApp number are operational config (not secrets) and are read from
 * the environment so nothing is hardcoded. Safe placeholder defaults keep local
 * dev working; real values are supplied later via .env.local.
 */

export interface PaymentConfig {
  upiId: string;
  payeeName: string;
  amount: number;
  currency: "INR";
  whatsappNumber: string; // digits only, incl. country code (no +)
  note: string;
  messageTemplate: string; // supports {name} {domain} {applicationId} {amount}
}

export function getPaymentConfig(): PaymentConfig {
  return {
    upiId: process.env.PAYMENT_UPI_ID?.trim() || "example@upi",
    payeeName: process.env.PAYMENT_PAYEE_NAME?.trim() || "Kick To Tech",
    amount: Number(process.env.PAYMENT_AMOUNT ?? 449) || 449,
    currency: "INR",
    whatsappNumber: (process.env.PAYMENT_WHATSAPP_NUMBER ?? "").replace(/[^\d]/g, ""),
    note: process.env.PAYMENT_NOTE?.trim() || "Kick To Tech certificate processing fee",
    messageTemplate:
      process.env.PAYMENT_WHATSAPP_TEMPLATE?.trim() ||
      "Hello, I have completed the certificate payment.\n\nName: {name}\nDomain: {domain}\nApplication ID: {applicationId}\nAmount: ₹{amount}\n\nI am sending my payment proof for verification.",
  };
}

/** Build a standard UPI deep-link URI (upi://pay?...) for QR encoding. */
export function buildUpiUri(cfg: PaymentConfig, opts?: { note?: string }): string {
  const params = new URLSearchParams({
    pa: cfg.upiId,
    pn: cfg.payeeName,
    am: String(cfg.amount),
    cu: cfg.currency,
    tn: opts?.note ?? cfg.note,
  });
  return `upi://pay?${params.toString()}`;
}

/** Build a wa.me deep link with a pre-filled, URL-encoded message. */
export function buildWhatsappUrl(cfg: PaymentConfig, vars: { name: string; domain: string; applicationId: string }): string | null {
  if (!cfg.whatsappNumber) return null;
  const msg = cfg.messageTemplate
    .replaceAll("{name}", vars.name)
    .replaceAll("{domain}", vars.domain)
    .replaceAll("{applicationId}", vars.applicationId)
    .replaceAll("{amount}", String(cfg.amount));
  return `https://wa.me/${cfg.whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

/** Public-safe payment view returned to the client (no secrets involved). */
export interface PublicPaymentInfo {
  upiId: string;
  payeeName: string;
  amount: number;
  currency: string;
  upiUri: string;
  whatsappNumber: string;
  whatsappConfigured: boolean;
}

export function publicPaymentInfo(cfg = getPaymentConfig()): PublicPaymentInfo {
  return {
    upiId: cfg.upiId,
    payeeName: cfg.payeeName,
    amount: cfg.amount,
    currency: cfg.currency,
    upiUri: buildUpiUri(cfg),
    whatsappNumber: cfg.whatsappNumber,
    whatsappConfigured: Boolean(cfg.whatsappNumber),
  };
}
