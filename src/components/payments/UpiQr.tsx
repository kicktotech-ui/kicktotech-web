"use client";

/**
 * PAYMENT QR — encodes a UPI deep-link (upi://pay?...). This is completely
 * separate from the certificate verification QR. It only helps the user pay;
 * it does NOT confirm payment.
 */
export function UpiQr({ upiUri, size = 240 }: { upiUri: string; size?: number }) {
  return (
    <div className="mx-auto rounded-2xl bg-white p-3 shadow-sm" style={{ width: size + 24, height: size + 24 }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/images/DOPAYMENT.png" alt="UPI payment QR code" width={size} height={size} style={{ width: size, height: size, display: "block" }} />
    </div>
  );
}
