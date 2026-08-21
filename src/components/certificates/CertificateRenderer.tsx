"use client";

/* eslint-disable @next/next/no-img-element */
import { useEffect, useRef, useState } from "react";
import { CertificateQRCode } from "./CertificateQRCode";
import { CroppedSignature } from "./CroppedSignature";
import type { CertificateData, CertificateTemplateId } from "@/lib/certificates/types";

/* ============================================================================
   PORTRAIT Certificate Renderer — A4 portrait (210mm × 297mm).
   Ultra-premium, print-ready, corporate institutional design.
   ========================================================================== */

export const CERT_W = 794;
export const CERT_H = 1123;

const LOGO = "/brand/logo.png";

const SERIF = '"Georgia", "Times New Roman", serif';
const SANS = '"Helvetica Neue", "Inter", "Arial", sans-serif';

export function CertificateScaler({ children, className }: { children: React.ReactNode; className?: string }) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const update = () => {
      const scaleW = el.clientWidth / CERT_W;
      const scaleH = el.clientHeight ? el.clientHeight / CERT_H : Infinity;
      setScale(Math.min(1, scaleW, scaleH));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={wrapRef} className={className} style={{ width: "100%" }}>
      <div style={{ height: CERT_H * scale, margin: "0 auto", width: CERT_W * scale }}>
        <div style={{ width: CERT_W, height: CERT_H, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          {children}
        </div>
      </div>
    </div>
  );
}

const GRADE_COLORS: Record<string, { label: string }> = {
  A: { label: "Excellent Performance" },
  B: { label: "Very Good Performance" },
  C: { label: "Good Performance" },
  D: { label: "Satisfactory Performance" },
  F: { label: "Needs Improvement" },
};
function gradeInfo(g?: string) {
  if (!g) return null;
  return GRADE_COLORS[g.toUpperCase()] ?? { label: "Performance Graded" };
}

function nameSize(name: string): number {
  const len = name.length;
  if (len <= 14) return 64;
  if (len <= 20) return 54;
  if (len <= 28) return 44;
  if (len <= 36) return 38;
  return 34;
}

function Signature({ src, name, designation }: { src: string; name: string; designation: string }) {
  return (
    <div style={{ textAlign: "center", width: 170, zIndex: 10 }}>
      <div style={{ height: 65, display: "flex", alignItems: "flex-end", justifyContent: "center", paddingBottom: 8 }}>
        <CroppedSignature src={src} alt={`${name} signature`} style={{ maxHeight: 60, maxWidth: 160, objectFit: "contain" }} />
      </div>
      <div style={{ borderTop: `1.5px solid #0f172a`, paddingTop: 6 }}>
        <div style={{ fontWeight: 700, fontSize: 13.5, fontFamily: SANS, color: "#0f172a" }}>{name}</div>
        <div style={{ fontSize: 9.5, fontFamily: SANS, color: "#475569", marginTop: 3 }}>{designation}</div>
        <div style={{ fontSize: 8, fontFamily: SANS, color: "#94a3b8", marginTop: 2, letterSpacing: 1, textTransform: "uppercase" }}>KickToTech</div>
      </div>
    </div>
  );
}

export function CertificateRenderer({ data }: { data: CertificateData; template?: CertificateTemplateId }) {
  const teal = "#0a4a50"; 
  const darkNavy = "#0f172a";
  const gold = "#c5a059";
  const bodyText = "#334155";
  const mutedText = "#64748b";
  const lightGray = "#cbd5e1";

  const signatures = [
    ...(data.mentor ? [{ src: data.mentor.signatureAsset, name: data.mentor.name, designation: data.mentor.designation }] : []),
    ...data.signatories.map((s) => ({ src: s.signatureAsset, name: s.name, designation: s.designation })),
  ];

  const gi = gradeInfo(data.grade);

  // Subtle watermark pattern
  const bgPattern = `url("data:image/svg+xml,%3Csvg width='120' height='24' viewBox='0 0 120 24' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 12 Q30 0 60 12 T120 12' fill='none' stroke='%230a4a50' stroke-width='0.5' stroke-opacity='0.03'/%3E%3Cpath d='M0 12 Q30 24 60 12 T120 12' fill='none' stroke='%23c5a059' stroke-width='0.5' stroke-opacity='0.03'/%3E%3C/svg%3E")`;

  return (
    <div
      id="ktt-certificate"
      style={{
        position: "relative",
        width: CERT_W,
        height: CERT_H,
        backgroundColor: "#ffffff",
        backgroundImage: bgPattern,
        color: darkNavy,
        fontFamily: SERIF,
        overflow: "hidden",
        boxSizing: "border-box"
      }}
    >
      {/* PREVIEW WATERMARK */}
      {data.isPreview && (
        <div aria-hidden style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", pointerEvents: "none", zIndex: 0 }}>
          <div style={{ transform: "rotate(-35deg)", fontSize: 160, fontFamily: SANS, fontWeight: 900, color: "#ef4444", opacity: 0.04, letterSpacing: 20 }}>PREVIEW</div>
        </div>
      )}

      {/* ──── PRECISE BORDER SYSTEM ──── */}
      <div style={{ position: "absolute", inset: 16, zIndex: 1, pointerEvents: "none" }}>
        {/* Thin outer grey border */}
        <div style={{ position: "absolute", inset: 0, border: `1px solid ${lightGray}` }} />
        {/* Thick institutional teal border */}
        <div style={{ position: "absolute", inset: 8, border: `8px solid ${teal}` }} />
        {/* Thin inner gold border */}
        <div style={{ position: "absolute", inset: 22, border: `1px solid ${gold}` }} />
        
        {/* Elegant gold corner overlays intersecting the teal border */}
        {[
          { top: 4, left: 4 }, { top: 4, right: 4 },
          { bottom: 4, left: 4 }, { bottom: 4, right: 4 }
        ].map((pos, i) => (
          <div key={i} style={{ position: "absolute", ...pos, width: 16, height: 16, border: `2px solid ${gold}`, background: "#fff", zIndex: 2 }}>
            <div style={{ position: "absolute", inset: 2, background: gold }} />
          </div>
        ))}
      </div>

      {/* ──── CONTENT AREA (FLEX LAYOUT TO PREVENT OVERLAP) ──── */}
      <div style={{ position: "absolute", top: 42, left: 42, right: 42, bottom: 80, display: "flex", flexDirection: "column", zIndex: 10 }}>

        {/* ════ HEADER ════ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0 20px" }}>
          
          {/* LEFT: QR Code */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
            <div style={{ padding: 4, background: "#fff", border: `1px solid ${lightGray}`, borderRadius: 2 }}>
              <CertificateQRCode url={data.verificationUrl} size={64} />
            </div>
            <div style={{ fontFamily: SANS, fontSize: 7.5, letterSpacing: 2, color: mutedText, marginTop: 6, textTransform: "uppercase", fontWeight: 700 }}>Scan to Verify</div>
          </div>

          {/* CENTER: Brand */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginTop: 4, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <img src={LOGO} alt="Kick To Tech" style={{ height: 48, objectFit: "contain" }} />
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <div style={{ fontFamily: SANS, fontSize: 20, fontWeight: 800, color: darkNavy, letterSpacing: 2 }}>KICK TO TECH</div>
                <div style={{ fontFamily: SANS, fontSize: 8.5, letterSpacing: 4, color: teal, textTransform: "uppercase", marginTop: 4, fontWeight: 700 }}>From curiosity to capability</div>
              </div>
            </div>
          </div>

          {/* RIGHT: Corporate Seal (CSS Only for perfect rendering) */}
          <div style={{ flexShrink: 0, marginTop: 0 }}>
            <div style={{ position: "relative", width: 72, height: 96 }}>
              {/* Ribbons */}
              <div style={{ position: "absolute", top: 36, left: 14, width: 18, height: 50, background: teal, border: `1px solid ${gold}`, borderTop: "none", clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)" }} />
              <div style={{ position: "absolute", top: 36, right: 14, width: 18, height: 50, background: teal, border: `1px solid ${gold}`, borderTop: "none", clipPath: "polygon(0 0, 100% 0, 100% 100%, 50% 80%, 0 100%)" }} />
              
              {/* Circular Seal */}
              <div style={{ position: "absolute", top: 0, left: 0, width: 72, height: 72, borderRadius: "50%", background: gold, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ width: 62, height: 62, borderRadius: "50%", background: "#fff", border: `1px dashed ${teal}`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <div style={{ width: 54, height: 54, borderRadius: "50%", background: teal, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                    <span style={{ fontSize: 6.5, fontFamily: SANS, color: "#fff", letterSpacing: 1.5, fontWeight: 700 }}>VERIFIED</span>
                    <div style={{ width: 18, height: 1, background: gold, margin: "2px 0" }} />
                    <span style={{ fontSize: 5.5, fontFamily: SANS, color: "#fff", letterSpacing: 1, fontWeight: 600 }}>PROGRAM</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ════ MAIN TITLE ════ */}
        <div style={{ textAlign: "center", marginTop: 12 }}>
          <div style={{ fontSize: 58, fontFamily: SERIF, fontWeight: 700, color: darkNavy, letterSpacing: 10, textTransform: "uppercase", lineHeight: 1 }}>
            Certificate
          </div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginTop: 14 }}>
            <div style={{ width: 64, height: 1.5, background: gold }} />
            <div style={{ width: 6, height: 6, transform: "rotate(45deg)", background: gold }} />
            <div style={{ fontSize: 14, fontFamily: SANS, fontWeight: 700, color: teal, letterSpacing: 12, textTransform: "uppercase" }}>
              Of Internship
            </div>
            <div style={{ width: 6, height: 6, transform: "rotate(45deg)", background: gold }} />
            <div style={{ width: 64, height: 1.5, background: gold }} />
          </div>
        </div>

        {/* ════ RECIPIENT ════ */}
        <div style={{ textAlign: "center", marginTop: 42 }}>
          <div style={{ fontSize: 16, fontFamily: SERIF, fontStyle: "italic", color: mutedText, letterSpacing: 1 }}>
            This certificate is proudly presented to
          </div>
          <div style={{ 
            fontSize: nameSize(data.recipientName), 
            fontFamily: SERIF, 
            fontWeight: 700, 
            fontStyle: "italic", 
            color: darkNavy, 
            marginTop: 18,
            lineHeight: 1.1,
            padding: "0 20px",
          }}>
            {data.recipientName}
          </div>
          <div style={{ margin: "16px auto 0", width: 440, height: 1.5, background: `linear-gradient(90deg, transparent, ${gold}, transparent)` }} />
        </div>

        {/* ════ METADATA ════ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "0 60px", marginTop: 32 }}>
          <div style={{ textAlign: "left" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <span style={{ fontSize: 9.5, fontFamily: SANS, fontWeight: 700, color: mutedText, letterSpacing: 1.5, textTransform: "uppercase" }}>Certificate ID:</span>
              <span style={{ fontSize: 12, fontFamily: SANS, fontWeight: 800, color: darkNavy }}>{data.certificateId}</span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "baseline", marginTop: 8 }}>
              <span style={{ fontSize: 9.5, fontFamily: SANS, fontWeight: 700, color: mutedText, letterSpacing: 1.5, textTransform: "uppercase" }}>Duration:</span>
              <span style={{ fontSize: 11.5, fontFamily: SANS, fontWeight: 500, color: bodyText }}>{data.durationLabel || "—"}</span>
            </div>
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
              <span style={{ fontSize: 9.5, fontFamily: SANS, fontWeight: 700, color: mutedText, letterSpacing: 1.5, textTransform: "uppercase" }}>Issued Date:</span>
              <span style={{ fontSize: 12, fontFamily: SANS, fontWeight: 800, color: darkNavy }}>{data.issuedDateLabel}</span>
            </div>
          </div>
        </div>

        {/* ════ INTERNSHIP STATEMENT ════ */}
        <div style={{ textAlign: "center", maxWidth: 640, margin: "28px auto 0" }}>
          <div style={{ fontSize: 16, fontFamily: SERIF, color: darkNavy, lineHeight: 1.8 }}>
            For successfully completing a real-time internship at <strong style={{ fontWeight: 700 }}>KickToTech</strong>.
            <br />
            The intern completed {data.durationLabel ? data.durationLabel.split("(")[0].trim().toLowerCase() : "the specified duration"} of hands-on training in the domain of
          </div>
          <div style={{ fontSize: 24, fontFamily: SERIF, fontWeight: 700, color: teal, marginTop: 12, fontStyle: "italic", letterSpacing: 0.5 }}>
            {data.domainLabel || data.program}
          </div>
          <div style={{ fontSize: 13, fontFamily: SERIF, fontStyle: "italic", color: bodyText, lineHeight: 1.7, marginTop: 18, padding: "0 40px" }}>
            During this internship, the student demonstrated strong technical skills, dedication, and a proactive attitude while working on real-world problem statements and successfully completing all assessments and delivering the final project.
          </div>
        </div>

        {/* ════ GRADE SECTION ════ */}
        {gi && (
          <div style={{ textAlign: "center", marginTop: 24, display: "flex", flexDirection: "column", alignItems: "center" }}>
            
            {/* Small divider */}
            <div style={{ width: 30, height: 2, background: gold, marginBottom: 12, borderRadius: 2 }} />
            
            <div style={{ fontSize: 11, fontFamily: SANS, fontWeight: 800, color: darkNavy, letterSpacing: 2, textTransform: "uppercase" }}>
              Overall Internship Grade
            </div>

            {/* CSS-Only Premium Gold Badge */}
            <div style={{ 
              position: "relative", width: 84, height: 84, borderRadius: "50%", 
              background: gold, display: "flex", alignItems: "center", justifyContent: "center",
              marginTop: 14, boxShadow: "0 4px 10px rgba(0,0,0,0.05)"
            }}>
              <div style={{
                width: "90%", height: "90%", borderRadius: "50%", background: "#fff",
                display: "flex", alignItems: "center", justifyContent: "center", border: `1px dashed ${teal}`
              }}>
                <div style={{
                  width: "84%", height: "84%", borderRadius: "50%", background: darkNavy,
                  display: "flex", alignItems: "center", justifyContent: "center"
                }}>
                  <span style={{ fontSize: 34, fontFamily: SANS, fontWeight: 800, color: gold, marginTop: 2 }}>{data.grade || "A"}</span>
                </div>
              </div>
            </div>

            <div style={{ fontSize: 13, fontFamily: SERIF, fontStyle: "italic", fontWeight: 700, color: teal, marginTop: 12 }}>
              ({gi.label})
            </div>
            
            <div style={{ fontSize: 12.5, fontFamily: SERIF, color: bodyText, marginTop: 14, maxWidth: 540, margin: "14px auto 0" }}>
              The intern has successfully completed all the tasks, assessments, and project requirements with excellent performance and quality.
            </div>
          </div>
        )}

        {/* Spacer to push signatures down */}
        <div style={{ flex: 1 }} />

        {/* ════ SIGNATURES ════ */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", padding: "0 40px", marginBottom: 10 }}>
          {signatures.map((s, i) => (
            <Signature key={i} src={s.src} name={s.name} designation={s.designation} />
          ))}
        </div>

      </div>

      {/* ════ CORPORATE FOOTER (Positioned safely at the bottom) ════ */}
      <div style={{ position: "absolute", bottom: 26, left: 0, width: "100%", display: "flex", justifyContent: "center", zIndex: 40 }}>
        <div style={{
          background: teal,
          padding: "12px 64px",
          clipPath: "polygon(10% 0, 90% 0, 100% 100%, 0% 100%)",
          display: "flex", alignItems: "center", gap: 16
        }}>
          <span style={{ fontSize: 10.5, fontFamily: SANS, fontWeight: 800, color: "#fff", letterSpacing: 6, textTransform: "uppercase" }}>
            Learn <span style={{ color: gold, margin: "0 6px" }}>•</span> Build <span style={{ color: gold, margin: "0 6px" }}>•</span> Grow
          </span>
        </div>
      </div>

    </div>
  );
}
