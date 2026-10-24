import { MongoClient, type Db, type Collection } from "mongodb";
import {
  type DataStore,
  type UserRecord,
  type SessionRecord,
  type CertificateRecord,
  type AuditRecord,
  type CertificateStatus,
  type PageResult,
  type ApplicationRecord,
} from "./index";
import { uuid } from "../crypto";
import { AppError } from "../http";

/**
 * MongoDB-backed DataStore for Kick To Tech 2.0.
 * Replaces Firebase Firestore completely.
 */

function getMongoUri(): string {
  const uri = process.env.MONGODB_URI?.trim();
  if (!uri) {
    throw new AppError("SERVER_ERROR", "MONGODB_URI is not configured in environment variables.");
  }
  return uri;
}

const DB_NAME = process.env.MONGODB_DB_NAME || "kicktotech";

const globalRef = globalThis as unknown as {
  __kttMongoClient?: MongoClient;
  __kttMongoDb?: Db;
  __kttMongoInitPromise?: Promise<void>;
};

export async function getMongoDb(): Promise<Db> {
  if (globalRef.__kttMongoDb) {
    return globalRef.__kttMongoDb;
  }

  if (!globalRef.__kttMongoClient) {
    globalRef.__kttMongoClient = new MongoClient(getMongoUri(), {
      maxPoolSize: 20,
      minPoolSize: 5,
      serverSelectionTimeoutMS: 5000,
    });
  }

  await globalRef.__kttMongoClient.connect();
  const db = globalRef.__kttMongoClient.db(DB_NAME);
  globalRef.__kttMongoDb = db;

  // Initialize essential indexes once per process lifetime
  if (!globalRef.__kttMongoInitPromise) {
    globalRef.__kttMongoInitPromise = initMongoIndexes(db).catch((err) => {
      console.error("[mongo] Index initialization warning:", err);
    });
  }

  return db;
}

async function initMongoIndexes(db: Db): Promise<void> {
  await Promise.allSettled([
    db.collection("users").createIndex({ email: 1 }, { unique: true }),
    db.collection("users").createIndex({ type: 1, role: 1 }),
    db.collection("sessions").createIndex({ id: 1 }, { unique: true }),
    db.collection("sessions").createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection("certificates").createIndex({ certificateId: 1 }, { unique: true }),
    db.collection("certificates").createIndex({ dedupeKey: 1 }, { sparse: true }),
    db.collection("applications").createIndex({ applicationId: 1 }, { unique: true }),
    db.collection("applications").createIndex({ dedupeKey: 1 }),
    db.collection("applications").createIndex({ razorpayOrderId: 1 }, { sparse: true }),
    db.collection("audit_logs").createIndex({ ts: -1 }),
  ]);
}

export function createMongoStore(): DataStore {
  return {
    newId: () => uuid(),

    // ---- Users -------------------------------------------------------------
    async findUserByEmail(email: string): Promise<UserRecord | null> {
      const db = await getMongoDb();
      const normEmail = email.trim().toLowerCase();
      const doc = await db.collection("users").findOne({ email: normEmail });
      if (!doc) return null;
      const { _id, ...user } = doc;
      return user as unknown as UserRecord;
    },

    async getUserById(id: string): Promise<UserRecord | null> {
      const db = await getMongoDb();
      const doc = await db.collection("users").findOne({ id });
      if (!doc) return null;
      const { _id, ...user } = doc;
      return user as unknown as UserRecord;
    },

    async createUser(record: UserRecord): Promise<UserRecord> {
      const db = await getMongoDb();
      const normRecord: UserRecord = {
        ...record,
        email: record.email.trim().toLowerCase(),
      };
      await db.collection("users").updateOne(
        { id: normRecord.id },
        { $set: normRecord },
        { upsert: true }
      );
      return normRecord;
    },

    async listStudents({ search, page, pageSize }): Promise<PageResult<UserRecord>> {
      const db = await getMongoDb();
      const filter: Record<string, unknown> = { type: "student" };
      if (search && search.trim()) {
        const regex = new RegExp(search.trim(), "i");
        filter.$or = [
          { name: regex },
          { email: regex },
          { phone: regex },
          { college: regex },
        ];
      }

      const total = await db.collection("users").countDocuments(filter);
      const docs = await db
        .collection("users")
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .toArray();

      const rows = docs.map(({ _id, ...rest }) => rest as unknown as UserRecord);
      return { rows, total };
    },

    async countStudents(activeOnly?: boolean): Promise<number> {
      const db = await getMongoDb();
      const filter: Record<string, unknown> = { type: "student" };
      if (activeOnly) {
        filter.status = "active";
      }
      return db.collection("users").countDocuments(filter);
    },

    async countAdmins(): Promise<number> {
      const db = await getMongoDb();
      return db.collection("users").countDocuments({ type: "admin" });
    },

    // ---- Sessions ----------------------------------------------------------
    async createSession(record: SessionRecord): Promise<SessionRecord> {
      const db = await getMongoDb();
      await db.collection("sessions").updateOne(
        { id: record.id },
        { $set: record },
        { upsert: true }
      );
      return record;
    },

    async getSessionById(id: string): Promise<SessionRecord | null> {
      const db = await getMongoDb();
      const doc = await db.collection("sessions").findOne({ id });
      if (!doc) return null;
      const { _id, ...session } = doc;
      return session as unknown as SessionRecord;
    },

    async deleteSession(id: string): Promise<void> {
      const db = await getMongoDb();
      await db.collection("sessions").deleteOne({ id });
    },

    // ---- Certificates ------------------------------------------------------
    async createCertificate(record: CertificateRecord): Promise<CertificateRecord> {
      const db = await getMongoDb();
      await db.collection("certificates").updateOne(
        { id: record.id },
        { $set: record },
        { upsert: true }
      );
      return record;
    },

    async getCertificateByCertId(certificateId: string): Promise<CertificateRecord | null> {
      const db = await getMongoDb();
      const doc = await db.collection("certificates").findOne({ certificateId: certificateId.trim() });
      if (!doc) return null;
      const { _id, ...cert } = doc;
      return cert as unknown as CertificateRecord;
    },

    async getCertificateByDedupeKey(dedupeKey: string): Promise<CertificateRecord | null> {
      const db = await getMongoDb();
      const doc = await db.collection("certificates").findOne({ dedupeKey });
      if (!doc) return null;
      const { _id, ...cert } = doc;
      return cert as unknown as CertificateRecord;
    },

    async listCertificates(): Promise<CertificateRecord[]> {
      const db = await getMongoDb();
      const docs = await db
        .collection("certificates")
        .find({})
        .sort({ issuedAt: -1 })
        .limit(1000)
        .toArray();
      return docs.map(({ _id, ...c }) => c as unknown as CertificateRecord);
    },

    async updateCertificate(id: string, patch: Partial<CertificateRecord>): Promise<CertificateRecord | null> {
      const db = await getMongoDb();
      const res = await db.collection("certificates").findOneAndUpdate(
        { id },
        { $set: patch },
        { returnDocument: "after" }
      );
      if (!res) return null;
      const { _id, ...cert } = res as unknown as { _id?: unknown } & CertificateRecord;
      return cert as CertificateRecord;
    },

    async countCertificates(status?: CertificateStatus): Promise<number> {
      const db = await getMongoDb();
      const filter: Record<string, unknown> = {};
      if (status) filter.status = status;
      return db.collection("certificates").countDocuments(filter);
    },

    async countCertificatesByDomain(domain: string): Promise<number> {
      const db = await getMongoDb();
      return db.collection("certificates").countDocuments({ domain });
    },

    // ---- Applications (Internships & Hackathons) ---------------------------
    async createApplication(record: ApplicationRecord): Promise<ApplicationRecord> {
      const db = await getMongoDb();
      await db.collection("applications").updateOne(
        { id: record.id },
        { $set: record },
        { upsert: true }
      );
      return record;
    },

    async getApplicationById(id: string): Promise<ApplicationRecord | null> {
      const db = await getMongoDb();
      const doc = await db.collection("applications").findOne({ id });
      if (!doc) return null;
      const { _id, ...app } = doc;
      return app as unknown as ApplicationRecord;
    },

    async getApplicationByAppId(applicationId: string): Promise<ApplicationRecord | null> {
      const db = await getMongoDb();
      const doc = await db.collection("applications").findOne({
        $or: [{ applicationId: applicationId.trim() }, { id: applicationId.trim() }],
      });
      if (!doc) return null;
      const { _id, ...app } = doc;
      return app as unknown as ApplicationRecord;
    },

    async getApplicationByDedupeKey(dedupeKey: string): Promise<ApplicationRecord | null> {
      const db = await getMongoDb();
      const doc = await db.collection("applications").findOne({ dedupeKey });
      if (!doc) return null;
      const { _id, ...app } = doc;
      return app as unknown as ApplicationRecord;
    },

    async getApplicationByRazorpayOrderId(orderId: string): Promise<ApplicationRecord | null> {
      const db = await getMongoDb();
      const doc = await db.collection("applications").findOne({ razorpayOrderId: orderId.trim() });
      if (!doc) return null;
      const { _id, ...app } = doc;
      return app as unknown as ApplicationRecord;
    },

    async listApplications(): Promise<ApplicationRecord[]> {
      const db = await getMongoDb();
      const docs = await db
        .collection("applications")
        .find({})
        .sort({ createdAt: -1 })
        .limit(2000)
        .toArray();
      return docs.map(({ _id, ...a }) => a as unknown as ApplicationRecord);
    },

    async updateApplication(id: string, patch: Partial<ApplicationRecord>): Promise<ApplicationRecord | null> {
      const db = await getMongoDb();
      const res = await db.collection("applications").findOneAndUpdate(
        { id },
        { $set: patch },
        { returnDocument: "after" }
      );
      if (!res) return null;
      const { _id, ...app } = res as unknown as { _id?: unknown } & ApplicationRecord;
      return app as ApplicationRecord;
    },

    // ---- Audit Logs --------------------------------------------------------
    async appendAudit(record: AuditRecord): Promise<void> {
      const db = await getMongoDb();
      await db.collection("audit_logs").insertOne(record);
    },
  };
}
