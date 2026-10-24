import { config } from "../config";
import { AppError } from "../http";
import { hashPassword, verifyPassword } from "../crypto";
import { getStore, type UserRecord } from "../data";
import { createSession, clearSession, publicUser, type PublicUser } from "./session";
import { writeAudit } from "../audit";
import type { StudentRegisterInput, LoginInput } from "../validation";

function isReservedAdminEmail(email: string): boolean {
  return email === config.admin.email || email.endsWith(config.adminEmailDomain);
}
function nowIso() { return new Date().toISOString(); }

// ---- Student registration --------------------------------------------------

export async function registerStudent(input: StudentRegisterInput, meta: { ip: string; requestId: string }): Promise<PublicUser> {
  const store = getStore();

  if (isReservedAdminEmail(input.email)) {
    throw new AppError("FORBIDDEN", "This email is reserved for administrators. Please use the Admin Portal.");
  }
  if (await store.findUserByEmail(input.email)) {
    throw new AppError("CONFLICT", "An account with this email already exists.");
  }

  const { salt, hash } = hashPassword(input.password);
  const user: UserRecord = {
    id: store.newId(),
    type: "student",
    role: input.role,
    name: input.name,
    email: input.email,
    phone: input.phone,
    college: input.college,
    company: input.company,
    passwordSalt: salt,
    passwordHash: hash,
    status: "active",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  };
  await store.createUser(user);
  await createSession("student", user);
  await writeAudit({ actor: user.email, action: "STUDENT_REGISTERED", target: user.id, requestId: meta.requestId, ip: meta.ip });
  return publicUser(user);
}

// ---- Student login ---------------------------------------------------------

export async function loginStudent(input: LoginInput, meta: { ip: string; requestId: string }): Promise<PublicUser> {
  const store = getStore();

  if (isReservedAdminEmail(input.email)) {
    throw new AppError("FORBIDDEN", "Admin accounts cannot sign in through the student portal. Please use the Admin Portal.");
  }

  const user = await store.findUserByEmail(input.email);
  if (!user || user.type !== "student" || !verifyPassword(input.password, user.passwordSalt, user.passwordHash)) {
    await writeAudit({ actor: input.email, action: "STUDENT_LOGIN", result: "FAILED", requestId: meta.requestId, ip: meta.ip });
    throw new AppError("INVALID_CREDENTIALS", "Invalid email or password.");
  }
  if (user.status !== "active") {
    throw new AppError("FORBIDDEN", "This account is disabled. Contact support.");
  }
  await createSession("student", user);
  await writeAudit({ actor: user.email, action: "STUDENT_LOGIN", target: user.id, requestId: meta.requestId, ip: meta.ip });
  return publicUser(user);
}

// ---- Admin bootstrap + login ----------------------------------------------

export async function ensureAdminBootstrap(): Promise<void> {
  const store = getStore();
  const bootstrapPassword = config.admin.bootstrapPassword;
  if (!bootstrapPassword) return;

  const adminEmail = config.admin.email.trim().toLowerCase();
  const existing = await store.findUserByEmail(adminEmail);

  if (existing) {
    if (!existing.passwordHash || !verifyPassword(bootstrapPassword, existing.passwordSalt, existing.passwordHash)) {
      const { salt, hash } = hashPassword(bootstrapPassword);
      await store.createUser({
        ...existing,
        type: "admin",
        role: "SUPER_ADMIN",
        passwordSalt: salt,
        passwordHash: hash,
        status: "active",
        updatedAt: nowIso(),
      });
    }
    return;
  }

  const { salt, hash } = hashPassword(bootstrapPassword);
  await store.createUser({
    id: store.newId(),
    type: "admin",
    role: "SUPER_ADMIN",
    name: "Administrator",
    email: adminEmail,
    passwordSalt: salt,
    passwordHash: hash,
    status: "active",
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  await writeAudit({ actor: "system", action: "ADMIN_BOOTSTRAPPED", target: adminEmail });
}

export async function loginAdmin(input: LoginInput, meta: { ip: string; requestId: string }): Promise<PublicUser> {
  const normEmail = input.email.trim().toLowerCase();
  const store = getStore();
  const bootstrapPassword = config.admin.bootstrapPassword;

  // 1. Direct Bootstrap / Master Password Match for admin accounts
  if (
    bootstrapPassword &&
    (normEmail === config.admin.email || isReservedAdminEmail(normEmail)) &&
    input.password === bootstrapPassword
  ) {
    let admin = await store.findUserByEmail(normEmail);
    if (!admin) {
      const { salt, hash } = hashPassword(bootstrapPassword);
      admin = await store.createUser({
        id: store.newId(),
        type: "admin",
        role: "SUPER_ADMIN",
        name: "Administrator",
        email: normEmail,
        passwordSalt: salt,
        passwordHash: hash,
        status: "active",
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
      await writeAudit({ actor: "system", action: "ADMIN_BOOTSTRAPPED", target: normEmail });
    }
    await createSession("admin", admin);
    await writeAudit({ actor: admin.email, action: "ADMIN_LOGIN", target: admin.id, requestId: meta.requestId, ip: meta.ip });
    return publicUser(admin);
  }

  // 2. Stored Database PBKDF2 Password Verification
  await ensureAdminBootstrap();
  const admin = await store.findUserByEmail(normEmail);

  if (!admin || admin.type !== "admin") {
    if (!bootstrapPassword && (await store.countAdmins()) === 0) {
      throw new AppError(
        "BOOTSTRAP_REQUIRED",
        "No administrator is provisioned. Set AUTH_ADMIN_BOOTSTRAP_PASSWORD in Vercel environment variables.",
      );
    }
    await writeAudit({ actor: input.email, action: "ADMIN_LOGIN", result: "FAILED", requestId: meta.requestId, ip: meta.ip });
    throw new AppError("INVALID_CREDENTIALS", "Invalid credentials. Check your admin email and password.");
  }

  const isPasswordValid =
    (Boolean(admin.passwordHash) && verifyPassword(input.password, admin.passwordSalt, admin.passwordHash)) ||
    (Boolean(bootstrapPassword) && input.password === bootstrapPassword);

  if (!isPasswordValid) {
    await writeAudit({ actor: input.email, action: "ADMIN_LOGIN", result: "FAILED", requestId: meta.requestId, ip: meta.ip });
    throw new AppError("INVALID_CREDENTIALS", "Invalid credentials. Check your admin email and password.");
  }

  if (admin.status !== "active") {
    throw new AppError("FORBIDDEN", "This administrator account is disabled.");
  }

  await createSession("admin", admin);
  await writeAudit({ actor: admin.email, action: "ADMIN_LOGIN", target: admin.id, requestId: meta.requestId, ip: meta.ip });
  return publicUser(admin);
}

// ---- Logout ----------------------------------------------------------------

export async function logout(type: "student" | "admin", meta: { actor?: string; requestId: string; ip: string }): Promise<void> {
  await clearSession(type);
  await writeAudit({ actor: meta.actor ?? "unknown", action: type === "admin" ? "ADMIN_LOGOUT" : "STUDENT_LOGOUT", requestId: meta.requestId, ip: meta.ip });
}
