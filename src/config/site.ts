/**
 * Central site configuration — the single source of truth for confirmed
 * Kick To Tech business content preserved from the legacy site.
 *
 * Values here are REAL, observed facts. Anything that must come from the
 * backend later (live counts, event lists, etc.) is NOT hardcoded here —
 * it flows through the service layer instead.
 */

export const siteConfig = {
  name: "KICK To TECH",
  shortName: "Kick To Tech",
  url: "https://kicktotech.in",
  description:
    "Pune's student tech community building the bridge between education and employability through workshops, hackathons, mentorship, and industry-grade internships.",
  tagline: "Building Student Talent Infrastructure",
  founderQuote: "Building the bridge between education and employability.",
  credentials: ["MSME Registered", "MoU with JSPM University", "1000+ Student Network", "450+ Internships Completed"],
  contact: {
    email: "hello@kicktotech.in",
    internshipEmail: "internships@kicktotech.in",
    phone: "+91-80074-00498",
    location: "Pune, India",
  },
  social: {
    instagram: "https://www.instagram.com/kicktotech?igsh=MW00Y2J4NWw0eHExMQ==",
    linkedin: "https://www.linkedin.com/company/kick-to-tech-club/",
    twitter: "https://x.com/KickToTech",
    whatsapp: "https://chat.whatsapp.com/GzSIlt641gPDTTJPB0f8WE",
  },
  founder: {
    name: "Mayur Patil",
    role: "Founder, Kick To Tech",
    linkedin: "https://www.linkedin.com/in/mayurpatil01/",
  },
} as const;

/** Primary navigation — preserves the legacy information architecture. */
export const mainNav = [
  { label: "Home", href: "/" },
  { label: "About Us", href: "/about" },
  { label: "Events", href: "/events" },
  { label: "Community", href: "/community" },
  { label: "Team", href: "/team" },
  { label: "Gallery", href: "/gallery" },
  { label: "Blog", href: "/blog" },
  { label: "Contact", href: "/contact" },
  { label: "Internship", href: "/internship" },
] as const;

export const footerNav = {
  explore: [
    { label: "Home", href: "/" },
    { label: "About Us", href: "/about" },
    { label: "Events", href: "/events" },
    { label: "Community", href: "/community" },
    { label: "Team", href: "/team" },
    { label: "Gallery", href: "/gallery" },
    { label: "Blog", href: "/blog" },
  ],
  programs: [
    { label: "Internship", href: "/internship" },
    { label: "Register", href: "/internship/register" },
    { label: "Verify Certificate", href: "/verify_cert" },
    { label: "Collaborate", href: "/collaborate" },
    { label: "Partners", href: "/partners" },
    { label: "Join Community", href: "/join" },
  ],
  legal: [
    { label: "Terms", href: "/terms" },
    { label: "Contact", href: "/contact" },
  ],
} as const;
