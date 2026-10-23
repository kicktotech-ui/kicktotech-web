/**
 * Strongly-typed domain contracts for Kick To Tech 2.0.
 * These mirror the legacy Firestore collection concepts but are UI-owned
 * contracts — services map backend shapes onto these types.
 */

export type Role = "student" | "company" | "intern" | "mentor" | "faculty" | "admin";

export type AsyncStatus = "idle" | "loading" | "success" | "error" | "empty";

export interface Result<T> {
  ok: boolean;
  data?: T;
  error?: string;
}

export interface User {
  uid: string;
  name: string;
  email: string;
  phone?: string;
  role: Role;
  avatarUrl?: string;
  createdAt: string;
}

export interface Profile extends User {
  college?: string;
  company?: string;
  address?: string;
  dob?: string;
  bio?: string;
  emailVerified?: boolean;
}

export interface AuthResult {
  user: User | null;
  error?: string;
  emailVerified?: boolean;
  needsVerification?: boolean;
}

export type EventStatus = "upcoming" | "ongoing" | "past";
export type EventCategory = "workshop" | "hackathon" | "meetup" | "talk" | "bootcamp";

export interface EventItem {
  id: string;
  slug: string;
  title: string;
  summary: string;
  description: string;
  category: EventCategory;
  status: EventStatus;
  date: string;
  location: string;
  organizer: string;
  /** Real photo when available; otherwise a generative cover is derived from `id`. */
  imageUrl?: string;
  tags: string[];
  registrationOpen: boolean;
}

export interface EventRegistration {
  eventId: string;
  name: string;
  email: string;
  phone: string;
  college: string;
  role: string;
  comments?: string;
}

export interface InternshipDomain {
  id: string;
  title: string;
  tagline: string;
  description: string;
  icon: string;
  accent: string;
  skills: string[];
  mentor?: string;
  mentorImage?: string;
}

export interface InternshipProgram {
  domains: InternshipDomain[];
  priceRupees: number;
  durationLabel: string;
  seatsLabel: string;
  perks: string[];
}

export type PaymentStatus =
  | "idle"
  | "loading"
  | "success"
  | "failure"
  | "cancelled"
  | "already-paid";

export interface EnrollmentDraft {
  domainId: string;
  personal: { name: string; email: string; phone: string };
  academic: { college: string; year: string; city: string };
}

export interface Enrollment {
  id: string;
  domainId: string;
  domainTitle: string;
  status: "pending" | "active" | "completed";
  paymentStatus: PaymentStatus;
  enrolledAt: string;
  progress: number;
  certificateId?: string;
}

export interface Certificate {
  certificateId: string;
  internName: string;
  domainTitle: string;
  issuedOn: string;
  durationLabel: string;
  mentorName: string;
  valid: boolean;
}

export interface Partner {
  id: string;
  name: string;
  category: "community" | "academic" | "industry";
  logoUrl?: string;
  url?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  domain?: string;
  /** Real portrait path in /public/team. Preferred visual. */
  photo?: string;
  /** CSS object-position to frame each portrait correctly. */
  objectPosition?: string;
  bio?: string;
  skills?: string[];
  linkedin?: string;
  featured?: boolean;
}

export interface GalleryItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
  width: number;
  height: number;
}

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  content: string;
  category: string;
  author: string;
  coverUrl: string;
  publishedAt: string;
  readingMinutes: number;
}

export interface ContactSubmission {
  name: string;
  email: string;
  message: string;
}

export interface CollaborationSubmission {
  organization: string;
  contactName: string;
  email: string;
  type: "company" | "college" | "community" | "organization";
  message: string;
}

export interface Stat {
  label: string;
  value: number;
  suffix?: string;
}

export interface HackathonScheduleItem {
  id: string;
  time: string;
  title: string;
  description?: string;
  status?: "upcoming" | "live" | "completed";
}

export interface HackathonResourceItem {
  id: string;
  title: string;
  url: string;
  description?: string;
  type?: "link" | "document" | "code" | "community";
}

export interface HackathonDashboardConfig {
  eventName: string;
  tagline: string;
  description: string;
  date: string;
  time: string;
  reportingTime: string;
  venue: string;
  mode: string;
  theme: string;
  prizePool: string;
  announcement?: string;
  announcementActive?: boolean;
  whatsappGroupUrl?: string;
  discordUrl?: string;
  officialPortalUrl?: string;
  submissionUrl?: string;
  contactEmail?: string;
  contactPhone?: string;
  schedule: HackathonScheduleItem[];
  resources: HackathonResourceItem[];
  updatedAt?: string;
}

export interface HackathonParticipantRecord {
  id: string;
  applicationId: string;
  kttId?: string;
  name: string;
  email: string;
  phone: string;
  college?: string;
  course?: string;
  year?: string;
  teamName?: string;
  amount: number;
  status: "PAYMENT_PENDING" | "PAYMENT_PROOF_SUBMITTED" | "PAYMENT_VERIFIED" | "PAYMENT_REJECTED" | "CERTIFICATE_ISSUED";
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  createdAt: string;
}

