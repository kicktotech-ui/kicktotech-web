import {
  LayoutDashboard, Activity, Users, FileText, GraduationCap, Building2, BookOpen,
  Video, CalendarCheck, CreditCard, KeyRound, Award, BadgeCheck, FileBadge, ShieldCheck,
  Bell, Megaphone, Mail, BarChart3, HeartPulse, Settings, Trophy, type LucideIcon,
} from "lucide-react";

export interface NavItem { label: string; href: string; icon: LucideIcon }
export interface NavGroup { label: string; items: NavItem[] }

/** Sidebar structure. Every href resolves to a real page (no dead links). */
export const navGroups: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Activity", href: "/admin/activity", icon: Activity },
    ],
  },
  {
    label: "People",
    items: [
      { label: "Interns", href: "/admin/interns", icon: Users },
      { label: "Applications", href: "/admin/applications", icon: FileText },
      { label: "Mentors", href: "/admin/mentors", icon: GraduationCap },
      { label: "Faculty", href: "/admin/faculty", icon: Building2 },
    ],
  },
  {
    label: "Programs",
    items: [
      { label: "Domains & Roadmaps", href: "/admin/domains", icon: BookOpen },
      { label: "Hackathon Manager", href: "/admin/hackathons", icon: Trophy },
    ],
  },
  {
    label: "Operations",
    items: [
      { label: "Live Sessions", href: "/admin/sessions", icon: Video },
      { label: "Attendance", href: "/admin/attendance", icon: CalendarCheck },
      { label: "Payments", href: "/admin/payments", icon: CreditCard },
      { label: "Manual Activation", href: "/admin/activations", icon: KeyRound },
    ],
  },
  {
    label: "Certification",
    items: [
      { label: "Certification", href: "/admin/certification", icon: Award },
      { label: "Certificates", href: "/admin/certificates", icon: BadgeCheck },
      { label: "Templates", href: "/admin/certificate-templates", icon: FileBadge },
      { label: "Verification", href: "/admin/verify", icon: ShieldCheck },
    ],
  },
  {
    label: "Communication",
    items: [
      { label: "Notifications", href: "/admin/notifications", icon: Bell },
      { label: "Announcements", href: "/admin/announcements", icon: Megaphone },
      { label: "Email Campaigns", href: "/admin/email", icon: Mail },
    ],
  },
  {
    label: "Insights",
    items: [{ label: "Analytics", href: "/admin/analytics", icon: BarChart3 }],
  },
  {
    label: "System",
    items: [
      { label: "System Health", href: "/admin/system", icon: HeartPulse },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export const flatNav: NavItem[] = navGroups.flatMap((g) => g.items);

/** Human breadcrumb label for a given /admin path segment. */
export const segmentLabels: Record<string, string> = {
  admin: "Admin",
  interns: "Interns",
  applications: "Applications",
  mentors: "Mentors",
  faculty: "Faculty",
  domains: "Domains & Roadmaps",
  hackathons: "Hackathon Manager",
  sessions: "Live Sessions",
  attendance: "Attendance",
  payments: "Payments",
  activations: "Manual Activation",
  certification: "Certification",
  certificates: "Certificates",
  "certificate-templates": "Templates",
  verify: "Verification",
  notifications: "Notifications",
  announcements: "Announcements",
  email: "Email Campaigns",
  analytics: "Analytics",
  activity: "Activity",
  system: "System Health",
  settings: "Settings",
};
