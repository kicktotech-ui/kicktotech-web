/**
 * KICK TO TECH — Admin Platform V2 domain models.
 * These are the single source of truth for the admin UI. The service layer
 * returns these shapes today from mock data and, in Phase 2, from a real API —
 * without the UI changing.
 */

// ---- Shared ---------------------------------------------------------------

export type ID = string;

export type DomainSlug = "python" | "java" | "data-analytics" | "cybersecurity";

export interface Paginated<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface QueryParams {
  search?: string;
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortDir?: "asc" | "desc";
  filters?: Record<string, string | undefined>;
}

// ---- Access control (RBAC-ready) ------------------------------------------

export type Role = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "MENTOR" | "FACULTY" | "VIEWER";

export type Permission =
  | "intern.read" | "intern.create" | "intern.update" | "intern.delete"
  | "application.read" | "application.update"
  | "domain.read" | "domain.update"
  | "session.read" | "session.create" | "session.update"
  | "payment.read" | "payment.update"
  | "certificate.read" | "certificate.generate" | "certificate.issue"
  | "notification.create"
  | "analytics.read"
  | "system.read";

export interface AdminUser {
  id: ID;
  name: string;
  email: string;
  role: Role;
  avatarColor: string;
  lastActiveAt: string;
}

// ---- Interns --------------------------------------------------------------

export type InternStatus =
  | "APPLIED" | "PENDING" | "APPROVED" | "ACTIVE" | "PAUSED" | "COMPLETED" | "REJECTED" | "CANCELLED";

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type CertificateStatus = "NOT_READY" | "IN_PROGRESS" | "READY" | "ISSUED";

export interface Intern {
  id: ID;
  internId: string; // e.g. KTT/INT/2026/S9707
  name: string;
  email: string;
  phone: string;
  college: string;
  domainId: DomainSlug;
  status: InternStatus;
  paymentStatus: PaymentStatus;
  certificateStatus: CertificateStatus;
  progress: number; // 0..100
  grade?: string;
  mentorId?: ID;
  joinedAt: string;
  avatarColor: string;
}

// ---- Applications ---------------------------------------------------------

export type ApplicationStatus =
  | "NEW" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "PAYMENT_PENDING" | "ACTIVATED";

export interface Application {
  id: ID;
  name: string;
  email: string;
  phone: string;
  college: string;
  domainId: DomainSlug;
  status: ApplicationStatus;
  appliedAt: string;
  reviewNote?: string;
}

// ---- Domains --------------------------------------------------------------

export interface RoadmapModule {
  id: ID;
  title: string;
  kind: "week" | "project" | "assessment" | "certification";
  durationLabel: string;
  summary: string;
}

export interface Domain {
  id: DomainSlug;
  title: string;
  slug: string;
  description: string;
  priceRupees: number;
  originalPriceRupees: number;
  durationLabel: string;
  enrolled: number;
  completionRate: number; // 0..100
  accent: string;
  roadmap: RoadmapModule[];
  resources: { id: ID; title: string; type: "video" | "doc" | "repo" | "link" }[];
}

// ---- Mentors & Faculty ----------------------------------------------------

export interface Mentor {
  id: ID;
  name: string;
  email: string;
  phone: string;
  bio: string;
  skills: string[];
  domainIds: DomainSlug[];
  experienceYears: number;
  assignedInterns: number;
  sessions: number;
  status: "ACTIVE" | "INACTIVE";
  avatarColor: string;
}

export interface Faculty {
  id: ID;
  name: string;
  designation: string;
  department: string;
  college: string;
  email: string;
  phone: string;
  domainIds: DomainSlug[];
  status: "ACTIVE" | "INACTIVE";
}

// ---- Sessions & Attendance ------------------------------------------------

export type SessionStatus = "UPCOMING" | "LIVE" | "COMPLETED" | "CANCELLED";

export interface LiveSession {
  id: ID;
  title: string;
  domainId: DomainSlug;
  mentorId: ID;
  mentorName: string;
  date: string; // ISO date
  startTime: string; // HH:mm
  endTime: string;
  meetingUrl: string;
  status: SessionStatus;
  attendees: number;
  capacity: number;
}

export type AttendanceState = "PRESENT" | "ABSENT" | "LATE" | "EXCUSED";

export interface AttendanceRecord {
  id: ID;
  internId: string;
  internName: string;
  sessionTitle: string;
  domainId: DomainSlug;
  date: string;
  state: AttendanceState;
}

// ---- Payments -------------------------------------------------------------

export interface Payment {
  id: ID;
  paymentId: string; // e.g. PAY_KTT_00231
  internName: string;
  internRef: string;
  amountRupees: number;
  domainId: DomainSlug;
  status: PaymentStatus;
  method: "UPI" | "Card" | "NetBanking" | "Manual";
  referenceId: string;
  date: string;
}

// ---- Activation -----------------------------------------------------------

export type ActivationStatus = "AVAILABLE" | "USED" | "EXPIRED" | "REVOKED";

export interface Activation {
  id: ID;
  code: string;
  internName?: string;
  internEmail?: string;
  domainId: DomainSlug;
  status: ActivationStatus;
  createdAt: string;
  expiresAt: string;
  usedAt?: string;
}

// ---- Certificates ---------------------------------------------------------

export type CertStatus = "ELIGIBLE" | "PENDING" | "GENERATED" | "ISSUED" | "FAILED" | "REVOKED";

export interface Certificate {
  id: ID;
  certificateId: string; // e.g. KTT-2026-4483
  internName: string;
  internRef: string;
  internEmail?: string;
  domainId: DomainSlug;
  program: string;
  grade: string;
  status: CertStatus;
  issuedAt?: string;
  durationLabel: string;
}

// ---- Communication --------------------------------------------------------

export type NotificationType = "INFO" | "SUCCESS" | "WARNING" | "URGENT";

export type NotificationTarget =
  | "ALL" | "PAID" | "ACTIVE" | "COMPLETED"
  | "DOMAIN_PYTHON" | "DOMAIN_JAVA" | "DOMAIN_DATA" | "DOMAIN_CYBER";

export interface AdminNotification {
  id: ID;
  title: string;
  message: string;
  type: NotificationType;
  target: NotificationTarget;
  createdAt: string;
  source: "ADMIN" | "SYSTEM";
  delivered: number;
}

export interface EmailCampaign {
  id: ID;
  name: string;
  subject: string;
  audience: string;
  recipients: number;
  sent: number;
  status: "DRAFT" | "SCHEDULED" | "SENT";
  updatedAt: string;
}

// ---- Activity log ---------------------------------------------------------

export type ActivityAction =
  | "CREATE" | "UPDATE" | "DELETE" | "APPROVE" | "REJECT"
  | "ACTIVATE" | "SUSPEND" | "GENERATE" | "ISSUE" | "SEND";

export interface ActivityLog {
  id: ID;
  timestamp: string;
  admin: string;
  action: ActivityAction;
  entity: string;
  entityId: string;
  status: "SUCCESS" | "FAILED";
  ip: string;
}

// ---- Analytics ------------------------------------------------------------

export interface TrendPoint {
  label: string;
  value: number;
}

export interface Metric {
  key: string;
  label: string;
  value: number;
  format: "number" | "currency" | "percent";
  changePct: number;
  trend: number[];
}

export interface DashboardData {
  metrics: Metric[];
  enrollmentTrend: TrendPoint[];
  revenueTrend: TrendPoint[];
  domainDistribution: { domainId: DomainSlug; label: string; value: number; accent: string }[];
  funnel: { label: string; value: number }[];
}

export interface SystemService {
  name: string;
  state: "OPERATIONAL" | "MOCK" | "NOT_CONNECTED" | "DEV_MODE";
  detail: string;
}
