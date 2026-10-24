/**
 * KICK TO TECH — Admin data source.
 *
 * PHASE 1.5: All fake/demo records and statistics have been removed. The admin
 * panel intentionally ships with NO seeded data — every record collection is
 * empty so the UI renders proper loading / empty states and is ready to receive
 * REAL data from the backend API in the next phase (via the service layer).
 *
 * What remains here is genuine configuration, not fabricated data:
 *  - the four official program domains (titles / slugs / pricing / roadmap),
 *    with live counters (enrolled / completion) left at 0 until the backend
 *    supplies them;
 *  - the label map used for filter dropdowns;
 *  - the signed-in admin's own identity (populated by auth, not demo data);
 *  - honest system-health states (mock/not-connected) reflecting reality.
 *
 * Do NOT reintroduce fake users, payments, certificates, sessions, mentors,
 * notifications, or dashboard statistics here.
 */

import type {
  AdminUser, Intern, Application, Mentor, Faculty, LiveSession, AttendanceRecord,
  Payment, Activation, Certificate, AdminNotification, EmailCampaign, ActivityLog,
  SystemService, DomainSlug, RoadmapModule, Domain,
} from "@/lib/admin/types";

/** The currently signed-in administrator (identity only; not demo content). */
export const currentAdmin: AdminUser = {
  id: "adm_current",
  name: "Admin",
  email: (process.env.NEXT_PUBLIC_ADMIN_DEV_EMAIL ?? "admin@kicktotech.in"),
  role: "SUPER_ADMIN",
  avatarColor: "#0057ff",
  lastActiveAt: new Date().toISOString(),
};

// ---- Program configuration (real offerings; live counters await backend) ---

const roadmap = (slug: DomainSlug): RoadmapModule[] => [
  { id: `${slug}-w1`, title: "Week 1 — Foundations", kind: "week", durationLabel: "Week 1", summary: "Core concepts, environment setup, and fundamentals." },
  { id: `${slug}-w2`, title: "Week 2 — Applied skills", kind: "week", durationLabel: "Week 2", summary: "Hands-on exercises and guided practice." },
  { id: `${slug}-w3`, title: "Week 3 — Build", kind: "week", durationLabel: "Week 3", summary: "Turn concepts into working features." },
  { id: `${slug}-proj`, title: "Capstone project", kind: "project", durationLabel: "Week 4", summary: "Deliver a real, reviewable project." },
  { id: `${slug}-assess`, title: "Assessment", kind: "assessment", durationLabel: "Week 5", summary: "Graded evaluation of skills and project." },
  { id: `${slug}-cert`, title: "Certification", kind: "certification", durationLabel: "Week 5", summary: "Verifiable completion certificate issued." },
];

export const domains: Domain[] = [
  { id: "python", title: "Python (AI + Projects)", slug: "python", accent: "#0057ff", description: "Hands-on Python extended into applied AI, automation, and real project delivery.", priceRupees: 449, originalPriceRupees: 999, durationLabel: "5 Weeks", enrolled: 0, completionRate: 0, roadmap: roadmap("python"), resources: [] },
  { id: "java", title: "Java Development", slug: "java", accent: "#ea580c", description: "Core Java, OOP, and backend fundamentals with clean, production-grade code.", priceRupees: 449, originalPriceRupees: 999, durationLabel: "5 Weeks", enrolled: 0, completionRate: 0, roadmap: roadmap("java"), resources: [] },
  { id: "data-analytics", title: "Data Analytics", slug: "data-analytics", accent: "#7c3aed", description: "From raw data to decisions — analysis, visualization, and storytelling.", priceRupees: 222, originalPriceRupees: 999, durationLabel: "5 Weeks", enrolled: 0, completionRate: 0, roadmap: roadmap("data-analytics"), resources: [] },
  { id: "cybersecurity", title: "Cybersecurity", slug: "cybersecurity", accent: "#16a34a", description: "Defend systems and think like an attacker with practical security labs.", priceRupees: 222, originalPriceRupees: 999, durationLabel: "5 Weeks", enrolled: 0, completionRate: 0, roadmap: roadmap("cybersecurity"), resources: [] },
];

export const domainLabel: Record<string, string> = {
  python: "Python (AI + Projects)",
  java: "Java Development",
  "data-analytics": "Data Analytics",
  cybersecurity: "Cybersecurity",
  fullstack: "Full Stack Development",
  hackathon: "PromptWars Hackathon",
  promptwars: "PromptWars Hackathon",
  general: "General Program",
};

// ---- Record collections — EMPTY until the backend is connected -------------

export const interns: Intern[] = [];
export const applications: Application[] = [];
export const mentors: Mentor[] = [];
export const faculty: Faculty[] = [];
export const sessions: LiveSession[] = [];
export const attendance: AttendanceRecord[] = [];
export const payments: Payment[] = [];
export const activations: Activation[] = [];
export const certificates: Certificate[] = [];
export const notifications: AdminNotification[] = [];
export const campaigns: EmailCampaign[] = [];
export const activity: ActivityLog[] = [];

// ---- System health (honest, reflects the current phase) --------------------

export const systemServices: SystemService[] = [
  { name: "Frontend", state: "OPERATIONAL", detail: "Next.js app running" },
  { name: "API", state: "NOT_CONNECTED", detail: "Backend not connected yet" },
  { name: "Database", state: "NOT_CONNECTED", detail: "Phase 2 — production database" },
  { name: "Authentication", state: "DEV_MODE", detail: "Frontend flow only (no real auth)" },
  { name: "Email", state: "NOT_CONNECTED", detail: "Phase 2 — transactional email" },
  { name: "Storage", state: "NOT_CONNECTED", detail: "Phase 2 — certificate storage" },
  { name: "Payments", state: "NOT_CONNECTED", detail: "Phase 2 — payment provider" },
  { name: "Notifications", state: "NOT_CONNECTED", detail: "Phase 2 — realtime delivery" },
];
