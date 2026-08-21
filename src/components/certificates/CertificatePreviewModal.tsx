"use client";

import { useEffect, useState } from "react";
import { Loader2, ExternalLink, Download, Copy, ShieldAlert } from "lucide-react";
import { Modal } from "@/components/admin/overlays";
import { Button } from "@/components/admin/ui";
import { api } from "@/lib/api";
import { CertificateRenderer, CertificateScaler } from "./CertificateRenderer";
import { CertificatePrintLayer } from "./CertificatePrintLayer";
import type { CertificateData } from "@/lib/certificates/types";
import {
  resolveMentorForDomain, AUTHORIZED_SIGNATORIES, DOMAIN_META, normalizeCertificateDomain,
} from "@/lib/certificates/mentors";

interface VerifyResponse {
  found: boolean; valid?: boolean; status?: string;
  certificateId?: string; recipientName?: string; program?: string; domain?: string;
  grade?: string; durationLabel?: string; issuedAt?: string; mentorName?: string;
  mentorDesignation?: string; verificationUrl?: string;
}

/**
 * Real-time certificate viewer. Given a certificate ID, it queries the REAL
 * backend verify endpoint (works for legacy Firestore certs AND newly issued
 * ones) and renders the actual credential with the existing renderer. The
 * mentor signature is resolved from the domain registry for display.
 */
export function CertificatePreviewModal({ open, certificateId, onClose }: { open: boolean; certificateId: string | null; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CertificateData | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!open || !certificateId) return;
    let active = true;
    setLoading(true); setData(null); setNotFound(false);
    (async () => {
      try {
        const r = await api.get<VerifyResponse>(`/certificates/verify/${encodeURIComponent(certificateId)}`);
        if (!active) return;
        if (!r.found) { setNotFound(true); return; }
        const domain = normalizeCertificateDomain(r.domain);
        const mentor = resolveMentorForDomain(domain);
        setData({
          recipientName: r.recipientName || "—",
          program: r.program || DOMAIN_META[domain].program,
          domainLabel: DOMAIN_META[domain].label,
          grade: r.grade,
          certificateId: r.certificateId || certificateId,
          issuedDateLabel: r.issuedAt ? new Date(r.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—",
          durationLabel: r.durationLabel,
          mentor: mentor ? { name: r.mentorName || mentor.name, designation: r.mentorDesignation || mentor.designation, signatureAsset: mentor.signatureAsset } : null,
          signatories: AUTHORIZED_SIGNATORIES.map((s) => ({ name: s.name, designation: s.designation, signatureAsset: s.signatureAsset })),
          verificationUrl: r.verificationUrl || `${typeof window !== "undefined" ? window.location.origin : ""}/verify_cert?cert=${encodeURIComponent(certificateId)}`,
          isPreview: false,
        });
      } catch {
        if (active) setNotFound(true);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [open, certificateId]);

  function copyId() {
    if (!certificateId) return;
    navigator.clipboard?.writeText(certificateId).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  }

  return (
    <Modal open={open} onClose={onClose} title={certificateId ? `Certificate ${certificateId}` : "Certificate"} size="lg"
      footer={data ? (
        <>
          <Button variant="secondary" onClick={copyId}><Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy ID"}</Button>
          <Button variant="secondary" onClick={() => window.open(data.verificationUrl, "_blank")}><ExternalLink className="h-4 w-4" /> Open verification</Button>
          <Button variant="primary" onClick={() => window.print()}><Download className="h-4 w-4" /> Download PDF</Button>
        </>
      ) : undefined}
    >
      {loading && (
        <div className="flex items-center justify-center py-16 text-adm-muted"><Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading certificate…</div>
      )}
      {notFound && !loading && (
        <div className="flex flex-col items-center py-16 text-center">
          <ShieldAlert className="h-10 w-10 text-red-500" />
          <p className="mt-3 text-sm font-semibold text-adm-fg">Certificate not found</p>
          <p className="mt-1 text-sm text-adm-muted">This ID could not be verified against the records.</p>
        </div>
      )}
      {data && !loading && (
        <>
          <CertificateScaler>
            <CertificateRenderer data={data} template="classic" />
          </CertificateScaler>
          <CertificatePrintLayer data={data} template="classic" />
        </>
      )}
    </Modal>
  );
}
