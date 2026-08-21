"use client";

import { useEffect, useState } from "react";
import QRCode from "qrcode";

/**
 * Renders a real, high-error-correction QR code that encodes the certificate's
 * verification URL. Error correction level "H" (30%) keeps it scannable even
 * with the quiet zone tight or slight print degradation. Rendered as a crisp
 * data-URL <img> so it works identically on screen and in print/PDF.
 */
export function CertificateQRCode({ url, size = 96, className }: { url: string; size?: number; className?: string }) {
  const [dataUrl, setDataUrl] = useState<string>("");

  useEffect(() => {
    let active = true;
    QRCode.toDataURL(url, {
      errorCorrectionLevel: "H",
      margin: 2, // quiet zone
      scale: 8, // high resolution for print
      color: { dark: "#0f172a", light: "#ffffff" },
    })
      .then((d) => { if (active) setDataUrl(d); })
      .catch(() => { if (active) setDataUrl(""); });
    return () => { active = false; };
  }, [url]);

  return (
    <div className={className} style={{ width: size, height: size }}>
      {dataUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={dataUrl} alt="Certificate verification QR code" width={size} height={size} style={{ display: "block", width: size, height: size }} />
      ) : (
        <div style={{ width: size, height: size }} className="animate-pulse rounded bg-neutral-200" aria-hidden />
      )}
    </div>
  );
}
