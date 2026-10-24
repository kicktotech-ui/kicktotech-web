import type { Query } from "firebase-admin/firestore";
import { getAdminDb } from "../firebase/admin";
import {
  type DataStore, type UserRecord, type SessionRecord, type CertificateRecord, type AuditRecord,
  type CertificateStatus, type PageResult, type ApplicationRecord,
  isHackathonRecord, parseRecordAmount, defaultAmountForDomain, detectBatch,
} from "./index";
import { uuid } from "../crypto";
import { isInternshipMaintenance } from "@/config/features";

/**
 * Firestore-backed DataStore (Admin SDK) mapped to the REAL existing schema of
 * project kicktotech-c6e18 (discovered via read-only inspection).
 *
 * SAFETY MODEL (Phase 4, read-first):
 *  - READS use the real existing collections (certificates, interns, users).
 *  - WRITES go to NAMESPACED `ktt_*` collections so this adapter can NEVER
 *    modify, overwrite, or duplicate existing production data. Real write
 *    mapping is a later, explicitly-approved step.
 *
 * Collection names are env-overridable. Real read mappings below are based on
 * the confirmed field shapes from the inspection.
 */
const READ = {
  users: process.env.FIREBASE_COLLECTION_USERS ?? "users",
  interns: process.env.FIREBASE_COLLECTION_INTERNS ?? "interns",
  certificates: process.env.FIREBASE_COLLECTION_CERTIFICATES ?? "certificates",
  applications: process.env.FIREBASE_COLLECTION_APPLICATIONS ?? "registrations",
};
// Writes are isolated from production collections until explicitly approved.
const WRITE = {
  users: process.env.FIREBASE_WRITE_COLLECTION_USERS ?? "ktt_users",
  sessions: process.env.FIREBASE_WRITE_COLLECTION_SESSIONS ?? "ktt_sessions",
  certificates: process.env.FIREBASE_WRITE_COLLECTION_CERTIFICATES ?? "ktt_certificates",
  applications: process.env.FIREBASE_WRITE_COLLECTION_APPLICATIONS ?? "ktt_applications",
  audit: process.env.FIREBASE_WRITE_COLLECTION_AUDIT ?? "ktt_audit_logs",
};

type Doc = Record<string, unknown>;
const str = (v: unknown): string => (typeof v === "string" ? v : v == null ? "" : String(v));
function toIso(v: unknown): string {
  if (!v) return "";
  if (typeof v === "string") return v;
  // Firestore Timestamp
  if (typeof v === "object" && v !== null && typeof (v as { toDate?: unknown }).toDate === "function") {
    return (v as { toDate: () => Date }).toDate().toISOString();
  }
  return str(v);
}
/** Real certificate status enum is not fully known — treat only explicit
 *  revoked/expired as invalid; everything else is a valid issued certificate. */
function normCertStatus(v: unknown): CertificateStatus {
  const s = str(v).toLowerCase();
  return s === "revoked" || s === "expired" || s === "invalid" ? "revoked" : "issued";
}

function mapCertificate(id: string, d: Doc): CertificateRecord {
  return {
    id,
    certificateId: str(d.certificateId),
    recipientName: str(d.name),
    email: d.email ? str(d.email) : undefined,
    program: str(d.courseTitle),
    domain: str(d.domain),
    grade: d.grade ? str(d.grade) : undefined,
    durationLabel: d.duration ? str(d.duration) : undefined,
    status: normCertStatus(d.status),
    issuedAt: toIso(d.issuedAt),
    internId: d.internId ? str(d.internId) : undefined,
    issuedBy: "firestore",
  };
}

function mapIntern(id: string, d: Doc): UserRecord {
  const rawStatus = str(d.status).toLowerCase();
  return {
    id,
    type: "student",
    role: "intern",
    name: str(d.name),
    email: str(d.email),
    phone: d.phone ? str(d.phone) : undefined,
    college: d.college ? str(d.college) : undefined,
    passwordSalt: "",
    passwordHash: "",
    status: rawStatus === "disabled" || rawStatus === "inactive" ? "disabled" : "active",
    createdAt: toIso(d.createdAt),
    updatedAt: toIso(d.updatedAt ?? d.createdAt),
  };
}

function extractLegacyDomain(d: Doc, isHack: boolean): string {
  if (isHack) {
    const raw = str(d.domain || d.domainId || d.event || d.eventName || d.program || "");
    if (!raw || raw.toLowerCase() === "python" || raw.toLowerCase() === "java") return "hack2skill";
    return raw;
  }

  const candidates = [
    d.domain,
    d.domainId,
    d.domainName,
    d.internshipDomain,
    d.selectedDomain,
    d.course,
    d.courseTitle,
    d.courseName,
    d.track,
    d.selectedTrack,
    d.internshipTrack,
    d.internship,
    d.program,
    d.programName,
    d.specialization,
    d.branch,
    d.stream,
    d.department,
    d.subject,
    d.field,
  ];

  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) {
      const s = c.trim();
      const lower = s.toLowerCase();
      if (lower.includes("python")) return "python";
      if (lower.includes("java")) return "java";
      if (lower.includes("data") || lower.includes("analytic")) return "data-analytics";
      if (lower.includes("cyber") || lower.includes("security")) return "cybersecurity";
      if (lower.includes("web") || lower.includes("fullstack") || lower.includes("full-stack")) return "web-development";
      if (s.length > 2 && !lower.includes("none") && !lower.includes("n/a") && !lower.includes("unknown")) {
        return s;
      }
    }
  }

  return "python";
}

function mergeApplicationRecords(existing: ApplicationRecord, incoming: ApplicationRecord): ApplicationRecord {
  // Prefer terminal or higher status
  const statusRank: Record<ApplicationRecord["status"], number> = {
    PAYMENT_PENDING: 1,
    PAYMENT_REJECTED: 2,
    PAYMENT_PROOF_SUBMITTED: 3,
    PAYMENT_VERIFIED: 4,
    CERTIFICATE_ISSUED: 5,
  };
  const status =
    statusRank[incoming.status] > statusRank[existing.status]
      ? incoming.status
      : existing.status;

  // Domain: prefer specific domain over fallback 'python'
  let domain = existing.domain;
  if (!domain || domain === "python") {
    domain = incoming.domain || existing.domain || "python";
  } else if (incoming.domain && incoming.domain !== "python") {
    domain = incoming.domain;
  }

  // Determine amount: prefer explicit non-zero, or domain default
  let amount = incoming.amount && incoming.amount > 0 ? incoming.amount : existing.amount;
  if (!amount || amount === 0) {
    amount = defaultAmountForDomain(domain, false);
  }

  return {
    ...incoming,
    ...existing,
    status,
    domain,
    amount,
    name: existing.name && existing.name !== "Participant" ? existing.name : incoming.name,
    email: existing.email || incoming.email,
    phone: existing.phone || incoming.phone,
    college: existing.college || incoming.college,
    course: existing.course || incoming.course,
    year: existing.year || incoming.year,
    teamName: existing.teamName || incoming.teamName,
    schoolName: existing.schoolName || incoming.schoolName || existing.teamName || incoming.teamName,
    razorpayOrderId: existing.razorpayOrderId || incoming.razorpayOrderId,
    razorpayPaymentId: existing.razorpayPaymentId || incoming.razorpayPaymentId,
    razorpaySignature: existing.razorpaySignature || incoming.razorpaySignature,
    paymentMethod: existing.paymentMethod || incoming.paymentMethod,
    reviewNote: existing.reviewNote || incoming.reviewNote,
    certificateId: existing.certificateId || incoming.certificateId,
    verifiedBy: existing.verifiedBy || incoming.verifiedBy,
    verifiedAt: existing.verifiedAt || incoming.verifiedAt,
    createdAt: existing.createdAt || incoming.createdAt,
    updatedAt: incoming.updatedAt || existing.updatedAt,
  };
}

function mapLegacyApplication(id: string, d: Doc): ApplicationRecord {
  const isHack = isHackathonRecord(d);

  const rawStatus = str(d.status || d.state || "").toUpperCase();
  const rawPayment = str(d.paymentStatus || d.payment_status || d.orderStatus || d.payment || "").toUpperCase();
  const isPaidBool = d.isPaid === true || d.paid === true || d.verified === true || d.isVerified === true || d.approved === true || d.isApproved === true;
  const hasPaymentRef = Boolean(
    d.razorpayPaymentId || d.razorpay_payment_id || d.paymentId || d.payment_id ||
    d.transactionId || d.txnId || d.utr || d.bankRef || d.referenceId
  );

  let status: ApplicationRecord["status"] = "PAYMENT_PENDING";

  if (rawStatus === "CERTIFICATE_ISSUED" || d.certificate || d.certificateId) {
    status = "CERTIFICATE_ISSUED";
  } else if (
    isPaidBool ||
    hasPaymentRef ||
    rawPayment.includes("PAID") ||
    rawPayment.includes("CAPTURED") ||
    rawPayment.includes("SUCCESS") ||
    rawStatus.includes("VERIF") ||
    rawStatus.includes("APPROV") ||
    rawStatus === "ACTIVE" ||
    rawStatus === "PAID" ||
    rawStatus === "COMPLETED" ||
    rawStatus === "CONFIRMED" ||
    rawStatus === "ENROLLED"
  ) {
    status = "PAYMENT_VERIFIED";
  } else if (rawStatus.includes("REJECT") || rawPayment.includes("FAIL") || rawStatus.includes("CANCEL")) {
    status = "PAYMENT_REJECTED";
  } else if (rawStatus.includes("PROOF") || rawStatus.includes("SUBMIT")) {
    status = "PAYMENT_PROOF_SUBMITTED";
  }

  // Domain / Event:
  const domain = extractLegacyDomain(d, isHack);

  const createdAt = toIso(d.createdAt || d.appliedAt || d.registeredAt || d.date || d.timestamp || d.paidAt || new Date().toISOString());
  const updatedAt = toIso(d.updatedAt || d.createdAt || createdAt);

  // Batch detection:
  const batch = str(d.batch) || detectBatch(createdAt, parseRecordAmount(d, 0), domain);
  const defaultAmount = defaultAmountForDomain(domain, isHack, batch);
  const amount = parseRecordAmount(d, defaultAmount);

  const email = str(d.email || d.userEmail || d.studentEmail || "").trim();
  const name = str(d.name || d.fullName || d.userName || d.participantName || d.studentName || d.applicantName || "Participant");
  const phone = str(d.phone || d.phoneNumber || d.mobile || d.contact || d.contactNumber || "");

  const college = d.college ? str(d.college) : d.collegeName ? str(d.collegeName) : d.university ? str(d.university) : d.institute ? str(d.institute) : undefined;
  const course = d.course ? str(d.course) : d.stream ? str(d.stream) : d.branch ? str(d.branch) : d.degree ? str(d.degree) : undefined;
  const year = d.year ? str(d.year) : d.studyYear ? str(d.studyYear) : d.gradYear ? str(d.gradYear) : undefined;
  const city = d.city ? str(d.city) : d.location ? str(d.location) : undefined;
  const teamName = d.teamName ? str(d.teamName) : d.team_name ? str(d.team_name) : d.team ? str(d.team) : d.schoolName ? str(d.schoolName) : undefined;

  const razorpayOrderId = d.razorpayOrderId ? str(d.razorpayOrderId) : d.razorpay_order_id ? str(d.razorpay_order_id) : d.orderId ? str(d.orderId) : d.order_id ? str(d.order_id) : undefined;
  const razorpayPaymentId = d.razorpayPaymentId ? str(d.razorpayPaymentId) : d.razorpay_payment_id ? str(d.razorpay_payment_id) : d.paymentId ? str(d.paymentId) : d.payment_id ? str(d.payment_id) : undefined;
  const razorpaySignature = d.razorpaySignature ? str(d.razorpaySignature) : d.razorpay_signature ? str(d.razorpay_signature) : undefined;
  const paymentMethod = d.paymentMethod ? str(d.paymentMethod) : d.method ? str(d.method) : undefined;

  return {
    id,
    applicationId: str(d.applicationId || d.appId || d.orderId || id),
    name,
    email,
    phone,
    college,
    prn: d.prn ? str(d.prn) : undefined,
    schoolName: d.schoolName ? str(d.schoolName) : teamName,
    division: d.division ? str(d.division) : undefined,
    course,
    year,
    city,
    teamName,
    domain,
    mentorId: d.mentorId ? str(d.mentorId) : undefined,
    mentorName: d.mentorName ? str(d.mentorName) : undefined,
    amount,
    status,
    createdAt,
    updatedAt,
    batch,
    dedupeKey: str(d.dedupeKey) || `${email.toLowerCase()}:${domain}`,
    reviewNote: d.reviewNote ? str(d.reviewNote) : undefined,
    verifiedBy: d.verifiedBy ? str(d.verifiedBy) : undefined,
    verifiedAt: d.verifiedAt ? toIso(d.verifiedAt) : undefined,
    certificateId: d.certificateId ? str(d.certificateId) : (d.certificate ? str(d.certificate) : undefined),
    razorpayOrderId,
    razorpayPaymentId,
    razorpaySignature,
    paymentMethod,
  };
}

// In-memory cache for aggregated applications to keep response times <500ms
let _appsCache: { data: ApplicationRecord[]; timestamp: number } | null = null;
const CACHE_TTL_MS = 20_000; // 20s TTL

export function invalidateApplicationsCache() {
  _appsCache = null;
}

export function createFirebaseStore(): DataStore {
  return {
    newId: () => uuid(),

    // ---- users (auth profiles) — READ from real `users` + WRITE namespaced `ktt_users`
    async findUserByEmail(email) {
      const db = await getAdminDb();
      const normEmail = email.trim().toLowerCase();

      // 1. Check namespaced WRITE.users (where bootstrapped admins & app-registered accounts live)
      try {
        const kttSnap = await db.collection(WRITE.users).where("email", "==", normEmail).limit(1).get();
        if (!kttSnap.empty) {
          const doc = kttSnap.docs[0];
          const d = doc.data() as UserRecord;
          return { ...d, id: doc.id };
        }
      } catch (e) {
        console.warn("[firebaseStore] findUserByEmail error in WRITE.users:", e);
      }

      // 2. Fallback to READ.users
      try {
        const snap = await db.collection(READ.users).where("email", "==", normEmail).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const d = doc.data() as Doc;
          const roleStr = str(d.role).toLowerCase();
          const isAdmin = roleStr === "admin" || roleStr === "super_admin";
          return {
            id: str(d.uid) || doc.id,
            type: isAdmin ? "admin" : "student",
            role: (str(d.role) || (isAdmin ? "ADMIN" : "student")) as UserRecord["role"],
            name: str(d.name) || "Administrator",
            email: str(d.email).toLowerCase(),
            phone: d.phone ? str(d.phone) : undefined,
            college: d.college ? str(d.college) : undefined,
            company: d.company ? str(d.company) : undefined,
            passwordSalt: str(d.passwordSalt),
            passwordHash: str(d.passwordHash),
            status: str(d.status).toLowerCase() === "disabled" ? "disabled" : "active",
            createdAt: toIso(d.createdAt),
            updatedAt: toIso(d.updatedAt ?? d.createdAt),
          };
        }
      } catch (e) {
        console.warn("[firebaseStore] findUserByEmail error in READ.users:", e);
      }
      return null;
    },
    async getUserById(id) {
      const db = await getAdminDb();
      // 1. Check namespaced WRITE.users
      try {
        const kttDoc = await db.collection(WRITE.users).doc(id).get();
        if (kttDoc.exists) {
          const d = kttDoc.data() as UserRecord;
          return { ...d, id: kttDoc.id };
        }
      } catch (e) {
        console.warn("[firebaseStore] getUserById error in WRITE.users:", e);
      }

      // 2. Fallback to READ.users
      try {
        const doc = await db.collection(READ.users).doc(id).get();
        if (doc.exists) {
          const d = doc.data() as Doc;
          const roleStr = str(d.role).toLowerCase();
          const isAdmin = roleStr === "admin" || roleStr === "super_admin";
          return {
            id: str(d.uid) || doc.id,
            type: isAdmin ? "admin" : "student",
            role: (str(d.role) || (isAdmin ? "ADMIN" : "student")) as UserRecord["role"],
            name: str(d.name) || "Administrator",
            email: str(d.email).toLowerCase(),
            phone: d.phone ? str(d.phone) : undefined,
            college: d.college ? str(d.college) : undefined,
            company: d.company ? str(d.company) : undefined,
            passwordSalt: str(d.passwordSalt),
            passwordHash: str(d.passwordHash),
            status: str(d.status).toLowerCase() === "disabled" ? "disabled" : "active",
            createdAt: toIso(d.createdAt),
            updatedAt: toIso(d.updatedAt ?? d.createdAt),
          };
        }
      } catch (e) {
        console.warn("[firebaseStore] getUserById error in READ.users:", e);
      }
      return null;
    },
    // WRITE → namespaced (never touches real `users`)
    async createUser(record) {
      const db = await getAdminDb();
      await db.collection(WRITE.users).doc(record.id).set(record);
      return record;
    },

    // ---- interns — READ from real `interns` ------------------------------
    async listStudents({ search, page, pageSize }): Promise<PageResult<UserRecord>> {
      // Reversible maintenance mode: Zero Firestore reads when internships are paused.
      if (isInternshipMaintenance()) {
        return { rows: [], total: 0 };
      }

      const db = await getAdminDb();
      const colRef = db.collection(READ.interns);

      // Quota-safe: server-side pagination when no substring search is needed
      if (!search) {
        const countSnap = await colRef.count().get();
        const total = countSnap.data().count;
        const offset = (page - 1) * pageSize;
        const pageSnap = await colRef.offset(offset).limit(pageSize).get();
        const rows = pageSnap.docs.map((doc) => mapIntern(doc.id, doc.data() as Doc));
        return { rows, total };
      }

      // Bounded search fallback (capped to 100 docs to avoid Spark quota exhaustion)
      const snap = await colRef.limit(100).get();
      let rows = snap.docs.map((doc) => mapIntern(doc.id, doc.data() as Doc));
      const q = search.toLowerCase();
      rows = rows.filter((u) => [u.name, u.email, u.phone ?? "", u.college ?? ""].some((v) => v.toLowerCase().includes(q)));
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const total = rows.length;
      const start = (page - 1) * pageSize;
      return { rows: rows.slice(start, start + pageSize), total };
    },
    async countStudents() {
      // Reversible maintenance mode: Zero Firestore reads when internships are paused.
      if (isInternshipMaintenance()) {
        return 0;
      }
      const db = await getAdminDb();
      const agg = await db.collection(READ.interns).count().get();
      return agg.data().count;
    },
    async countAdmins() {
      const db = await getAdminDb();
      let total = 0;
      try {
        const kttAgg = await db.collection(WRITE.users).where("type", "==", "admin").count().get();
        total += kttAgg.data().count;
      } catch {}
      try {
        const agg = await db.collection(READ.users).where("role", "==", "admin").count().get();
        total += agg.data().count;
      } catch {}
      return total;
    },

    // ---- sessions — WRITE namespaced -------------------------------------
    async createSession(record) {
      const db = await getAdminDb();
      await db.collection(WRITE.sessions).doc(record.id).set(record);
      return record;
    },
    async getSessionById(id) {
      const db = await getAdminDb();
      const doc = await db.collection(WRITE.sessions).doc(id).get();
      return doc.exists ? (doc.data() as SessionRecord) : null;
    },
    async deleteSession(id) {
      const db = await getAdminDb();
      await db.collection(WRITE.sessions).doc(id).delete();
    },

    // ---- certificates — READ real, WRITE namespaced ----------------------
    async createCertificate(record) {
      const db = await getAdminDb();
      await db.collection(WRITE.certificates).doc(record.id).set(record);
      return record;
    },
    async getCertificateByCertId(certificateId) {
      const db = await getAdminDb();
      const snap = await db.collection(READ.certificates).where("certificateId", "==", certificateId).limit(1).get();
      return snap.empty ? null : mapCertificate(snap.docs[0].id, snap.docs[0].data() as Doc);
    },
    async getCertificateByDedupeKey(dedupeKey) {
      // Dedupe only applies to certificates WE issue (namespaced write store).
      const db = await getAdminDb();
      const snap = await db.collection(WRITE.certificates).where("dedupeKey", "==", dedupeKey).limit(1).get();
      return snap.empty ? null : (snap.docs[0].data() as CertificateRecord);
    },
    async listCertificates() {
      const db = await getAdminDb();
      const snap = await db.collection(READ.certificates).orderBy("issuedAt", "desc").limit(500).get();
      return snap.docs.map((doc) => mapCertificate(doc.id, doc.data() as Doc));
    },
    async updateCertificate(id, patch) {
      const db = await getAdminDb();
      const ref = db.collection(WRITE.certificates).doc(id);
      await ref.set(patch, { merge: true });
      const doc = await ref.get();
      return doc.exists ? (doc.data() as CertificateRecord) : null;
    },
    async countCertificates(status?: CertificateStatus) {
      const db = await getAdminDb();
      // Real status enum unknown → total count is authoritative; status filter is
      // applied only for the explicit "revoked" case to avoid guessing values.
      let q: Query = db.collection(READ.certificates);
      if (status === "revoked") q = q.where("status", "==", "revoked");
      const agg = await q.count().get();
      return agg.data().count;
    },
    async countCertificatesByDomain(domain: string) {
      const db = await getAdminDb();
      const agg = await db.collection(READ.certificates).where("domain", "==", domain).count().get();
      return agg.data().count;
    },

    // ---- applications — WRITE namespaced (ktt_applications) + READ fallback (registrations)
    async createApplication(record: ApplicationRecord) {
      invalidateApplicationsCache();
      const db = await getAdminDb();
      await db.collection(WRITE.applications).doc(record.id).set(record);
      return record;
    },
    async getApplicationById(id: string) {
      const db = await getAdminDb();
      const candidateCols = [
        WRITE.applications,
        READ.applications,
        "applications",
        "hackathon_registrations",
        "hackathons",
        "hackathon",
        "hack2skill",
        "payments",
        "orders",
        "event_registrations",
      ];
      for (const col of candidateCols) {
        try {
          const doc = await db.collection(col).doc(id).get();
          if (doc.exists) {
            return mapLegacyApplication(doc.id, doc.data() as Doc);
          }
        } catch {}
      }
      return null;
    },
    async getApplicationByAppId(applicationId: string) {
      const db = await getAdminDb();
      const candidateCols = [
        WRITE.applications,
        READ.applications,
        "applications",
        "hackathon_registrations",
        "hackathons",
        "hackathon",
        "hack2skill",
        "payments",
        "orders",
        "event_registrations",
      ];
      for (const col of candidateCols) {
        try {
          const snap = await db.collection(col).where("applicationId", "==", applicationId).limit(1).get();
          if (!snap.empty) {
            return mapLegacyApplication(snap.docs[0].id, snap.docs[0].data() as Doc);
          }
          const doc = await db.collection(col).doc(applicationId).get();
          if (doc.exists) {
            return mapLegacyApplication(doc.id, doc.data() as Doc);
          }
        } catch {}
      }
      return null;
    },
    async getApplicationByDedupeKey(dedupeKey: string) {
      const db = await getAdminDb();
      const candidateCols = [
        WRITE.applications,
        READ.applications,
        "applications",
        "hackathon_registrations",
        "hackathons",
        "hackathon",
        "hack2skill",
        "payments",
        "orders",
        "event_registrations",
      ];
      for (const col of candidateCols) {
        try {
          const snap = await db.collection(col).where("dedupeKey", "==", dedupeKey).limit(1).get();
          if (!snap.empty) {
            return mapLegacyApplication(snap.docs[0].id, snap.docs[0].data() as Doc);
          }
        } catch {}
      }
      return null;
    },
    async getApplicationByRazorpayOrderId(orderId: string) {
      const db = await getAdminDb();
      const candidateCols = [
        WRITE.applications,
        READ.applications,
        "applications",
        "hackathon_registrations",
        "hackathons",
        "hackathon",
        "hack2skill",
        "payments",
        "orders",
        "event_registrations",
      ];
      for (const col of candidateCols) {
        try {
          for (const field of ["razorpayOrderId", "razorpay_order_id", "orderId"]) {
            const snap = await db.collection(col).where(field, "==", orderId).limit(1).get();
            if (!snap.empty) {
              return mapLegacyApplication(snap.docs[0].id, snap.docs[0].data() as Doc);
            }
          }
        } catch {}
      }
      return null;
    },
    async listApplications() {
      const now = Date.now();
      if (_appsCache && now - _appsCache.timestamp < CACHE_TTL_MS) {
        return _appsCache.data;
      }

      const db = await getAdminDb();
      const recordsMap = new Map<string, ApplicationRecord>();
      const orderIdIndex = new Map<string, string>();
      const dedupeIndex = new Map<string, string>();

      // Target collections that genuinely store registrations and applications
      const targetCollections = [
        WRITE.applications,      // "ktt_applications"
        READ.applications,       // "registrations"
        "applications",
        "hackathon_registrations",
        "hack2skill",
        "payments",
      ];

      try {
        // Query target collections, certificates, and interns concurrently
        const [colResults, certSnap, internSnap] = await Promise.all([
          Promise.allSettled(
            targetCollections.map(async (colName) => {
              try {
                const snap = await db.collection(colName).limit(1000).get();
                return snap.docs.map((d) => ({ id: d.id, data: d.data() as Doc }));
              } catch {
                return [];
              }
            })
          ),
          db.collection(READ.certificates).limit(1000).get().catch(() => null),
          db.collection(READ.interns).limit(1000).get().catch(() => null),
        ]);

        // Process registrations & applications
        for (const colRes of colResults) {
          if (colRes.status !== "fulfilled") continue;
          for (const item of colRes.value) {
            const raw = item.data;
            if (!raw || Object.keys(raw).length === 0) continue;

            const rec = mapLegacyApplication(item.id, raw);
            const primaryKey = rec.applicationId || item.id;

            let matchedKey = recordsMap.has(primaryKey) ? primaryKey : undefined;
            if (!matchedKey && rec.razorpayOrderId && orderIdIndex.has(rec.razorpayOrderId)) {
              matchedKey = orderIdIndex.get(rec.razorpayOrderId);
            }
            if (!matchedKey && rec.dedupeKey && dedupeIndex.has(rec.dedupeKey)) {
              matchedKey = dedupeIndex.get(rec.dedupeKey);
            }

            if (matchedKey && recordsMap.has(matchedKey)) {
              const existing = recordsMap.get(matchedKey)!;
              const merged = mergeApplicationRecords(existing, rec);
              recordsMap.set(matchedKey, merged);
            } else {
              recordsMap.set(primaryKey, rec);
              if (rec.razorpayOrderId) orderIdIndex.set(rec.razorpayOrderId, primaryKey);
              if (rec.dedupeKey) dedupeIndex.set(rec.dedupeKey, primaryKey);
            }
          }
        }

        // Process certificates enrichment (Batch 1: May - Jun 2026)
        if (certSnap && certSnap.docs) {
          for (const cDoc of certSnap.docs) {
            const c = cDoc.data() as Doc;
            const certId = str(c.certificateId);
            const email = str(c.email || c.internEmail || "").trim().toLowerCase();
            const name = str(c.name || c.internName || c.recipientName || "Intern");
            const domain = extractLegacyDomain(c, false);
            const internId = str(c.internId || c.internRef || "");
            const issuedAt = toIso(c.issuedAt || "2026-06-21T00:00:00.000Z");

            let matched = Array.from(recordsMap.values()).find(
              (r) =>
                (email && r.email.toLowerCase() === email) ||
                (internId && (r.applicationId === internId || r.id === internId))
            );

            if (matched) {
              recordsMap.set(matched.applicationId || matched.id, {
                ...matched,
                certificateId: certId || matched.certificateId,
                status: "CERTIFICATE_ISSUED",
                batch: matched.batch || "batch-1-may-jun-2026",
                amount: matched.amount && matched.amount > 0 ? matched.amount : 222,
              });
            } else if (email || certId) {
              const appId = internId || `APP-2026-C${certId.replace(/[^A-Z0-9]/gi, "").slice(-6) || cDoc.id.slice(0, 6)}`;
              const record: ApplicationRecord = {
                id: cDoc.id,
                applicationId: appId,
                name,
                email: email || `${appId.toLowerCase()}@kicktotech.in`,
                phone: str(c.phone || ""),
                college: str(c.college || ""),
                domain,
                amount: 222,
                status: "CERTIFICATE_ISSUED",
                certificateId: certId,
                batch: "batch-1-may-jun-2026",
                createdAt: issuedAt,
                updatedAt: issuedAt,
                dedupeKey: `${email || appId}:${domain}`,
              };
              recordsMap.set(appId, record);
            }
          }
        }

        // Process interns enrichment
        if (internSnap && internSnap.docs) {
          for (const iDoc of internSnap.docs) {
            const iData = iDoc.data() as Doc;
            const email = str(iData.email).trim().toLowerCase();
            const internId = str(iData.internId || iDoc.id);
            const joinedAt = toIso(iData.createdAt || iData.joinedAt || "2026-05-18T00:00:00.000Z");
            const domain = extractLegacyDomain(iData, false);
            const batch = detectBatch(joinedAt, 222, domain);

            let matched = Array.from(recordsMap.values()).find(
              (r) =>
                (email && r.email.toLowerCase() === email) ||
                r.applicationId === internId ||
                r.id === iDoc.id
            );

            if (matched) {
              recordsMap.set(matched.applicationId || matched.id, {
                ...matched,
                college: matched.college || str(iData.college),
                phone: matched.phone || str(iData.phone),
                prn: matched.prn || str(iData.prn),
                course: matched.course || str(iData.course),
                year: matched.year || str(iData.year),
                domain: matched.domain && matched.domain !== "python" ? matched.domain : domain,
                batch: matched.batch || batch,
                status:
                  matched.status === "PAYMENT_PENDING" && str(iData.paymentStatus).toUpperCase() === "PAID"
                    ? "PAYMENT_VERIFIED"
                    : matched.status,
              });
            }
          }
        }
      } catch (err) {
        console.warn("[firebaseStore] Parallel listApplications error:", err);
      }

      const list = Array.from(recordsMap.values());
      list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      // Update cache
      _appsCache = { data: list, timestamp: Date.now() };
      return list;
    },
    async updateApplication(id: string, patch: Partial<ApplicationRecord>) {
      invalidateApplicationsCache();
      const db = await getAdminDb();
      const ref = db.collection(WRITE.applications).doc(id);
      await ref.set(patch, { merge: true });
      const doc = await ref.get();
      if (!doc.exists) return null;
      const d = doc.data() as ApplicationRecord;
      return { ...d, id: doc.id, teamName: d.teamName || d.schoolName };
    },

    // ---- audit — WRITE namespaced ----------------------------------------
    async appendAudit(record: AuditRecord) {
      const db = await getAdminDb();
      await db.collection(WRITE.audit).doc(record.id).set(record);
    },
  };
}

/**
 * Cached Firebase read-store, used by admin READ endpoints regardless of
 * DATA_BACKEND so the admin panel shows real Firestore data while the auth
 * path remains on the session store. Reads only touch real collections;
 * writes remain namespaced (see WRITE).
 */
let _firebaseStore: DataStore | null = null;
export function firebaseStore(): DataStore {
  return (_firebaseStore ??= createFirebaseStore());
}

