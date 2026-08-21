"use client";

import { CertificateRenderer } from "./CertificateRenderer";
import type { CertificateData, CertificateTemplateId } from "@/lib/certificates/types";

/**
 * A full-size (unscaled) certificate that is hidden on screen and revealed only
 * when printing. Combined with the print CSS below, "Download PDF" (browser
 * print → Save as PDF) produces a crisp, VECTOR A4-PORTRAIT document that
 * matches the on-screen preview exactly — not a rasterized screenshot.
 */
export function CertificatePrintLayer({ data, template }: { data: CertificateData; template: CertificateTemplateId }) {
  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
            #ktt-print-layer { position: absolute; left: -100000px; top: 0; }
            @media print {
              @page { size: A4 portrait; margin: 0; }
              html, body { margin: 0 !important; padding: 0 !important; background: #fff !important; }
              body * { visibility: hidden !important; }
              #ktt-print-layer, #ktt-print-layer * { visibility: visible !important; }
              #ktt-print-layer {
                position: fixed !important;
                left: 0 !important;
                top: 0 !important;
                width: 100vw !important;
                height: 100vh !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
              }
              #ktt-print-layer #ktt-certificate {
                width: 210mm !important;
                height: 297mm !important;
              }
            }
          `,
        }}
      />
      <div id="ktt-print-layer" aria-hidden>
        <CertificateRenderer data={data} template={template} />
      </div>
    </>
  );
}
