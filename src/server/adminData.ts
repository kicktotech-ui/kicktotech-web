import { getMongoDb } from "./data/mongodb";
import { isInternshipMaintenance } from "@/config/features";
import type {
  Intern, Certificate, Mentor, Activation, AdminNotification, DomainSlug,
  InternStatus, PaymentStatus, CertStatus, ActivationStatus, NotificationType,
  Application, ApplicationStatus,
} from "@/lib/admin/types";

type Doc = Record<string, unknown>;
const str = (v: unknown) => (typeof v === "string" ? v : v == null ? "" : String(v));
const num = (v: unknown) => (typeof v === "number" ? v : Number(v) || 0);
function iso(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number") return new Date(v).toISOString();
  if (typeof v === "object" && v instanceof Date) return v.toISOString();
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
  return "python";
}

function up(v: unknown) { return str(v).toUpperCase(); }

function internStatus(v: unknown): InternStatus {
  const s = up(v);
  return (["APPLIED", "PENDING", "APPROVED", "ACTIVE", "PAUSED", "COMPLETED", "REJECTED", "CANCELLED"] as string[]).includes(s) ? (s as InternStatus) : "ACTIVE";
}

function payStatus(v: unknown): PaymentStatus {
  const s = up(v);
  if (s.includes("PAID") || s.includes("VERIF")) return "PAID";
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
  internId: str(d.internId || d.id || id),
  name: str(d.name),
  email: str(d.email),
  phone: str(d.phone),
  college: str(d.college),
  domainId: normalizeDomain(d.domain),
  status: internStatus(d.status),
  paymentStatus: payStatus(d.paymentStatus),
  certificateStatus: d.certificateId || d.certificate ? "ISSUED" : "NOT_READY",
  progress: Math.max(0, Math.min(100, num(d.progress))),
  mentorId: str(d.mentorId) || undefined,
  joinedAt: iso(d.createdAt),
  avatarColor: color(id),
});

const mapCert = (id: string, d: Doc): Certificate => ({
  id,
  certificateId: str(d.certificateId),
  internName: str(d.recipientName || d.name),
  internRef: str(d.internId),
  internEmail: str(d.email) || undefined,
  domainId: normalizeDomain(d.domain),
  program: str(d.program || d.courseTitle),
  grade: str(d.grade),
  status: certUiStatus(d.status),
  issuedAt: iso(d.issuedAt) || undefined,
  durationLabel: str(d.durationLabel || d.duration),
});

const mapMentor = (id: string, d: Doc): Mentor => {
  const email = str(d.email);
  const name = str(d.name) || (email.includes("@") ? email.split("@")[0].replace(/[._]/g, " ") : email);
  return {
    id, name, email, phone: str(d.phone), bio: str(d.bio),
    skills: Array.isArray(d.skills) ? d.skills.map(String) : [],
    domainIds: d.domain ? [normalizeDomain(d.domain)] : [],
    experienceYears: num(d.experienceYears),
    assignedInterns: num(d.assignedInterns),
    sessions: num(d.sessions),
    status: str(d.status).toLowerCase() === "inactive" ? "INACTIVE" : "ACTIVE",
    avatarColor: color(id),
  };
};

const mapActivation = (id: string, d: Doc): Activation => ({
  id,
  code: str(d.pin || d.code),
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
  if (s.includes("VERIF") || s.includes("APPROV")) return "APPROVED";
  if (s.includes("REJECT")) return "REJECTED";
  if (s.includes("ACTIV")) return "ACTIVATED";
  if (s.includes("REVIEW") || s.includes("SUBMIT")) return "UNDER_REVIEW";
  const pay = up(payment);
  if (pay && !pay.includes("PAID") && !pay.includes("VERIF")) return "PAYMENT_PENDING";
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

const mapPayment = (id: string, d: Doc): Record<string, unknown> => {
  const methodRaw = str(d.paymentMethod || d.method || "Razorpay / UPI");
  const method = methodRaw.toLowerCase().includes("card")
    ? "Card"
    : methodRaw.toLowerCase().includes("net")
    ? "NetBanking"
    : methodRaw.toLowerCase().includes("manual")
    ? "Manual"
    : "UPI";
  const amountRupees =
    num(d.amountRupees) ||
    num(d.amount) ||
    (num(d.amountPaise) ? Math.round(num(d.amountPaise) / 100) : 449);
  return {
    id,
    paymentId: str(d.razorpayPaymentId || d.razorpay_payment_id || d.paymentId || d.applicationId || id),
    orderId: str(d.razorpayOrderId || d.razorpay_order_id || d.orderId || ""),
    internName: str(d.name || d.fullName || d.applicantName || "Student"),
    internRef: str(d.internId || d.applicationId || id),
    internEmail: str(d.email || d.userEmail || ""),
    amountRupees,
    amount: amountRupees,
    domainId: normalizeDomain(d.domain || d.domainId || "python"),
    status: payStatus(d.paymentStatus || d.status),
    method,
    referenceId: str(d.razorpayPaymentId || d.upiRef || d.utr || d.paymentId || id),
    date: iso(d.createdAt || d.appliedAt || d.paidAt || new Date().toISOString()),
    createdAt: iso(d.createdAt || d.appliedAt || d.paidAt || new Date().toISOString()),
  };
};

interface Mapped {
  collection: string;
  map: (id: string, d: Doc) => Record<string, unknown>;
  searchable: (row: Record<string, unknown>) => string[];
}

const REGISTRY: Record<string, Mapped> = {
  interns: {
    collection: "users",
    map: mapIntern as unknown as Mapped["map"],
    searchable: (r) => [r.name, r.email, r.phone, r.internId, r.college].map(String),
  },
  applications: {
    collection: "applications",
    map: mapApplication as unknown as Mapped["map"],
    searchable: (r) => [r.name, r.email, r.phone, r.college].map(String),
  },
  payments: {
    collection: "applications",
    map: mapPayment,
    searchable: (r) => [r.paymentId, r.orderId, r.internName, r.internEmail, r.method].map(String),
  },
  certificates: {
    collection: "certificates",
    map: mapCert as unknown as Mapped["map"],
    searchable: (r) => [r.certificateId, r.internName, r.internRef, r.internEmail, r.program].map(String),
  },
  mentors: {
    collection: "mentors",
    map: mapMentor as unknown as Mapped["map"],
    searchable: (r) => [r.name, r.email].map(String),
  },
  activations: {
    collection: "manual_activations",
    map: mapActivation as unknown as Mapped["map"],
    searchable: (r) => [r.code, r.internName, r.internEmail].map(String),
  },
  notifications: {
    collection: "notifications",
    map: mapNotification as unknown as Mapped["map"],
    searchable: (r) => [r.title, r.message].map(String),
  },
};

export interface QueryOpts {
  search?: string;
  page: number;
  pageSize: number;
  filters?: Record<string, string | undefined>;
  id?: string;
}

export interface QueryResult {
  rows: Record<string, unknown>[];
  total: number;
  row?: Record<string, unknown> | null;
}

export async function queryCollection(name: string, opts: QueryOpts): Promise<QueryResult> {
  const def = REGISTRY[name];
  if (!def) return { rows: [], total: 0, row: opts.id ? null : undefined };

  if (name === "interns" && isInternshipMaintenance()) {
    return { rows: [], total: 0, row: opts.id ? null : undefined };
  }

  try {
    const db = await getMongoDb();
    const col = db.collection(def.collection);

    if (opts.id) {
      const doc = await col.findOne({ $or: [{ id: opts.id }, { _id: opts.id as any }] });
      return {
        rows: [],
        total: doc ? 1 : 0,
        row: doc ? def.map(str(doc.id || doc._id), doc as Doc) : null,
      };
    }

    const filter: Record<string, unknown> = {};
    if (name === "interns") {
      filter.type = "student";
    }

    if (opts.search && opts.search.trim()) {
      const regex = new RegExp(opts.search.trim(), "i");
      filter.$or = [
        { name: regex },
        { email: regex },
        { phone: regex },
        { college: regex },
        { certificateId: regex },
      ];
    }

    const total = await col.countDocuments(filter);
    const docs = await col
      .find(filter)
      .sort({ createdAt: -1 })
      .skip((opts.page - 1) * opts.pageSize)
      .limit(opts.pageSize)
      .toArray();

    const rows = docs.map((d) => def.map(str(d.id || d._id), d as Doc));
    return { rows, total };
  } catch (err) {
    console.error(`[adminData] queryCollection error for ${name}:`, err);
    return { rows: [], total: 0, row: opts.id ? null : undefined };
  }
}
