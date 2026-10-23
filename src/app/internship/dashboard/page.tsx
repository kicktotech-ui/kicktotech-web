"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import {
  BookOpen,
  Award,
  CreditCard,
  CalendarClock,
  FileText,
  LifeBuoy,
  Trophy,
  Users,
  MapPin,
  Clock,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Megaphone,
  ArrowRight,
  Sparkles,
  Phone,
  Mail,
  FileCode,
  Share2,
  RefreshCw,
  Copy,
  Check,
  Link as LinkIcon,
} from "lucide-react";
import { RequireAuth } from "@/components/dashboard/RequireAuth";
import { DashboardShell } from "@/components/dashboard/DashboardShell";
import {
  DashboardHeader,
  StatCard,
  ProgressCard,
  StatusBadge,
  Timeline,
} from "@/components/dashboard/primitives";
import { Card } from "@/components/ui";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/feedback/states";
import { useAuth } from "@/components/providers";
import { internshipProgram } from "@/data/mock/internship";
import { formatINR, cn, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import type {
  HackathonDashboardConfig,
  HackathonParticipantRecord,
} from "@/types";

interface StudentDashboardResponse {
  user: { id: string; email: string; name?: string };
  hackathon: {
    enrolled: boolean;
    registration: HackathonParticipantRecord | null;
    config: HackathonDashboardConfig;
  };
  internship: {
    enrolled: boolean;
    registration: Record<string, unknown> | null;
  };
}

export default function DashboardPage() {
  return (
    <RequireAuth permission="view_dashboard">
      <DashboardShell>
        <Suspense fallback={<DashboardLoadingSkeleton />}>
          <DashboardContent />
        </Suspense>
      </DashboardShell>
    </RequireAuth>
  );
}

function DashboardLoadingSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="h-10 w-64 rounded-xl bg-white/5" />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="h-28 rounded-2xl bg-white/5" />
        <div className="h-28 rounded-2xl bg-white/5" />
      </div>
      <div className="h-96 rounded-2xl bg-white/5" />
    </div>
  );
}

function DashboardContent() {
  const { user, firebaseUser } = useAuth();
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<"hackathon" | "internship">("hackathon");
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [data, setData] = useState<StudentDashboardResponse | null>(null);

  // Fetch student dashboard data
  useEffect(() => {
    let active = true;

    async function loadDashboard() {
      try {
        setLoading(true);
        const token = await firebaseUser?.getIdToken().catch(() => null);
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

        const res = await api.get<StudentDashboardResponse>("/student/dashboard", { headers });
        if (active) {
          setData(res);

          // Tab prioritization:
          // 1. Explicit query param (e.g. ?tab=hackathon or ?tab=internship)
          // 2. If enrolled in hackathon and NOT internship -> default to hackathon
          // 3. If enrolled in internship and NOT hackathon -> default to internship
          if (requestedTab === "hackathon" || requestedTab === "internship") {
            setActiveTab(requestedTab);
          } else if (res.hackathon.enrolled && !res.internship.enrolled) {
            setActiveTab("hackathon");
          } else if (res.internship.enrolled && !res.hackathon.enrolled) {
            setActiveTab("internship");
          } else {
            setActiveTab(requestedTab === "internship" ? "internship" : "hackathon");
          }
        }
      } catch (err) {
        console.warn("[dashboard] Failed fetching live student dashboard, falling back:", err);
        // Fallback: fetch public hackathon config
        try {
          const cfg = await api.get<HackathonDashboardConfig>("/hackathon/dashboard-config");
          if (active) {
            setData({
              user: { id: user?.uid ?? "", email: user?.email ?? "", name: user?.name },
              hackathon: {
                enrolled: false,
                registration: null,
                config: cfg,
              },
              internship: {
                enrolled: false,
                registration: null,
              },
            });
            if (requestedTab === "internship") setActiveTab("internship");
          }
        } catch {
          // Keep null
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    loadDashboard();
    return () => {
      active = false;
    };
  }, [user, firebaseUser, requestedTab]);

  function handleCopyKttId(id: string) {
    if (!id) return;
    navigator.clipboard.writeText(id);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  }

  const hackathonEnrolled = Boolean(data?.hackathon.enrolled);
  const hackathonReg = data?.hackathon.registration;
  const hackathonConfig = data?.hackathon.config;
  const internshipEnrolled = Boolean(data?.internship.enrolled);

  return (
    <>
      <DashboardHeader
        title={`Welcome, ${user?.name ?? "there"}`}
        subtitle="Your personalized student & participant hub."
        action={
          activeTab === "hackathon" && !hackathonEnrolled ? (
            <Button href="/hackathon/register" size="sm">
              <Trophy className="mr-1.5 h-4 w-4" /> Register for Hackathon
            </Button>
          ) : activeTab === "internship" && !internshipEnrolled ? (
            <Button href="/internship/register" size="sm">
              <BookOpen className="mr-1.5 h-4 w-4" /> Enroll in a Domain
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.location.reload()}
              >
                <RefreshCw className="mr-1.5 h-3.5 w-3.5" /> Refresh
              </Button>
            </div>
          )
        }
      />

      {/* Cohort Section Switcher Cards (Interactive & Responsive) */}
      <div className="mb-8 grid gap-4 sm:gap-6 md:grid-cols-2">
        {/* Hackathon Participation Card */}
        <button
          type="button"
          onClick={() => setActiveTab("hackathon")}
          className={cn(
            "group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 sm:p-6 text-left transition-all",
            activeTab === "hackathon"
              ? "border-accent bg-accent/[0.08] shadow-[0_0_24px_rgba(34,227,214,0.14)] ring-1 ring-accent"
              : "border-line bg-ink-800/60 hover:border-accent/40 hover:bg-ink-800/90",
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-accent">
                <Trophy className="h-4 w-4" /> Hackathon Participation
              </span>
              {hackathonEnrolled ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" />
                  {hackathonReg?.kttId ? `Enrolled • ${hackathonReg.kttId}` : "Enrolled"}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-ink-900 px-2.5 py-0.5 text-[11px] text-muted">
                  Not Enrolled
                </span>
              )}
            </div>

            <div className="mt-3">
              <p className="text-lg font-bold text-primary-foreground group-hover:text-accent transition-colors">
                {hackathonConfig?.eventName || "PromptWars × KICK To TECH"}
              </p>
              <p className="mt-1 text-xs text-muted">
                {hackathonEnrolled
                  ? `Status: ${hackathonReg?.status === "PAYMENT_VERIFIED" || hackathonReg?.status === "CERTIFICATE_ISSUED" ? "Verified & Paid" : "Payment Pending"} • 28 Oct 2026`
                  : "Build with AI • ₹30,000 Prize Pool • ₹99 Kit Fee"}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line/50 pt-3">
            <span className="text-[11px] font-medium text-muted">
              {activeTab === "hackathon" ? "Currently viewing section" : "Click to view hackathon section"}
            </span>
            {activeTab === "hackathon" ? (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-ink-900">
                Active View
              </span>
            ) : (
              <span className="text-xs font-semibold text-accent group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                View <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </div>
        </button>

        {/* Internship Participation Card */}
        <button
          type="button"
          onClick={() => setActiveTab("internship")}
          className={cn(
            "group relative flex flex-col justify-between overflow-hidden rounded-2xl border p-5 sm:p-6 text-left transition-all",
            activeTab === "internship"
              ? "border-accent bg-accent/[0.08] shadow-[0_0_24px_rgba(34,227,214,0.14)] ring-1 ring-accent"
              : "border-line bg-ink-800/60 hover:border-accent/40 hover:bg-ink-800/90",
          )}
        >
          <div>
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted">
                <BookOpen className="h-4 w-4 text-accent" /> Internship Participation
              </span>
              {internshipEnrolled ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                  <CheckCircle2 className="h-3 w-3" /> Enrolled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-line bg-ink-900 px-2.5 py-0.5 text-[11px] text-muted">
                  Not Enrolled
                </span>
              )}
            </div>

            <div className="mt-3">
              <p className="text-lg font-bold text-primary-foreground group-hover:text-accent transition-colors">
                5-Week Project-First Internship
              </p>
              <p className="mt-1 text-xs text-muted">
                {internshipEnrolled
                  ? "Active Track • Real-world projects & Industry Mentorship"
                  : "Choose a domain: Python (AI), Web Dev, Data Analytics..."}
              </p>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-between border-t border-line/50 pt-3">
            <span className="text-[11px] font-medium text-muted">
              {activeTab === "internship" ? "Currently viewing section" : "Click to view internship section"}
            </span>
            {activeTab === "internship" ? (
              <span className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wide text-ink-900">
                Active View
              </span>
            ) : (
              <span className="text-xs font-semibold text-accent group-hover:translate-x-0.5 transition-transform inline-flex items-center gap-1">
                View <ArrowRight className="h-3 w-3" />
              </span>
            )}
          </div>
        </button>
      </div>

      {/* SECTION 1: HACKATHON PARTICIPANTS */}
      {activeTab === "hackathon" && (
        <div className="space-y-6">
          {/* If Enrolled: Official Participant Pass Card */}
          {hackathonEnrolled && hackathonReg ? (
            <div className="relative overflow-hidden rounded-3xl border border-accent/40 bg-gradient-to-br from-accent/15 via-surface to-ink-900 p-6 shadow-xl sm:p-8">
              <div
                aria-hidden
                className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-accent/20 blur-3xl"
              />

              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/40 bg-accent/20 px-3 py-1 text-xs font-bold text-accent">
                      <Sparkles className="h-3.5 w-3.5" /> Official Participant Pass
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-line px-3 py-1 text-xs font-medium text-muted">
                      PromptWars 2026
                    </span>
                  </div>

                  <h2 className="mt-3 text-2xl font-extrabold tracking-tight sm:text-3xl text-primary-foreground">
                    {hackathonReg.name || user?.name}
                  </h2>

                  <div className="mt-3 flex flex-wrap items-center gap-y-2 gap-x-4 text-xs text-muted">
                    {hackathonReg.college && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-3.5 w-3.5 text-accent" /> {hackathonReg.college}
                      </span>
                    )}
                    {hackathonReg.teamName && (
                      <span className="flex items-center gap-1 font-semibold text-primary-foreground/90">
                        <Users className="h-3.5 w-3.5 text-accent" /> Team: {hackathonReg.teamName}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-accent" /> Reg: {formatDate(hackathonReg.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Unique ID Badge */}
                <div className="flex flex-col items-start gap-3 rounded-2xl border border-accent/30 bg-ink-800/80 p-5 sm:items-end lg:min-w-[240px]">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">
                    Unique Participant ID
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-2xl sm:text-3xl font-black text-accent tracking-wider">
                      {hackathonReg.kttId || hackathonReg.applicationId}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        handleCopyKttId(hackathonReg.kttId || hackathonReg.applicationId)
                      }
                      title="Copy Participant ID"
                      className="rounded-lg border border-accent/30 p-1.5 text-accent hover:bg-accent/10 transition-colors"
                    >
                      {copiedId ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    {hackathonReg.status === "PAYMENT_VERIFIED" ||
                    hackathonReg.status === "CERTIFICATE_ISSUED" ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-xs font-bold text-emerald-400">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Verified & Confirmed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-xs font-bold text-amber-400">
                        <AlertCircle className="h-3.5 w-3.5" /> {hackathonReg.status}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Fee & Inclusions Banner */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-accent/20 pt-4 text-xs">
                <span className="text-muted">
                  Participant Kit & Refreshment:{" "}
                  <strong className="text-emerald-400 font-bold">Allocated (₹99 Verified)</strong>
                </span>
                <span className="text-muted">
                  Application Ref: <code className="font-mono text-accent">{hackathonReg.applicationId}</code>
                </span>
              </div>
            </div>
          ) : (
            /* If NOT enrolled: Clean Invitation Card */
            <div className="overflow-hidden rounded-3xl border border-line bg-surface p-6 sm:p-8">
              <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-accent/30 bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                    <Trophy className="h-3.5 w-3.5" /> Registration Open
                  </span>
                  <h3 className="mt-3 text-2xl font-bold sm:text-3xl text-primary-foreground">
                    PromptWars × KICK To TECH
                  </h3>
                  <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted">
                    You haven&apos;t registered for PromptWars yet. Build with AI tools, solve real
                    challenges, compete for a ₹30,000 prize pool, goodies, and unlock direct internship opportunities.
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-muted">
                    <span>📅 28 October 2026</span>
                    <span>📍 JSPM University, Pune</span>
                    <span>🏆 ₹30,000 Prize Pool</span>
                    <span>🎟 ₹99 Kit Fee</span>
                  </div>
                </div>

                <div className="flex-shrink-0">
                  <Button href="/hackathon/register" size="lg" className="w-full sm:w-auto shadow-lg shadow-accent/25">
                    Register for Hackathon <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Live Announcement Banner (From Admin Console) */}
          {hackathonConfig?.announcementActive && hackathonConfig.announcement && (
            <div className="flex items-start gap-3 rounded-2xl border border-accent/40 bg-accent/10 p-4 sm:p-5 text-sm">
              <Megaphone className="h-5 w-5 flex-shrink-0 text-accent mt-0.5" />
              <div className="space-y-1">
                <p className="font-bold text-accent">Important Announcement from Organizing Team</p>
                <p className="text-xs sm:text-sm leading-relaxed text-primary-foreground/90">
                  {hackathonConfig.announcement}
                </p>
              </div>
            </div>
          )}

          {/* Event Details Grid (Dynamic from Admin Console) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-5">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Date & Time</span>
                <Clock className="h-4 w-4 text-accent" />
              </div>
              <p className="mt-2 text-base font-bold text-primary-foreground">
                {hackathonConfig?.date || "28 October 2026"}
              </p>
              <p className="text-xs text-muted mt-0.5">
                {hackathonConfig?.time || "9:00 AM – 6:30 PM IST"}
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Venue / Mode</span>
                <MapPin className="h-4 w-4 text-accent" />
              </div>
              <p className="mt-2 text-base font-bold text-primary-foreground">
                {hackathonConfig?.venue || "JSPM University, Pune"}
              </p>
              <p className="text-xs text-muted mt-0.5">
                Reporting: <span className="font-semibold text-accent">{hackathonConfig?.reportingTime || "8:45 AM"}</span>
              </p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Theme</span>
                <Sparkles className="h-4 w-4 text-accent" />
              </div>
              <p className="mt-2 text-base font-bold text-primary-foreground">
                {hackathonConfig?.theme || "Build with AI"}
              </p>
              <p className="text-xs text-muted mt-0.5">Prompt Engineering & GenAI</p>
            </Card>

            <Card className="p-5">
              <div className="flex items-center justify-between text-muted">
                <span className="text-xs font-semibold uppercase tracking-wider">Prize Pool</span>
                <Trophy className="h-4 w-4 text-accent" />
              </div>
              <p className="mt-2 text-base font-bold text-primary-foreground">
                {hackathonConfig?.prizePool || "₹30,000 Pool"}
              </p>
              <p className="text-xs text-muted mt-0.5">+ Goodies & Certificates</p>
            </Card>
          </div>

          {/* Quick Action Buttons for Participants */}
          <div className="grid gap-3 sm:grid-cols-3">
            {hackathonConfig?.officialPortalUrl && (
              <a
                href={hackathonConfig.officialPortalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-line bg-surface p-4 text-sm font-semibold hover:border-accent/40 hover:bg-white/[0.03] transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <ExternalLink className="h-4 w-4 text-accent" />
                  Official PromptWars Portal
                </span>
                <ArrowRight className="h-4 w-4 text-muted group-hover:translate-x-1 group-hover:text-accent transition-transform" />
              </a>
            )}

            {hackathonConfig?.submissionUrl && (
              <a
                href={hackathonConfig.submissionUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-line bg-surface p-4 text-sm font-semibold hover:border-accent/40 hover:bg-white/[0.03] transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <FileCode className="h-4 w-4 text-accent" />
                  Project Submission Link
                </span>
                <ArrowRight className="h-4 w-4 text-muted group-hover:translate-x-1 group-hover:text-accent transition-transform" />
              </a>
            )}

            {hackathonConfig?.whatsappGroupUrl && (
              <a
                href={hackathonConfig.whatsappGroupUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center justify-between rounded-2xl border border-line bg-surface p-4 text-sm font-semibold hover:border-accent/40 hover:bg-white/[0.03] transition-colors"
              >
                <span className="flex items-center gap-2.5">
                  <Share2 className="h-4 w-4 text-emerald-400" />
                  WhatsApp Participant Group
                </span>
                <ArrowRight className="h-4 w-4 text-muted group-hover:translate-x-1 group-hover:text-emerald-400 transition-transform" />
              </a>
            )}
          </div>

          {/* Live Schedule & Timeline (Dynamic from Admin Console) */}
          <Card className="p-6">
            <div className="flex items-center justify-between border-b border-line pb-4 mb-6">
              <div>
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Clock className="h-5 w-5 text-accent" /> Live Event Schedule
                </h3>
                <p className="text-xs text-muted mt-0.5">
                  Real-time schedule and milestone updates managed by the organizing committee.
                </p>
              </div>
              <span className="rounded-full border border-line px-3 py-1 text-xs text-muted">
                {hackathonConfig?.date || "28 October 2026"}
              </span>
            </div>

            <div className="relative pl-6 sm:pl-8 space-y-6">
              <span className="absolute left-3 top-2 bottom-2 w-px bg-line" />

              {hackathonConfig?.schedule && hackathonConfig.schedule.length > 0 ? (
                hackathonConfig.schedule.map((item) => (
                  <div key={item.id} className="relative">
                    <span
                      className={cn(
                        "absolute -left-6 sm:-left-8 top-1 flex h-4 w-4 items-center justify-center rounded-full border",
                        item.status === "completed"
                          ? "border-emerald-500 bg-emerald-500"
                          : item.status === "live"
                          ? "border-accent bg-accent animate-pulse"
                          : "border-line bg-ink-800",
                      )}
                    />
                    <div className="rounded-xl border border-line/60 bg-ink-800/40 p-4 transition-all hover:border-line">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-accent">
                          {item.time}
                        </span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                            item.status === "completed"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                              : item.status === "live"
                              ? "bg-accent/15 text-accent border border-accent/40 animate-pulse"
                              : "bg-white/5 text-muted border border-line",
                          )}
                        >
                          {item.status === "live" ? "● Live Now" : item.status === "completed" ? "✓ Completed" : "Upcoming"}
                        </span>
                      </div>
                      <h4 className="mt-1.5 text-sm font-bold text-primary-foreground">
                        {item.title}
                      </h4>
                      {item.description && (
                        <p className="mt-1 text-xs leading-relaxed text-muted">
                          {item.description}
                        </p>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted">Schedule will be announced shortly.</p>
              )}
            </div>
          </Card>

          {/* Participant Resources & Guidelines (From Admin Console) */}
          <Card className="p-6">
            <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
              <FileText className="h-5 w-5 text-accent" /> Participant Resources & Guidelines
            </h3>
            {hackathonConfig?.resources && hackathonConfig.resources.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {hackathonConfig.resources.map((res) => (
                  <a
                    key={res.id}
                    href={res.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex flex-col justify-between rounded-xl border border-line bg-ink-800/40 p-4 hover:border-accent/40 hover:bg-white/[0.02] transition-colors"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-primary-foreground">
                          {res.title}
                        </span>
                        <div className="flex items-center gap-1.5 flex-shrink-0">
                          {res.type && (
                            <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-accent">
                              {res.type}
                            </span>
                          )}
                          <ExternalLink className="h-3.5 w-3.5 text-accent" />
                        </div>
                      </div>
                      {res.description && (
                        <p className="mt-1 text-xs text-muted leading-relaxed">
                          {res.description}
                        </p>
                      )}
                      {res.url && res.url !== "#" && (
                        <span className="mt-2.5 inline-flex items-center gap-1 font-mono text-[11px] text-accent hover:underline break-all">
                          <LinkIcon className="h-3 w-3 flex-shrink-0" />
                          {res.url}
                        </span>
                      )}
                    </div>
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">
                Resources, problem statements, and guidelines will be published shortly.
              </p>
            )}
          </Card>

          {/* Coordinator Helpdesk */}
          <div className="rounded-2xl border border-line bg-surface p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-bold text-primary-foreground">
                  Have questions about PromptWars?
                </p>
                <p className="text-xs text-muted">
                  Reach out to the Hackathon Organizing Committee for any queries.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {hackathonConfig?.contactEmail && (
                  <a
                    href={`mailto:${hackathonConfig.contactEmail}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-3 py-1.5 text-xs font-medium text-muted hover:text-primary-foreground transition-colors"
                  >
                    <Mail className="h-3.5 w-3.5 text-accent" /> {hackathonConfig.contactEmail}
                  </a>
                )}
                {hackathonConfig?.contactPhone && (
                  <a
                    href={`tel:${hackathonConfig.contactPhone}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-ink-800 px-3 py-1.5 text-xs font-medium text-muted hover:text-primary-foreground transition-colors"
                  >
                    <Phone className="h-3.5 w-3.5 text-emerald-400" /> {hackathonConfig.contactPhone}
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 2: INTERNSHIP PARTICIPANTS */}
      {activeTab === "internship" && (
        <div className="space-y-6">
          {!internshipEnrolled ? (
            <EmptyState
              title="No active internship enrollment yet"
              icon={<BookOpen className="h-7 w-7 text-accent" />}
              description="Choose a domain to begin your 5-week project-first internship. Work on real-world projects with dedicated mentorship."
              action={
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <Button href="/internship" size="sm" variant="outline">
                    Explore domains
                  </Button>
                  <Button href="/internship/register" size="sm">
                    Enroll now
                  </Button>
                </div>
              }
            />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <div className="space-y-6 lg:col-span-2">
                <div className="grid gap-4 sm:grid-cols-3">
                  <StatCard icon={BookOpen} label="Domain" value="Python (AI)" />
                  <StatCard
                    icon={CreditCard}
                    label="Payment"
                    value={<StatusBadge status="active" />}
                    hint={formatINR(internshipProgram.priceRupees)}
                  />
                  <StatCard
                    icon={Award}
                    label="Certificate"
                    value={<StatusBadge status="pending" />}
                  />
                </div>
                <Card>
                  <h3 className="mb-4 font-semibold">Progress</h3>
                  <ProgressCard label="Overall completion" value={40} />
                </Card>
              </div>
              <Card>
                <h3 className="mb-4 flex items-center gap-2 font-semibold">
                  <CalendarClock className="h-4 w-4 text-accent" /> Timeline
                </h3>
                <Timeline
                  items={[
                    { title: "Enrolled", date: "18 May 2026", done: true },
                    { title: "Mid-program review", date: "1 Jun 2026" },
                    { title: "Final submission", date: "18 Jun 2026" },
                    { title: "Certificate issued", date: "21 Jun 2026" },
                  ]}
                />
              </Card>
            </div>
          )}
        </div>
      )}

      {/* Shared Bottom Resource Links */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Card className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <FileText className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold">Documents & resources</p>
              <p className="text-xs text-muted">Access syllabus, guides, and templates</p>
            </div>
          </div>
          <Button href="/internship" size="sm" variant="ghost">
            Open
          </Button>
        </Card>
        <Card className="flex items-center justify-between p-5">
          <div className="flex items-center gap-3">
            <LifeBuoy className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold">Need help?</p>
              <p className="text-xs text-muted">Contact our support & mentor desk</p>
            </div>
          </div>
          <Button href="/contact" size="sm" variant="ghost">
            Contact
          </Button>
        </Card>
      </div>
    </>
  );
}
