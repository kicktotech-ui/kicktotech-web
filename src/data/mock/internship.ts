import type { InternshipDomain, InternshipProgram } from "@/types";

/** Real internship domains + pricing/duration preserved from the legacy site. */
export const internshipDomains: InternshipDomain[] = [
  {
    id: "python",
    title: "Python Development + Project",
    tagline: "Build AI-powered projects with Python",
    description:
      "Learn Python development, APIs, practical programming, and project implementation.",
    icon: "Brain",
    accent: "#3b82f6",
    skills: ["Python", "APIs", "Data handling", "AI/ML basics", "Project delivery"],
    mentor: "Omkar Pawar",
    mentorImage: "/team/omkar-pawar.jpeg",
  },
  {
    id: "java",
    title: "Java Development + Project",
    tagline: "Engineer robust backend systems",
    description:
      "Learn core Java, object-oriented programming, collections, backend fundamentals, and practical project development.",
    icon: "Coffee",
    accent: "#f59e0b",
    skills: ["Java", "OOP", "Collections", "Backend basics", "Project delivery"],
    mentor: "Pooja Kolekar",
    mentorImage: "/team/pooja-kolekar.jpg",
  },
];

export const internshipProgram: InternshipProgram = {
  domains: internshipDomains,
  priceRupees: 449,
  durationLabel: "5 Weeks (18 May 2026 - 21 June 2026)",
  seatsLabel: "Limited Seats Available",
  perks: [
    "Real-world project work",
    "Industry-standard mentorship",
    "Verifiable completion certificate",
    "Community + placement guidance",
  ],
};
