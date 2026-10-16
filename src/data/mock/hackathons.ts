/**
 * Hackathon entries for the Hackathon page.
 *
 * NOTE: No event specifics (dates, venues, themes, prizes, sponsors,
 * eligibility, or registration links) are fabricated. All three entries use
 * the SAME information structure and are presented as "Coming Soon" until the
 * community publishes official details. Confirmed fields can be filled in later
 * by setting the optional *Label properties and `registrationOpen` / `registerHref`.
 */

export interface HackathonEntry {
  id: string;
  /** Neutral, non-fabricated title. */
  title: string;
  /** Generic, honest description — no invented themes or prizes. */
  description: string;
  /** Lifecycle label shown on the status badge. */
  status: "Upcoming" | "Coming Soon";
  /** Confirmed fields only — left undefined → rendered as "To Be Announced". */
  dateLabel?: string;
  modeLabel?: string;
  themeLabel?: string;
  eligibilityLabel?: string;
  /** Registration is closed until the community opens it. */
  registrationOpen: boolean;
  registerHref?: string;
  /** Accent color for the card's visual treatment. */
  accent: string;
}

export const hackathons: HackathonEntry[] = [
  {
    id: "edition-1",
    title: "Hackathon · Edition I",
    description:
      "Our upcoming flagship hackathon, where students form teams and turn ambitious ideas into working prototypes over an intense build sprint. Full details will be announced soon.",
    status: "Coming Soon",
    registrationOpen: false,
    accent: "#22e3d6",
  },
  {
    id: "edition-2",
    title: "Hackathon · Edition II",
    description:
      "A hands-on building challenge focused on real-world problem solving, mentorship, and collaboration. The theme and schedule will be shared ahead of the event.",
    status: "Coming Soon",
    registrationOpen: false,
    accent: "#3b82f6",
  },
  {
    id: "edition-3",
    title: "Hackathon · Edition III",
    description:
      "A community-wide innovation sprint bringing together builders, designers, and problem-solvers from across the network. Announcements coming soon.",
    status: "Coming Soon",
    registrationOpen: false,
    accent: "#a855f7",
  },
];
