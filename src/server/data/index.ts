import { uuid } from "../crypto";
import { config } from "../config";
import { createFirebaseStore } from "./firebase";

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
  year?: string;
  city?: string;
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
  if (globalRef.__kttStore && globalRef.__kttBackend === config.dataBackend) {
    return globalRef.__kttStore;
  }
  // createFirebaseStore is import-safe: the firebase-admin runtime is only
  // dynamically imported inside getAdminDb() when a Firestore method is called.
  const store: DataStore = config.dataBackend === "firebase" ? createFirebaseStore() : new MemoryDataStore();
  globalRef.__kttStore = store;
  globalRef.__kttBackend = config.dataBackend;
  return store;
}
