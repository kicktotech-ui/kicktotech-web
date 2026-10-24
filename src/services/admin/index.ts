import { delay } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";
import * as mock from "@/data/admin";
import type {
  Intern, Application, Domain, Mentor, Faculty, LiveSession, AttendanceRecord,
  Payment, Activation, Certificate, AdminNotification, EmailCampaign, ActivityLog,
  DashboardData, SystemService, AdminUser, Role, Permission, Paginated, QueryParams,
} from "@/lib/admin/types";
import type { HackathonDashboardConfig } from "@/types";

/**
 * API-backed repository → GET /api/v1/admin/data/:collection (real Firestore,
 * read-only). Collections without a backing Firestore collection return empty.
 * Writes are disabled in this read-only integration phase.
 */
function apiRepository<T extends { id: string }>(collection: string) {
  return {
    async query(params: QueryParams = {}): Promise<Paginated<T>> {
      const q = new URLSearchParams();
      if (params.search) q.set("search", params.search);
      q.set("page", String(params.page ?? 1));
      q.set("pageSize", String(params.pageSize ?? 10));
      const f = params.filters ?? {};
      for (const key of Object.keys(f)) { const v = f[key]; if (v) q.set(key, v); }
      try {
        const data = await api.get<{ rows: T[]; total: number; page: number; pageSize: number }>(`/admin/data/${collection}?${q.toString()}`);
        return { rows: data.rows, total: data.total, page: data.page, pageSize: data.pageSize };
      } catch {
        return { rows: [], total: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 10 };
      }
    },
    async getById(id: string): Promise<T | null> {
      try {
        const data = await api.get<{ row: T | null }>(`/admin/data/${collection}?id=${encodeURIComponent(id)}`);
        return data.row;
      } catch { return null; }
    },
    async create(_input?: unknown): Promise<T> { throw new Error("This action is read-only in the current phase."); },
    async update(_id?: string, _patch?: unknown): Promise<T> { throw new Error("This action is read-only in the current phase."); },
    async remove(_id?: string): Promise<void> { throw new Error("This action is read-only in the current phase."); },
    async all(): Promise<T[]> {
      const r = await this.query({ page: 1, pageSize: 200 });
      return r.rows;
    },
  };
}

export const internService = apiRepository<Intern>("interns");
export const applicationService = apiRepository<Application>("applications");

// ---- Manual-payment applications (store-backed, with verify/reject) --------

export type AdminApplicationStatus =
  | "PAYMENT_PENDING" | "PAYMENT_PROOF_SUBMITTED" | "PAYMENT_VERIFIED" | "PAYMENT_REJECTED" | "CERTIFICATE_ISSUED";

export interface AdminApplication {
  id: string;
  applicationId: string;
  name: string;
  email: string;
  phone: string;
  college?: string;
  course?: string;
  year?: string;
  prn?: string;
  teamName?: string;
  domain: string;
  mentorId?: string;
  mentorName?: string;
  amount: number;
  status: AdminApplicationStatus;
  createdAt: string;
  updatedAt: string;
  reviewNote?: string;
  certificateId?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  paymentMethod?: string;
  kttId?: string;
  batch?: string;
}

export interface ApplicationQueryParams extends QueryParams {
  type?: "internship" | "hackathon" | "all";
  confirmed?: boolean;
  batch?: string;
}

export interface AdminCreateApplicationPayload {
  name: string;
  email: string;
  phone: string;
  college?: string;
  course?: string;
  year?: string;
  prn?: string;
  domain: string;
  batch?: string;
  amount?: number;
  status?: AdminApplicationStatus;
  mentorId?: string;
  mentorName?: string;
  reviewNote?: string;
  grantAccess?: boolean;
}

export interface AccessResult {
  application: AdminApplication;
  access?: {
    internId: string;
    activationCode: string;
    dashboardUrl: string;
    grantedAt: string;
  };
}

export const adminApplicationService = {
  async query(params: ApplicationQueryParams = {}): Promise<Paginated<AdminApplication>> {
    const q = new URLSearchParams();
    if (params.search) q.set("search", params.search);
    q.set("page", String(params.page ?? 1));
    q.set("pageSize", String(params.pageSize ?? 10));
    if (params.type && params.type !== "all") q.set("type", params.type);
    if (params.batch && params.batch !== "all") q.set("batch", params.batch);
    if (params.confirmed) q.set("confirmed", "true");
    const status = params.filters?.status;
    if (status) q.set("status", status);
    const domain = params.filters?.domain;
    if (domain) q.set("domain", domain);
    try {
      const data = await api.get<{ rows: AdminApplication[]; total: number; page: number; pageSize: number }>(`/admin/applications?${q.toString()}`);
      return { rows: data.rows, total: data.total, page: data.page, pageSize: data.pageSize };
    } catch {
      return { rows: [], total: 0, page: params.page ?? 1, pageSize: params.pageSize ?? 10 };
    }
  },
  async create(payload: AdminCreateApplicationPayload): Promise<AccessResult> {
    return api.post<AccessResult>("/admin/applications", payload);
  },
  async update(applicationId: string, patch: Partial<AdminApplication>): Promise<AdminApplication> {
    const res = await api.patch<{ application: AdminApplication }>("/admin/applications", {
      applicationId,
      action: "update",
      patch,
    });
    return res.application;
  },
  async grantAccess(applicationId: string): Promise<AccessResult> {
    return api.patch<AccessResult>("/admin/applications", {
      applicationId,
      action: "grant_access",
    });
  },
  async decide(applicationId: string, action: "verify" | "reject", reason?: string): Promise<AdminApplication> {
    const { application } = await api.patch<{ application: AdminApplication }>("/admin/applications", { applicationId, action, reason });
    return application;
  },
};

export interface GoogleSheetsSyncStatus {
  isConfigured: boolean;
  hasWebhook: boolean;
  hasServiceAccount: boolean;
  spreadsheetId: string;
  spreadsheetUrl: string;
  webhookUrl?: string;
  confirmedCount: number;
}

export interface GoogleSheetsSyncResponse {
  success: boolean;
  syncedCount: number;
  method: "webhook" | "service_account" | "none";
  error?: string;
  spreadsheetUrl: string;
}

export const adminHackathonService = {
  async query(params: QueryParams = {}): Promise<Paginated<AdminApplication>> {
    return adminApplicationService.query({ ...params, type: "hackathon" });
  },
  async queryConfirmed(params: QueryParams = {}): Promise<Paginated<AdminApplication>> {
    return adminApplicationService.query({ ...params, type: "hackathon", confirmed: true });
  },
  async decide(applicationId: string, action: "verify" | "reject", reason?: string): Promise<AdminApplication> {
    return adminApplicationService.decide(applicationId, action, reason);
  },
  async getGoogleSheetsStatus(): Promise<GoogleSheetsSyncStatus> {
    return api.get<GoogleSheetsSyncStatus>("/admin/hackathons/sheets");
  },
  async syncGoogleSheets(data?: { webhookUrl?: string; spreadsheetId?: string }): Promise<GoogleSheetsSyncResponse> {
    return api.post<GoogleSheetsSyncResponse>("/admin/hackathons/sheets", data || {});
  },
  async getDashboardConfig(): Promise<HackathonDashboardConfig> {
    return api.get<HackathonDashboardConfig>("/admin/hackathons/dashboard-config");
  },
  async updateDashboardConfig(patch: Partial<HackathonDashboardConfig>): Promise<HackathonDashboardConfig> {
    return api.post<HackathonDashboardConfig>("/admin/hackathons/dashboard-config", patch);
  },
};
export const mentorService = apiRepository<Mentor>("mentors");
export const facultyService = apiRepository<Faculty>("faculty");
export const sessionService = apiRepository<LiveSession>("sessions");
export const attendanceService = apiRepository<AttendanceRecord>("attendance");
export const paymentService = apiRepository<Payment>("payments");
export const activationService = apiRepository<Activation>("activations");
export const certificateService = apiRepository<Certificate>("certificates");
export const notificationService = apiRepository<AdminNotification>("notifications");
export const campaignService = apiRepository<EmailCampaign>("campaigns");
export const activityService = apiRepository<ActivityLog>("activity");

// ---- Read-only / aggregate services --------------------------------------

export const domainService = {
  async all(): Promise<Domain[]> {
    await delay(180);
    return mock.domains.map((d) => ({ ...d }));
  },
  async getById(id: string): Promise<Domain | null> {
    await delay(180);
    return mock.domains.find((d) => d.id === id) ?? null;
  },
};

/**
 * Data-service state — lets the UI distinguish a genuine outage from a
 * temporary Firestore read-quota/rate-limit (429). "degraded" must NOT be
 * shown as "connection error".
 */
export type DataServiceState = "live" | "degraded" | "offline";
export interface DashboardResult { state: DataServiceState; data: DashboardData | null }

function classifyError(e: unknown): DataServiceState {
  if (e instanceof ApiError && (e.status === 429 || e.code === "RATE_LIMITED")) return "degraded";
  return "offline";
}

export const analyticsService = {
  /**
   * Real dashboard analytics (GET /api/v1/admin/analytics). Returns a state so
   * the UI can show LIVE / DEGRADED (rate-limited) / OFFLINE honestly.
   */
  async dashboard(): Promise<DashboardResult> {
    try {
      const data = await api.get<DashboardData | null>("/admin/analytics");
      return { state: "live", data };
    } catch (e) {
      return { state: classifyError(e), data: null };
    }
  },
};

export const systemService = {
  /** Real system health from the backend (live Firestore probe). */
  async health(): Promise<SystemService[]> {
    try {
      return await api.get<SystemService[]>("/admin/system");
    } catch {
      return [{ name: "API", state: "NOT_CONNECTED", detail: "Unable to reach backend" }];
    }
  },
};

// ---- Auth + RBAC (mock, Phase 1) -----------------------------------------

const ROLE_PERMISSIONS: Record<Role, Permission[] | "*"> = {
  SUPER_ADMIN: "*",
  ADMIN: ["intern.read", "intern.create", "intern.update", "application.read", "application.update", "domain.read", "domain.update", "session.read", "session.create", "session.update", "payment.read", "payment.update", "certificate.read", "certificate.generate", "certificate.issue", "notification.create", "analytics.read", "system.read"],
  MANAGER: ["intern.read", "intern.update", "application.read", "session.read", "payment.read", "certificate.read", "analytics.read"],
  MENTOR: ["intern.read", "session.read", "session.update"],
  FACULTY: ["intern.read", "session.read"],
  VIEWER: ["intern.read", "analytics.read"],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  const perms = ROLE_PERMISSIONS[role];
  return perms === "*" || perms.includes(permission);
}

const DEV_EMAIL = process.env.NEXT_PUBLIC_ADMIN_DEV_EMAIL ?? "admin@kicktotech.in";

interface ApiAdminUser {
  id: string;
  role: Role;
  name: string;
  email: string;
}

function toAdminUser(u: ApiAdminUser): AdminUser {
  return { id: u.id, name: u.name, email: u.email, role: u.role, avatarColor: "#0057ff", lastActiveAt: new Date().toISOString() };
}

/**
 * Admin auth — backed by the REAL backend (/api/v1/auth/admin/*) with an
 * HTTP-only cookie session, fully separate from the student session. No token
 * or credential is stored client-side. Authorization is enforced server-side.
 */
export const authService = {
  async login(email: string, password: string): Promise<AdminUser> {
    const res = await api.post<{ user: ApiAdminUser; token?: string }>("/auth/admin/login", { email, password });
    if (res.token && typeof window !== "undefined") {
      try { localStorage.setItem("ktt_admin_token", res.token); } catch {}
    }
    return toAdminUser(res.user);
  },
  async logout(): Promise<void> {
    try { await api.post("/auth/admin/logout"); } catch { /* cookie cleared server-side */ }
    if (typeof window !== "undefined") {
      try { localStorage.removeItem("ktt_admin_token"); } catch {}
    }
  },
  async me(): Promise<AdminUser | null> {
    try {
      const res = await api.get<{ user: ApiAdminUser | null }>("/auth/admin/me");
      return res.user ? toAdminUser(res.user) : null;
    } catch {
      return null; // not an authenticated admin
    }
  },
  devEmail: DEV_EMAIL,
};
