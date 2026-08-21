import { getAdminDb } from "./firebase/admin";
import type {
  Intern, Certificate, Mentor, Activation, AdminNotification, DomainSlug,
  InternStatus, PaymentStatus, CertStatus, ActivationStatus, NotificationType,
  Application, ApplicationStatus,
} from "@/lib/admin/types";

/**
 * Admin READ layer — maps the REAL existing Firestore collections of
 * kicktotech-c6e18 to the admin UI models. READ-ONLY. Collections without a
 * dedicated backing store return empty (honest), never fabricated rows.
 */

type Doc = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
function iso(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return new Date(v).toISOString();
  if (typeof v === "object") {
    const o = v as { toDate?: unknown; seconds?: unknown; _seconds?: unknown };
    // Firestore Timestamp instance.
    if (typeof o.toDate === "function") return (o as { toDate: () => Date }).toDate().toISOString();
    // Serialized Timestamp shape: { seconds | _seconds, ... }.
    const secs = typeof o.seconds === "number" ? o.seconds : typeof o._seconds === "number" ? o._seconds : null;
    if (secs != null) return new Date(secs * 1000).toISOString();
  }
  return "";
}
const COLORS = ["#0057ff", "#f5c400", "#16a34a", "#dc2626", "#7c3aed", "#0891b2", "#ea580c"];
const color = (seed: string) => COLORS[[...seed].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

function normalizeDomain(v: unknown): DomainSlug {
  const s = str(v).toLowerCase().replace(/[\s_]+/g, "-");
  if (s.includes("python")) return "python";
  if (s.includes("java")) return "java";
  if (s.includes("data")) return "data-analytics";
  if (s.includes("cyber") || s.includes("security")) return "cybersecurity";
  return "python"; // display fallback for non-standard values
}
function up(v: unknown) { return str(v).toUpperCase(); }
function internStatus(v: unknown): InternStatus {
  const s = up(v);
  return (["APPLIED", "PENDING", "APPROVED", "ACTIVE", "PAUSED", "COMPLETED", "REJECTED", "CANCELLED"] as string[]).includes(s) ? (s as InternStatus) : "ACTIVE";
}
function payStatus(v: unknown): PaymentStatus {
  const s = up(v);
  if (s.includes("PAID")) return "PAID";
  if (s.includes("FAIL")) return "FAILED";
  if (s.includes("REFUND")) return "REFUNDED";
  return "PENDING";
}
function certUiStatus(v: unknown): CertStatus {
  const s = up(v);
  if (s.includes("REVOK")) return "REVOKED";
  if (s.includes("PENDING")) return "PENDING";
  if (s.includes("GENERAT")) return "GENERATED";
  if (s.includes("ELIG")) return "ELIGIBLE";
  if (s.includes("FAIL")) return "FAILED";
  return "ISSUED";
}
function actStatus(v: unknown): ActivationStatus {
  const s = up(v);
  if (s.includes("USED") || s.includes("COMPLET")) return "USED";
  if (s.includes("EXPIR")) return "EXPIRED";
  if (s.includes("REVOK")) return "REVOKED";
  return "AVAILABLE";
}
function notifType(v: unknown): NotificationType {
  const s = up(v);
  return (["INFO", "SUCCESS", "WARNING", "URGENT"] as string[]).includes(s) ? (s as NotificationType) : "INFO";
}

// ---- mappers --------------------------------------------------------------

const mapIntern = (id: string, d: Doc): Intern => ({
  id,
  internId: str(d.internId) || id,
  name: str(d.name),
  email: str(d.email),
  phone: str(d.phone),
  college: str(d.college),
  domainId: normalizeDomain(d.domain),
  status: internStatus(d.status),
  paymentStatus: payStatus(d.paymentStatus),
  certificateStatus: d.certificate ? "ISSUED" : "NOT_READY",
  progress: Math.max(0, Math.min(100, num(d.progress))),
  mentorId: undefined,
  joinedAt: iso(d.createdAt),
  avatarColor: color(id),
});

const mapCert = (id: string, d: Doc): Certificate => ({
  id,
  certificateId: str(d.certificateId),
  internName: str(d.name),
  internRef: str(d.internId),
  internEmail: str(d.email) || undefined,
  domainId: normalizeDomain(d.domain),
  program: str(d.courseTitle),
  grade: str(d.grade),
  status: certUiStatus(d.status),
  issuedAt: iso(d.issuedAt) || undefined,
  durationLabel: str(d.duration),
});

const mapMentor = (id: string, d: Doc): Mentor => {
  const email = str(d.email);
  const name = str(d.name) || (email.includes("@") ? email.split("@")[0].replace(/[._]/g, " ") : email);
  return {
    id, name, email, phone: str(d.phone), bio: "",
    skills: [], domainIds: d.domain ? [normalizeDomain(d.domain)] : [],
    experienceYears: 0, assignedInterns: 0, sessions: 0,
    status: str(d.status).toLowerCase() === "inactive" ? "INACTIVE" : "ACTIVE",
    avatarColor: color(id),
  };
};

const mapActivation = (id: string, d: Doc): Activation => ({
  id,
  code: str(d.pin) || str(d.code),
  internName: d.name ? str(d.name) : undefined,
  internEmail: d.email ? str(d.email) : undefined,
  domainId: normalizeDomain(d.domain),
  status: actStatus(d.status),
  createdAt: iso(d.createdAt),
  expiresAt: iso(d.expiresAt),
  usedAt: d.usedAt ? iso(d.usedAt) : undefined,
});

const mapNotification = (id: string, d: Doc): AdminNotification => ({
  id,
  title: str(d.title),
  message: str(d.message),
  type: notifType(d.type),
  target: "ALL",
  createdAt: iso(d.createdAt),
  source: "ADMIN",
  delivered: num(d.delivered),
});

function appStatus(v: unknown, payment?: unknown): ApplicationStatus {
  const s = up(v);
  if (["NEW", "UNDER_REVIEW", "APPROVED", "REJECTED", "PAYMENT_PENDING", "ACTIVATED"].includes(s)) return s as ApplicationStatus;
  if (s.includes("APPROV")) return "APPROVED";
  if (s.includes("REJECT")) return "REJECTED";
  if (s.includes("ACTIV")) return "ACTIVATED";
  if (s.includes("REVIEW")) return "UNDER_REVIEW";
  const pay = up(payment);
  if (pay && !pay.includes("PAID")) return "PAYMENT_PENDING";
  return "NEW";
}

const mapApplication = (id: string, d: Doc): Application => ({
  id,
  name: str(d.name),
  email: str(d.email),
  phone: str(d.phone),
  college: str(d.college),
  domainId: normalizeDomain(d.domain),
  status: appStatus(d.status, d.paymentStatus),
  appliedAt: iso(d.createdAt) || iso(d.appliedAt),
  reviewNote: d.reviewNote ? str(d.reviewNote) : undefined,
});

interface Mapped { collection: string; map: (id: string, d: Doc) => Record<string, unknown>; searchable: (row: Record<string, unknown>) => string[] }

// Only collections that genuinely exist in Firestore are mapped. Others → empty.
const REGISTRY: Record<string, Mapped> = {
  interns: { collection: "interns", map: mapIntern as unknown as Mapped["map"], searchable: (r) => [r.name, r.email, r.phone, r.internId, r.college].map(String) },
  applications: { collection: "registrations", map: mapApplication as unknown as Mapped["map"], searchable: (r) => [r.name, r.email, r.phone, r.college].map(String) },
  certificates: { collection: "certificates", map: mapCert as unknown as Mapped["map"], searchable: (r) => [r.certificateId, r.internName, r.internRef, r.internEmail, r.program].map(String) },
  mentors: { collection: "mentor_users", map: mapMentor as unknown as Mapped["map"], searchable: (r) => [r.name, r.email].map(String) },
  activations: { collection: "manual_activations", map: mapActivation as unknown as Mapped["map"], searchable: (r) => [r.code, r.internName, r.internEmail].map(String) },
  notifications: { collection: "notifications", map: mapNotification as unknown as Mapped["map"], searchable: (r) => [r.title, r.message].map(String) },
};

export interface QueryOpts { search?: string; page: number; pageSize: number; filters?: Record<string, string | undefined>; id?: string }
export interface QueryResult { rows: Record<string, unknown>[]; total: number; row?: Record<string, unknown> | null }

/**
 * Upper bound on docs scanned when a text search or (normalized) filter is
 * active. Firestore cannot do substring search or match our normalized enums
 * server-side, so those queries scan in memory — but bounded, to protect the
 * project's Firestore read quota. Covers current collection sizes fully.
 */
const MAX_SCAN = 1500;

function applyFilters(rows: Record<string, unknown>[], def: Mapped, opts: QueryOpts): Record<string, unknown>[] {
  let out = rows;
  if (opts.search) {
    const q = opts.search.toLowerCase();
    out = out.filter((r) => def.searchable(r).some((v) => v.toLowerCase().includes(q)));
  }
  for (const [key, val] of Object.entries(opts.filters ?? {})) {
    if (!val) continue;
    if (key === "domain") out = out.filter((r) => r.domainId === val);
    else if (key === "status") out = out.filter((r) => String(r.status) === val);
    else if (key === "payment") out = out.filter((r) => String(r.paymentStatus) === val);
    else if (key === "type") out = out.filter((r) => String(r.type) === val);
  }
  return out;
}

/**
 * Read + map a known collection. Unknown collections return empty (honest).
 *
 * Quota-safe: plain browsing uses Firestore `count()` + `offset/limit` so a page
 * reads only `pageSize` docs (not the whole collection). Search/filter falls
 * back to a BOUNDED in-memory scan (MAX_SCAN) because Firestore can't express
 * substring search or our normalized enums.
 */
export async function queryCollection(name: string, opts: QueryOpts): Promise<QueryResult> {
  const def = REGISTRY[name];
  if (!def) return { rows: [], total: 0, row: opts.id ? null : undefined };

  const db = await getAdminDb();
  const colRef = db.collection(def.collection);

  if (opts.id) {
    const doc = await colRef.doc(opts.id).get();
    return { rows: [], total: doc.exists ? 1 : 0, row: doc.exists ? def.map(doc.id, doc.data() as Doc) : null };
  }

  const hasSearch = Boolean(opts.search);
  const hasFilter = Object.values(opts.filters ?? {}).some(Boolean);

  // Fast path — no search/filter: server-side pagination, minimal reads.
  if (!hasSearch && !hasFilter) {
    const countSnap = await colRef.count().get();
    const total = countSnap.data().count;
    const offset = (opts.page - 1) * opts.pageSize;
    const pageSnap = await colRef.offset(offset).limit(opts.pageSize).get();
    const rows = pageSnap.docs.map((d) => def.map(d.id, d.data() as Doc));
    return { rows, total };
  }

  // Search/filter path — bounded scan, filtered + paginated in memory.
  const scan = await colRef.limit(MAX_SCAN).get();
  const mapped = scan.docs.map((d) => def.map(d.id, d.data() as Doc));
  const filtered = applyFilters(mapped, def, opts);
  const total = filtered.length;
  const start = (opts.page - 1) * opts.pageSize;
  return { rows: filtered.slice(start, start + opts.pageSize), total };
}
