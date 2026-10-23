import { getAdminDb, isAdminConfigured } from "./firebase/admin";
import { writeAudit } from "./audit";
import type { HackathonDashboardConfig, HackathonScheduleItem, HackathonResourceItem } from "@/types";

export const DEFAULT_HACKATHON_DASHBOARD_CONFIG: HackathonDashboardConfig = {
  eventName: "PromptWars × KICK To TECH",
  tagline: "Where ideas meet AI • Imagine, Innovate, Impact",
  description:
    "Where ideas meet AI. Imagine, innovate, and impact — build with AI-powered tools, compete for a ₹30,000 prize pool, participation certificates, goodies, and exclusive internship opportunities.",
  date: "28 October 2026",
  time: "9:00 AM – 6:30 PM IST",
  reportingTime: "8:45 AM IST",
  venue: "Library Building, JSPM University, Pune",
  mode: "Offline / In-person Hackathon",
  theme: "Build with AI • Generative AI & Automation",
  prizePool: "₹30,000 Prize Pool + Goodies, Certificates & Internship Opportunities",
  announcement:
    "Welcome participants! Reporting begins sharply at 8:45 AM at JSPM University Library Building. Please bring your valid college ID card, personal laptop, and chargers. Morning refreshments and participant kits are included.",
  announcementActive: true,
  whatsappGroupUrl: "https://chat.whatsapp.com/IJJw79iVdWMDTzZ9f9QcYN",
  discordUrl: "",
  officialPortalUrl:
    "https://hack2skill.com/event/promptwars-x-kicktotech-promptwars-2026?utm_source=hack2skill&utm_medium=homepage",
  submissionUrl:
    "https://hack2skill.com/event/promptwars-x-kicktotech-promptwars-2026?utm_source=hack2skill&utm_medium=homepage",
  contactEmail: "admin@kicktotech.in",
  contactPhone: "+91 91722 83070",
  schedule: [
    {
      id: "sch-1",
      time: "08:45 AM – 09:30 AM",
      title: "Reporting & Check-in",
      description: "Verify your KTT Unique ID, collect your badge, participant kit & morning refreshments.",
      status: "upcoming",
    },
    {
      id: "sch-2",
      time: "09:30 AM – 10:15 AM",
      title: "Opening Ceremony & Problem Statement Briefing",
      description: "Welcome keynote by KICK To TECH leadership, track breakdown, and rules announcement.",
      status: "upcoming",
    },
    {
      id: "sch-3",
      time: "10:15 AM",
      title: "Hacking Starts — Sprint 1",
      description: "Teams commence ideation, solution architecture & initial AI prototype setup.",
      status: "upcoming",
    },
    {
      id: "sch-4",
      time: "01:00 PM – 02:00 PM",
      title: "Lunch & Mentorship Review Round 1",
      description: "Complimentary lunch break. Mentors visit team stations for prototype review & technical guidance.",
      status: "upcoming",
    },
    {
      id: "sch-5",
      time: "02:00 PM – 04:30 PM",
      title: "Sprint 2 — Final Polish & Presentation Prep",
      description: "Complete MVP features, prepare presentation pitch deck, and record a 2-minute demo.",
      status: "upcoming",
    },
    {
      id: "sch-6",
      time: "04:30 PM",
      title: "Code Freeze & Final Project Submission",
      description: "All code repositories, pitch decks, and live URLs must be submitted on the official portal.",
      status: "upcoming",
    },
    {
      id: "sch-7",
      time: "04:45 PM – 06:00 PM",
      title: "Top Finalist Pitches & Jury Evaluation",
      description: "Shortlisted teams present 3-minute pitches + 2-minute Q&A to the grand jury panel.",
      status: "upcoming",
    },
    {
      id: "sch-8",
      time: "06:00 PM – 06:30 PM",
      title: "Grand Felicitation & Winner Announcement",
      description: "Announcement of 1st, 2nd, and 3rd place winners, certificate distribution, and closing photos.",
      status: "upcoming",
    },
  ],
  resources: [
    {
      id: "res-1",
      title: "Official PromptWars Hack2Skill Portal",
      url: "https://hack2skill.com/event/promptwars-x-kicktotech-promptwars-2026?utm_source=hack2skill&utm_medium=homepage",
      description: "Official event portal for team formation, updates, and final project submissions.",
      type: "link",
    },
    {
      id: "res-2",
      title: "Official WhatsApp Participant Community",
      url: "https://chat.whatsapp.com/IJJw79iVdWMDTzZ9f9QcYN",
      description: "Connect with fellow builders, mentors, and the organizing team in real-time.",
      type: "community",
    },
    {
      id: "res-3",
      title: "Hackathon Pitch Deck (PPT) Template",
      url: "https://docs.google.com/presentation/",
      description: "Standard slide template recommended for final jury evaluation and project pitches.",
      type: "document",
    },
    {
      id: "res-4",
      title: "Submission Guidelines & Judging Criteria",
      url: "https://hack2skill.com/event/promptwars-x-kicktotech-promptwars-2026?utm_source=hack2skill&utm_medium=homepage",
      description: "Review evaluation metrics: Innovation (25%), Technical AI Depth (25%), Feasibility (25%), and Presentation (25%).",
      type: "document",
    },
  ],
};

const globalMemoryRef = globalThis as unknown as {
  __kttHackathonDashboardConfig?: HackathonDashboardConfig;
};

/**
 * Retrieve the current Hackathon Dashboard configuration.
 * Reads from Firestore (settings/hackathon_dashboard) if configured,
 * otherwise returns in-memory cached copy or default template.
 */
export async function getHackathonDashboardConfig(): Promise<HackathonDashboardConfig> {
  if (globalMemoryRef.__kttHackathonDashboardConfig) {
    // Check if Firestore has a newer copy when configured
    if (!isAdminConfigured()) {
      return globalMemoryRef.__kttHackathonDashboardConfig;
    }
  }

  if (isAdminConfigured()) {
    try {
      const db = await getAdminDb();
      const doc = await db.collection("settings").doc("hackathon_dashboard").get();
      if (doc.exists) {
        const data = doc.data() as Partial<HackathonDashboardConfig>;
        const whatsappUrl =
          data.whatsappGroupUrl && data.whatsappGroupUrl !== "https://chat.whatsapp.com/"
            ? data.whatsappGroupUrl
            : DEFAULT_HACKATHON_DASHBOARD_CONFIG.whatsappGroupUrl;

        const merged: HackathonDashboardConfig = {
          ...DEFAULT_HACKATHON_DASHBOARD_CONFIG,
          ...data,
          whatsappGroupUrl: whatsappUrl,
          schedule: Array.isArray(data.schedule)
            ? data.schedule
            : DEFAULT_HACKATHON_DASHBOARD_CONFIG.schedule,
          resources: Array.isArray(data.resources)
            ? data.resources.map((r) =>
                r.title?.toLowerCase().includes("whatsapp") &&
                (!r.url || r.url === "https://chat.whatsapp.com/" || r.url === "#")
                  ? { ...r, url: whatsappUrl || DEFAULT_HACKATHON_DASHBOARD_CONFIG.whatsappGroupUrl! }
                  : r,
              )
            : DEFAULT_HACKATHON_DASHBOARD_CONFIG.resources,
        };
        globalMemoryRef.__kttHackathonDashboardConfig = merged;
        return merged;
      }
    } catch (err) {
      console.warn("[hackathonDashboard] Failed reading config from Firestore, using fallback:", err);
    }
  }

  const fallback = globalMemoryRef.__kttHackathonDashboardConfig ?? { ...DEFAULT_HACKATHON_DASHBOARD_CONFIG };
  globalMemoryRef.__kttHackathonDashboardConfig = fallback;
  return fallback;
}

export type HackathonDashboardConfigPatch = {
  [K in keyof HackathonDashboardConfig]?: unknown;
};

/**
 * Update the Hackathon Dashboard configuration.
 * Persists to Firestore and in-memory cache, and appends an audit record.
 */
export async function saveHackathonDashboardConfig(
  patch: HackathonDashboardConfigPatch,
  meta?: { actor?: string; requestId?: string },
): Promise<HackathonDashboardConfig> {
  const current = await getHackathonDashboardConfig();

  const safeStr = (v: unknown, fallback: string): string => {
    if (typeof v === "string") return v.trim();
    if (v == null) return fallback;
    return String(v).trim();
  };

  const sanitizedSchedule: HackathonScheduleItem[] = Array.isArray(patch.schedule)
    ? patch.schedule.map((item: any, index: number) => ({
        id: item?.id ? String(item.id) : `sch-${Date.now()}-${index}`,
        time: safeStr(item?.time, "TBD"),
        title: safeStr(item?.title, "Milestone"),
        description: item?.description ? String(item.description).trim() : "",
        status: (item?.status === "live" || item?.status === "completed" ? item.status : "upcoming") as "upcoming" | "live" | "completed",
      }))
    : current.schedule;

  const sanitizedResources: HackathonResourceItem[] = Array.isArray(patch.resources)
    ? patch.resources.map((item: any, index: number) => ({
        id: item?.id ? String(item.id) : `res-${Date.now()}-${index}`,
        title: safeStr(item?.title, "Resource"),
        url: safeStr(item?.url, "#"),
        description: item?.description ? String(item.description).trim() : "",
        type: (item?.type === "document" || item?.type === "code" || item?.type === "community" ? item.type : "link") as "link" | "document" | "code" | "community",
      }))
    : current.resources;

  const updated: HackathonDashboardConfig = {
    eventName: safeStr(patch.eventName, current.eventName),
    tagline: safeStr(patch.tagline, current.tagline),
    description: safeStr(patch.description, current.description),
    date: safeStr(patch.date, current.date),
    time: safeStr(patch.time, current.time),
    reportingTime: safeStr(patch.reportingTime, current.reportingTime),
    venue: safeStr(patch.venue, current.venue),
    mode: safeStr(patch.mode, current.mode),
    theme: safeStr(patch.theme, current.theme),
    prizePool: safeStr(patch.prizePool, current.prizePool),
    announcement: safeStr(patch.announcement ?? current.announcement, ""),
    announcementActive: patch.announcementActive !== undefined ? Boolean(patch.announcementActive) : (current.announcementActive ?? true),
    whatsappGroupUrl: safeStr(patch.whatsappGroupUrl ?? current.whatsappGroupUrl, ""),
    discordUrl: safeStr(patch.discordUrl ?? current.discordUrl, ""),
    officialPortalUrl: safeStr(patch.officialPortalUrl ?? current.officialPortalUrl, ""),
    submissionUrl: safeStr(patch.submissionUrl ?? current.submissionUrl, ""),
    contactEmail: safeStr(patch.contactEmail ?? current.contactEmail, ""),
    contactPhone: safeStr(patch.contactPhone ?? current.contactPhone, ""),
    schedule: sanitizedSchedule,
    resources: sanitizedResources,
    updatedAt: new Date().toISOString(),
  };

  globalMemoryRef.__kttHackathonDashboardConfig = updated;

  if (isAdminConfigured()) {
    try {
      const db = await getAdminDb();
      await db.collection("settings").doc("hackathon_dashboard").set(updated, { merge: true });
    } catch (err) {
      console.warn("[hackathonDashboard] Warning saving to Firestore (in-memory cache preserved):", err);
    }
  }

  if (meta?.actor) {
    try {
      await writeAudit({
        actor: meta.actor,
        action: "HACKATHON_DASHBOARD_CONFIG_UPDATED",
        target: "hackathon_dashboard",
        requestId: meta.requestId,
      });
    } catch (err) {
      console.warn("[hackathonDashboard] Audit write failed:", err);
    }
  }

  return updated;
}
