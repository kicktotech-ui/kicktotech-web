import { uuid } from "../crypto";
import { config } from "../config";
import { createFirebaseStore } from "./firebase";
import { isAdminConfigured } from "../firebase/admin";

/**
 * Data layer — entity types + an ASYNC, Firestore-friendly DataStore interface.
 *
 * Two implementations:
 *  - MemoryDataStore  → local dev / tests (explicit, chosen via DATA_BACKEND=memory)
 *  - FirebaseDataStore→ real Cloud Firestore (DATA_BACKEND=firebase)
 *
 * There is NO silent fallback: if DATA_BACKEND=firebase and Firebase is
 * unavailable/unconfigured, store methods throw — the UI shows a real error
 * state rather than fabricated data.
 */

// ---- Entity types ---------------------------------------------------------

export type AccountType = "student" | "admin";
export type StudentRole = "student" | "company" | "intern" | "mentor" | "faculty";
export type AdminRole = "SUPER_ADMIN" | "ADMIN" | "MANAGER" | "MENTOR" | "FACULTY" | "VIEWER";
export type UserStatus = "active" | "disabled";

export interface UserRecord {
  id: string;
  type: AccountType;
  role: StudentRole | AdminRole;
  name: string;
  email: string;
  phone?: string;
  college?: string;
  company?: string;
  passwordSalt: string;
  passwordHash: string;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
}

export interface SessionRecord {
  id: string;
  userId: string;
  type: AccountType;
  role: string;
  createdAt: string;
  expiresAt: string;
}

/**
 * Certificate status machine:
 *   draft → eligible → issued → revoked
 * Only `issued` is publicly valid. `draft`/`eligible` are pre-issuance states.
 */
export type CertificateStatus = "draft" | "eligible" | "issued" | "revoked";

/** Snapshot of a signatory as it appeared on the certificate when issued. */
export interface CertificateSignatory {
  name: string;
  designation: string;
  signatureAsset: string;
}

export interface CertificateRecord {
  id: string;
  certificateId: string;
  recipientName: string;
  email?: string;
  college?: string;
  program: string;
  domain: string;
  grade?: string;
  durationLabel?: string;
  startDate?: string;
  endDate?: string;
  status: CertificateStatus;
  issuedAt: string;
  revokedAt?: string;
  updatedAt?: string;
  internId?: string;
  issuedBy: string;
  /**
   * Idempotency key (e.g. internId+domain). Used to dedupe issuance so a
   * double-click / retry returns the SAME certificate instead of creating a
   * second one. Unique per issued certificate.
   */
  dedupeKey?: string;
  // ---- Immutable mentor + signatory SNAPSHOT (captured at issuance) --------
  mentorId?: string;
  mentorName?: string;
  mentorDesignation?: string;
  mentorSignatureAsset?: string;
  /** Organization authorized signatories as they appeared at issuance. */
  signatories?: CertificateSignatory[];
}

/**
 * Internship application lifecycle (manual UPI + WhatsApp proof gate):
 *   PAYMENT_PENDING → PAYMENT_PROOF_SUBMITTED → PAYMENT_VERIFIED → CERTIFICATE_ISSUED
 *   PAYMENT_PROOF_SUBMITTED → PAYMENT_REJECTED → PAYMENT_PENDING (retry)
 * There is NO payment gateway; verification is a manual admin action.
 */
export type ApplicationStatus =
  | "PAYMENT_PENDING" | "PAYMENT_PROOF_SUBMITTED" | "PAYMENT_VERIFIED" | "PAYMENT_REJECTED" | "CERTIFICATE_ISSUED";

export interface ApplicationRecord {
  id: string;
  applicationId: string; // human-readable, e.g. APP-2026-7KQ9ZD
  name: string;
  email: string;
  phone: string;
  college?: string;
  prn?: string;
  schoolName?: string;
  division?: string;
  course?: string;
  year?: string;
  city?: string;
  teamName?: string;
  domain: string;
  mentorId?: string;
  mentorName?: string;
  amount: number;
  status: ApplicationStatus;
  createdAt: string;
  updatedAt: string;
  /** Idempotency key (email+domain) — refresh/retry never duplicates. */
  dedupeKey: string;
  reviewNote?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  certificateId?: string;
  /** ISO timestamp set when the confirmation email was successfully sent (duplicate-send guard). */
  confirmationEmailSentAt?: string;
  /** Razorpay payment integration fields */
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  razorpaySignature?: string;
  paymentMethod?: string;
  /** Unique sequential identifier for confirmed hackathon participants (e.g. KTT01, KTT02) */
  kttId?: string;
  /** Internship batch identifier */
  batch?: "batch-1-may-jun-2026" | "batch-2-oct-nov-2026" | string;
}

/**
 * Identifies internship batch:
 * - "batch-1-may-jun-2026": 1st batch (May - Jun 2026), 4 domains, ₹222 fee
 * - "batch-2-oct-nov-2026": 2nd batch (Oct - Nov 2026), 2 domains (Python & Java), ₹449 fee
 */
export function detectBatch(createdAt?: string, amount?: number, domain?: string): "batch-1-may-jun-2026" | "batch-2-oct-nov-2026" {
  if (amount === 222) return "batch-1-may-jun-2026";
  if (amount === 449 && createdAt && createdAt >= "2026-10-01") return "batch-2-oct-nov-2026";
  const d = String(domain || "").toLowerCase();
  if (d.includes("data") || d.includes("analytic") || d.includes("cyber") || d.includes("security")) {
    return "batch-1-may-jun-2026";
  }
  if (createdAt && createdAt >= "2026-10-01") {
    return "batch-2-oct-nov-2026";
  }
  return "batch-1-may-jun-2026";
}

/**
 * Normalizes an amount from any representation:
 * - numbers: 99, 449, 222, or paise (9900, 44900, 22200)
 * - strings: "99", "₹99", "99.00", "449", "₹449", "9900", "222"
 */
export function parseRecordAmount(d: Record<string, unknown> | null | undefined, fallback: number): number {
  if (!d) return fallback;
  const raw =
    d.amount ??
    d.paymentAmount ??
    d.paidAmount ??
    d.amountPaid ??
    d.fee ??
    d.fees ??
    d.price ??
    d.cost ??
    d.charges ??
    d.charge ??
    d.totalAmount ??
    d.total;

  if (typeof raw === "number") {
    if (raw === 9900) return 99;
    if (raw === 44900) return 449;
    if (raw === 22200) return 222;
    if (raw > 0) return raw;
  } else if (typeof raw === "string") {
    const cleaned = raw.replace(/[₹,\s]/g, "");
    const val = parseFloat(cleaned);
    if (!isNaN(val)) {
      if (val === 9900) return 99;
      if (val === 44900) return 449;
      if (val === 22200) return 222;
      if (val > 0) return val;
    }
  }
  return fallback;
}

/**
 * Standard default pricing per domain & batch:
 * - PromptWars Hackathon: ₹99
 * - 1st Batch (May - Jun 2026) across all 4 domains: ₹222
 * - 2nd Batch (Oct - Nov 2026) for Python & Java: ₹449
 */
export function defaultAmountForDomain(domain?: string, isHack?: boolean, batch?: string): number {
  if (isHack) return 99;
  if (batch === "batch-1-may-jun-2026") return 222;
  const d = String(domain || "").toLowerCase();
  if (d.includes("hack") || d.includes("prompt") || d.includes("war")) return 99;
  if (d.includes("data") || d.includes("analytic") || d.includes("cyber") || d.includes("security")) return 222;
  return 449;
}

/**
 * Universal predicate to classify whether a record is a Hackathon / ₹99 payment
 * vs an Internship / ₹449 application.
 */
export function isHackathonRecord(d: Record<string, unknown> | null | undefined): boolean {
  if (!d) return false;

  // 1. Amount match (99 or 9900 paise)
  const amount = parseRecordAmount(d, 0);
  if (amount === 99) return true;

  // 2. Explicit domain check
  const domain = String(d.domain || d.domainId || "").toLowerCase();
  if (
    domain === "hack2skill" ||
    domain.includes("hack") ||
    domain.includes("prompt") ||
    domain.includes("war")
  ) {
    return true;
  }

  // 3. String content checks across candidate fields
  const candidateFields = [
    d.event,
    d.eventName,
    d.program,
    d.courseTitle,
    d.title,
    d.type,
    d.track,
    d.hackathon,
    d.eventTitle,
    d.category,
    d.notes,
    d.description,
    d.course,
  ];

  for (const f of candidateFields) {
    if (typeof f === "string") {
      const lower = f.toLowerCase();
      if (
        lower.includes("hack") ||
        lower.includes("prompt") ||
        lower.includes("war") ||
        lower.includes("hack2skill")
      ) {
        return true;
      }
    }
  }

  // 4. Team registration match (hackathons have teamName without internship mentor)
  if (Boolean(d.teamName) && !d.mentorId && !d.mentorName) {
    if (!domain.includes("python") && !domain.includes("java")) {
      return true;
    }
  }

  return false;
}

export interface AuditRecord {
  id: string;
  ts: string;
  actor: string;
  action: string;
  target?: string;
  result: "SUCCESS" | "FAILED";
  requestId?: string;
  ip?: string;
}

export interface PageResult<T> { rows: T[]; total: number }

// ---- Async DataStore interface (implemented by memory + firebase) ----------

export interface DataStore {
  // users
  findUserByEmail(email: string): Promise<UserRecord | null>;
  getUserById(id: string): Promise<UserRecord | null>;
  createUser(record: UserRecord): Promise<UserRecord>;
  listStudents(opts: { search?: string; page: number; pageSize: number }): Promise<PageResult<UserRecord>>;
  countStudents(activeOnly?: boolean): Promise<number>;
  countAdmins(): Promise<number>;
  // sessions
  createSession(record: SessionRecord): Promise<SessionRecord>;
  getSessionById(id: string): Promise<SessionRecord | null>;
  deleteSession(id: string): Promise<void>;
  // certificates
  createCertificate(record: CertificateRecord): Promise<CertificateRecord>;
  getCertificateByCertId(certificateId: string): Promise<CertificateRecord | null>;
  getCertificateByDedupeKey(dedupeKey: string): Promise<CertificateRecord | null>;
  listCertificates(): Promise<CertificateRecord[]>;
  updateCertificate(id: string, patch: Partial<CertificateRecord>): Promise<CertificateRecord | null>;
  countCertificates(status?: CertificateStatus): Promise<number>;
  countCertificatesByDomain(domain: string): Promise<number>;
  // applications (manual payment gate)
  createApplication(record: ApplicationRecord): Promise<ApplicationRecord>;
  getApplicationById(id: string): Promise<ApplicationRecord | null>;
  getApplicationByAppId(applicationId: string): Promise<ApplicationRecord | null>;
  getApplicationByDedupeKey(dedupeKey: string): Promise<ApplicationRecord | null>;
  getApplicationByRazorpayOrderId(orderId: string): Promise<ApplicationRecord | null>;
  listApplications(): Promise<ApplicationRecord[]>;
  updateApplication(id: string, patch: Partial<ApplicationRecord>): Promise<ApplicationRecord | null>;
  // audit
  appendAudit(record: AuditRecord): Promise<void>;
  newId(): string;
}

// ---- In-memory implementation (local dev / tests) --------------------------

class MemoryDataStore implements DataStore {
  private users = new Map<string, UserRecord>();
  private sessions = new Map<string, SessionRecord>();
  private certificates = new Map<string, CertificateRecord>();
  private applications = new Map<string, ApplicationRecord>();
  private audits: AuditRecord[] = [];

  newId() { return uuid(); }

  async findUserByEmail(email: string) {
    return [...this.users.values()].find((u) => u.email === email) ?? null;
  }
  async getUserById(id: string) { return this.users.get(id) ?? null; }
  async createUser(record: UserRecord) { this.users.set(record.id, record); return record; }
  async listStudents({ search, page, pageSize }: { search?: string; page: number; pageSize: number }) {
    let rows = [...this.users.values()].filter((u) => u.type === "student");
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter((u) => [u.name, u.email, u.phone ?? "", u.college ?? ""].some((v) => v.toLowerCase().includes(q)));
    }
    rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const total = rows.length;
    const start = (page - 1) * pageSize;
    return { rows: rows.slice(start, start + pageSize), total };
  }
  async countStudents(activeOnly?: boolean) {
    return [...this.users.values()].filter((u) => u.type === "student" && (!activeOnly || u.status === "active")).length;
  }
  async countAdmins() { return [...this.users.values()].filter((u) => u.type === "admin").length; }

  async createSession(record: SessionRecord) { this.sessions.set(record.id, record); return record; }
  async getSessionById(id: string) { return this.sessions.get(id) ?? null; }
  async deleteSession(id: string) { this.sessions.delete(id); }

  async createCertificate(record: CertificateRecord) { this.certificates.set(record.id, record); return record; }
  async getCertificateByCertId(certificateId: string) {
    return [...this.certificates.values()].find((c) => c.certificateId === certificateId) ?? null;
  }
  async getCertificateByDedupeKey(dedupeKey: string) {
    return [...this.certificates.values()].find((c) => c.dedupeKey === dedupeKey) ?? null;
  }
  async listCertificates() { return [...this.certificates.values()].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt)); }
  async updateCertificate(id: string, patch: Partial<CertificateRecord>) {
    const cur = this.certificates.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    this.certificates.set(id, next);
    return next;
  }
  async countCertificates(status?: CertificateStatus) {
    return [...this.certificates.values()].filter((c) => !status || c.status === status).length;
  }
  async countCertificatesByDomain(domain: string) {
    return [...this.certificates.values()].filter((c) => c.domain === domain).length;
  }

  async createApplication(record: ApplicationRecord) { this.applications.set(record.id, record); return record; }
  async getApplicationById(id: string) { return this.applications.get(id) ?? null; }
  async getApplicationByAppId(applicationId: string) {
    return [...this.applications.values()].find((a) => a.applicationId === applicationId) ?? null;
  }
  async getApplicationByDedupeKey(dedupeKey: string) {
    return [...this.applications.values()].find((a) => a.dedupeKey === dedupeKey) ?? null;
  }
  async getApplicationByRazorpayOrderId(orderId: string) {
    return [...this.applications.values()].find((a) => a.razorpayOrderId === orderId) ?? null;
  }
  async listApplications() { return [...this.applications.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  async updateApplication(id: string, patch: Partial<ApplicationRecord>) {
    const cur = this.applications.get(id);
    if (!cur) return null;
    const next = { ...cur, ...patch };
    this.applications.set(id, next);
    return next;
  }

  async appendAudit(record: AuditRecord) { this.audits.push(record); }
}

// ---- Store selection (no silent fallback) ----------------------------------

const globalRef = globalThis as unknown as { __kttStore?: DataStore; __kttBackend?: string };

export function getStore(): DataStore {
  const useFirebase = config.dataBackend === "firebase" || isAdminConfigured();
  const effectiveBackend = useFirebase ? "firebase" : "memory";
  if (globalRef.__kttStore && globalRef.__kttBackend === effectiveBackend) {
    return globalRef.__kttStore;
  }
  // createFirebaseStore is import-safe: the firebase-admin runtime is only
  // dynamically imported inside getAdminDb() when a Firestore method is called.
  const store: DataStore = useFirebase ? createFirebaseStore() : new MemoryDataStore();
  globalRef.__kttStore = store;
  globalRef.__kttBackend = effectiveBackend;
  return store;
}
