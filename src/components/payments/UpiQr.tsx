"use client";

/**
 * PAYMENT QR — displays the supplied UPI payment QR image exactly as provided
 * (BHIM/UPI QR for the ₹449 internship fee). This is completely separate from
 * the certificate verification QR. It only helps the user pay; it does NOT
 * confirm payment. The image is shown verbatim — no crop, stretch, or recolor.
 *
 * `upiUri` is accepted for backward compatibility with existing callers but is
 * no longer used to generate a code — the real QR image is the source of truth.
 */
export function UpiQr({ size = 280 }: { upiUri?: string; size?: number }) {
  return (
    <div className="mx-auto w-fit rounded-2xl bg-white p-3 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/QR449.png"
        alt="UPI payment QR code for the ₹449 internship fee — scan and pay with any UPI app"
        style={{ width: size, height: "auto", display: "block" }}
      />
    </div>
  );
}
