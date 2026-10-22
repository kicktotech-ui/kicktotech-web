import type { Query } from "firebase-admin/firestore";
import { getAdminDb } from "../firebase/admin";
import type {
  DataStore, UserRecord, SessionRecord, CertificateRecord, AuditRecord,
  CertificateStatus, PageResult, ApplicationRecord,
} from "./index";
import { uuid } from "../crypto";

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

function mapLegacyApplication(id: string, d: Doc): ApplicationRecord {
  const rawStatus = str(d.status).toUpperCase();
  const rawPayment = str(d.paymentStatus).toUpperCase();
  let status: ApplicationRecord["status"] = "PAYMENT_PENDING";

  if (rawStatus === "CERTIFICATE_ISSUED" || d.certificate || d.certificateId) {
    status = "CERTIFICATE_ISSUED";
  } else if (
    rawPayment.includes("PAID") ||
    rawStatus.includes("VERIF") ||
    rawStatus.includes("APPROV") ||
    rawStatus === "ACTIVE"
  ) {
    status = "PAYMENT_VERIFIED";
  } else if (rawStatus.includes("REJECT") || rawPayment.includes("FAIL")) {
    status = "PAYMENT_REJECTED";
  } else if (rawStatus.includes("PROOF") || rawStatus.includes("SUBMIT")) {
    status = "PAYMENT_PROOF_SUBMITTED";
  }

  const domain = str(d.domain || d.domainId || "python");
  const isHackathon = domain === "hack2skill" || str(d.program).toLowerCase().includes("hack") || d.amount === 99;
  const defaultAmount = isHackathon ? 99 : 449;
  const amount = typeof d.amount === "number" ? d.amount : defaultAmount;
  const createdAt = toIso(d.createdAt || d.appliedAt || d.registeredAt || new Date().toISOString());
  const updatedAt = toIso(d.updatedAt || d.createdAt || createdAt);
  const email = str(d.email);

  return {
    id,
    applicationId: str(d.applicationId || d.appId || id),
    name: str(d.name),
    email,
    phone: str(d.phone),
    college: d.college ? str(d.college) : undefined,
    prn: d.prn ? str(d.prn) : undefined,
    schoolName: d.schoolName ? str(d.schoolName) : undefined,
    division: d.division ? str(d.division) : undefined,
    course: d.course ? str(d.course) : undefined,
    year: d.year ? str(d.year) : undefined,
    city: d.city ? str(d.city) : undefined,
    teamName: d.teamName ? str(d.teamName) : d.schoolName ? str(d.schoolName) : undefined,
    domain,
    mentorId: d.mentorId ? str(d.mentorId) : undefined,
    mentorName: d.mentorName ? str(d.mentorName) : undefined,
    amount,
    status,
    createdAt,
    updatedAt,
    dedupeKey: str(d.dedupeKey) || `${email.toLowerCase()}:${domain}`,
    reviewNote: d.reviewNote ? str(d.reviewNote) : undefined,
    verifiedBy: d.verifiedBy ? str(d.verifiedBy) : undefined,
    verifiedAt: d.verifiedAt ? toIso(d.verifiedAt) : undefined,
    certificateId: d.certificateId ? str(d.certificateId) : undefined,
    razorpayOrderId: d.razorpayOrderId ? str(d.razorpayOrderId) : undefined,
    razorpayPaymentId: d.razorpayPaymentId ? str(d.razorpayPaymentId) : undefined,
    razorpaySignature: d.razorpaySignature ? str(d.razorpaySignature) : undefined,
    paymentMethod: d.paymentMethod ? str(d.paymentMethod) : undefined,
  };
}

export function createFirebaseStore(): DataStore {
  return {
    newId: () => uuid(),

    // ---- users (auth profiles) — READ from real `users` ------------------
    async findUserByEmail(email) {
      const db = await getAdminDb();
      const snap = await db.collection(READ.users).where("email", "==", email).limit(1).get();
      if (snap.empty) return null;
      const d = snap.docs[0].data() as Doc;
      return {
        id: str(d.uid) || snap.docs[0].id,
        type: str(d.role).toLowerCase() === "admin" ? "admin" : "student",
        role: (str(d.role) || "student") as UserRecord["role"],
        name: str(d.name), email: str(d.email), phone: d.phone ? str(d.phone) : undefined,
        passwordSalt: "", passwordHash: "", status: "active",
        createdAt: toIso(d.createdAt), updatedAt: toIso(d.updatedAt ?? d.createdAt),
      };
    },
    async getUserById(id) {
      const db = await getAdminDb();
      const doc = await db.collection(READ.users).doc(id).get();
      if (!doc.exists) return null;
      const d = doc.data() as Doc;
      return {
        id: str(d.uid) || doc.id,
        type: str(d.role).toLowerCase() === "admin" ? "admin" : "student",
        role: (str(d.role) || "student") as UserRecord["role"],
        name: str(d.name), email: str(d.email), phone: d.phone ? str(d.phone) : undefined,
        passwordSalt: "", passwordHash: "", status: "active",
        createdAt: toIso(d.createdAt), updatedAt: toIso(d.updatedAt ?? d.createdAt),
      };
    },
    // WRITE → namespaced (never touches real `users`)
    async createUser(record) {
      const db = await getAdminDb();
      await db.collection(WRITE.users).doc(record.id).set(record);
      return record;
    },

    // ---- interns — READ from real `interns` ------------------------------
    async listStudents({ search, page, pageSize }): Promise<PageResult<UserRecord>> {
      const db = await getAdminDb();
      const snap = await db.collection(READ.interns).get();
      let rows = snap.docs.map((doc) => mapIntern(doc.id, doc.data() as Doc));
      if (search) {
        const q = search.toLowerCase();
        rows = rows.filter((u) => [u.name, u.email, u.phone ?? "", u.college ?? ""].some((v) => v.toLowerCase().includes(q)));
      }
      rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      const total = rows.length;
      const start = (page - 1) * pageSize;
      return { rows: rows.slice(start, start + pageSize), total };
    },
    async countStudents() {
      const db = await getAdminDb();
      const agg = await db.collection(READ.interns).count().get();
      return agg.data().count;
    },
    async countAdmins() {
      const db = await getAdminDb();
      const agg = await db.collection(READ.users).where("role", "==", "admin").count().get();
      return agg.data().count;
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
      const db = await getAdminDb();
      await db.collection(WRITE.applications).doc(record.id).set(record);
      return record;
    },
    async getApplicationById(id: string) {
      const db = await getAdminDb();
      try {
        const doc = await db.collection(WRITE.applications).doc(id).get();
        if (doc.exists) {
          const d = doc.data() as ApplicationRecord;
          return { ...d, id: doc.id, teamName: d.teamName || d.schoolName };
        }
      } catch (e) {
        console.warn("[firebaseStore] getApplicationById error in ktt_applications:", e);
      }
      try {
        const legacyDoc = await db.collection(READ.applications).doc(id).get();
        if (legacyDoc.exists) return mapLegacyApplication(legacyDoc.id, legacyDoc.data() as Doc);
      } catch (e) {
        console.warn("[firebaseStore] getApplicationById error in registrations:", e);
      }
      return null;
    },
    async getApplicationByAppId(applicationId: string) {
      const db = await getAdminDb();
      try {
        const snap = await db.collection(WRITE.applications).where("applicationId", "==", applicationId).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const d = doc.data() as ApplicationRecord;
          return { ...d, id: doc.id, teamName: d.teamName || d.schoolName };
        }
      } catch (e) {
        console.warn("[firebaseStore] getApplicationByAppId error in ktt_applications:", e);
      }
      try {
        const legacySnap = await db.collection(READ.applications).where("applicationId", "==", applicationId).limit(1).get();
        if (!legacySnap.empty) {
          return mapLegacyApplication(legacySnap.docs[0].id, legacySnap.docs[0].data() as Doc);
        }
        const doc = await db.collection(READ.applications).doc(applicationId).get();
        if (doc.exists) return mapLegacyApplication(doc.id, doc.data() as Doc);
      } catch (e) {
        console.warn("[firebaseStore] getApplicationByAppId error in registrations:", e);
      }
      return null;
    },
    async getApplicationByDedupeKey(dedupeKey: string) {
      const db = await getAdminDb();
      try {
        const snap = await db.collection(WRITE.applications).where("dedupeKey", "==", dedupeKey).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const d = doc.data() as ApplicationRecord;
          return { ...d, id: doc.id, teamName: d.teamName || d.schoolName };
        }
      } catch (e) {
        console.warn("[firebaseStore] getApplicationByDedupeKey error in ktt_applications:", e);
      }
      try {
        const legacySnap = await db.collection(READ.applications).where("dedupeKey", "==", dedupeKey).limit(1).get();
        if (!legacySnap.empty) {
          return mapLegacyApplication(legacySnap.docs[0].id, legacySnap.docs[0].data() as Doc);
        }
      } catch (e) {
        console.warn("[firebaseStore] getApplicationByDedupeKey error in registrations:", e);
      }
      return null;
    },
    async getApplicationByRazorpayOrderId(orderId: string) {
      const db = await getAdminDb();
      try {
        const snap = await db.collection(WRITE.applications).where("razorpayOrderId", "==", orderId).limit(1).get();
        if (!snap.empty) {
          const doc = snap.docs[0];
          const d = doc.data() as ApplicationRecord;
          return { ...d, id: doc.id, teamName: d.teamName || d.schoolName };
        }
      } catch (e) {
        console.warn("[firebaseStore] getApplicationByRazorpayOrderId error in ktt_applications:", e);
      }
      try {
        const legacySnap = await db.collection(READ.applications).where("razorpayOrderId", "==", orderId).limit(1).get();
        if (!legacySnap.empty) {
          return mapLegacyApplication(legacySnap.docs[0].id, legacySnap.docs[0].data() as Doc);
        }
      } catch (e) {
        console.warn("[firebaseStore] getApplicationByRazorpayOrderId error in registrations:", e);
      }
      return null;
    },
    async listApplications() {
      const db = await getAdminDb();
      const recordsMap = new Map<string, ApplicationRecord>();

      // 1. Fetch from namespaced WRITE.applications (ktt_applications)
      try {
        const snap = await db.collection(WRITE.applications).limit(1000).get();
        for (const doc of snap.docs) {
          const data = doc.data() as ApplicationRecord;
          const rec: ApplicationRecord = {
            ...data,
            id: doc.id,
            teamName: data.teamName || data.schoolName,
          };
          const key = rec.applicationId || doc.id;
          recordsMap.set(key, rec);
        }
      } catch (err) {
        console.warn("[firebaseStore] Failed reading ktt_applications:", err);
      }

      // 2. Fallback / Merge from legacy READ.applications (registrations)
      try {
        const snapLegacy = await db.collection(READ.applications).limit(1000).get();
        for (const doc of snapLegacy.docs) {
          const rec = mapLegacyApplication(doc.id, doc.data() as Doc);
          const key = rec.applicationId || doc.id;
          if (!recordsMap.has(key)) {
            recordsMap.set(key, rec);
          }
        }
      } catch (err) {
        console.warn("[firebaseStore] Failed reading registrations:", err);
      }

      // 3. Sort descending in memory (safe against missing timestamps / index errors)
      const list = Array.from(recordsMap.values());
      list.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
      return list;
    },
    async updateApplication(id: string, patch: Partial<ApplicationRecord>) {
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

