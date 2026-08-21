"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * PAYMENT QR — encodes a UPI deep-link (upi://pay?...). This is completely
 * separate from the certificate verification QR. It only helps the user pay;
 * it does NOT confirm payment.
 */
export function UpiQr({ upiUri, size = 240 }: { upiUri: string; size?: number }) {
  const [dataUrl, setDataUrl] = useState("");
  useEffect(() => {
    let active = true;
    QRCode.toDataURL(upiUri, { errorCorrectionLevel: "M", margin: 2, scale: 10, color: { dark: "#0b1324", light: "#ffffff" } })
      .then((d) => { if (active) setDataUrl(d); })
      .catch(() => { if (active) setDataUrl(""); });
    return () => { active = false; };
  }, [upiUri]);

  return (
    <div className="mx-auto rounded-2xl bg-white p-3 shadow-sm" style={{ width: size + 24, height: size + 24 }}>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="UPI payment QR code" width={size} height={size} style={{ width: size, height: size, display: "block" }} />
      ) : (
        <div style={{ width: size, height: size }} className="animate-pulse rounded-xl bg-neutral-100" aria-hidden />
      )}
    </div>
  );
}
