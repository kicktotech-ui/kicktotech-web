import { z } from "zod";
import { config } from "./config";

/* Zod schemas — the authoritative validation at every API boundary. */

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.")
  .max(254);

export const passwordSchema = z
  .string()
  .min(config.password.minLength, `Password must be at least ${config.password.minLength} characters.`)
  .max(128);

/** Student self-registration. Role is constrained to student-side roles only. */
export const studentRegisterSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: emailSchema,
  password: passwordSchema,
  phone: z.string().trim().max(20).optional(),
  role: z.enum(["student", "company"]).default("student"),
  college: z.string().trim().max(120).optional(),
  company: z.string().trim().max(120).optional(),
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required.").max(128),
});

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z.object({
  token: z.string().trim().min(10, "Invalid reset token."),
  password: passwordSchema,
});

export const issueCertificateSchema = z.object({
  recipientName: z.string().trim().min(2).max(120),
  email: emailSchema.optional(),
  college: z.string().trim().max(160).optional(),
  program: z.string().trim().min(2).max(160),
  domain: z.enum(["python", "java", "data-analytics", "cybersecurity"]),
  grade: z.string().trim().max(4).optional(),
  durationLabel: z.string().trim().max(120).optional(),
  startDate: z.string().trim().max(40).optional(),
  endDate: z.string().trim().max(40).optional(),
  internId: z.string().trim().max(64).optional(),
  /** Optional explicit mentor override; otherwise resolved from domain. */
  mentorId: z.string().trim().max(64).optional(),
  /** Optional linked application — if set, must be PAYMENT_VERIFIED to issue. */
  applicationId: z.string().trim().max(64).optional(),
});

/** Revoke by certificate id. */
export const revokeCertificateSchema = z.object({
  certificateId: z.string().trim().min(4).max(64),
  reason: z.string().trim().max(240).optional(),
});

/** Public internship application (manual payment gate). */
export const applicationSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: emailSchema,
  phone: z.string().trim().min(6, "Enter a valid phone number.").max(20),
  // PRN is a STRING to preserve leading zeros; not coerced to number.
  prn: z.string().trim().min(1, "Enter your PRN.").max(40),
  college: z.string().trim().max(120).optional(),
  schoolName: z.string().trim().min(1, "Enter your school name.").max(160),
  division: z.string().trim().min(1, "Enter your division.").max(40),
  course: z.string().trim().min(1, "Enter your course.").max(120),
  year: z.string().trim().max(40).optional(),
  city: z.string().trim().max(80).optional(),
  domain: z.enum(["python", "java"]),
});

/** Hack2Skill hackathon application. */
export const hackathonApplicationSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name.").max(80),
  email: emailSchema,
  phone: z.string().trim().min(6, "Enter a valid phone number.").max(20),
  college: z.string().trim().min(1, "Enter your college name.").max(160),
  course: z.string().trim().max(120).optional(),
  year: z.string().trim().max(40).optional(),
  teamName: z.string().trim().max(120).optional(),
});

/** Mark payment proof as submitted (public, by application id). */
export const paymentProofSchema = z.object({
  applicationId: z.string().trim().min(4).max(64),
});

/** Admin payment decision & lifecycle actions (verify, reject, grant_access, update). */
export const applicationDecisionSchema = z.object({
  applicationId: z.string().trim().min(4).max(64),
  action: z.enum(["verify", "reject", "grant_access", "update"]),
  reason: z.string().trim().max(400).optional(),
  patch: z.object({
    name: z.string().trim().min(2).max(120).optional(),
    email: emailSchema.optional(),
    phone: z.string().trim().max(30).optional(),
    college: z.string().trim().max(160).optional(),
    course: z.string().trim().max(120).optional(),
    year: z.string().trim().max(40).optional(),
    prn: z.string().trim().max(60).optional(),
    domain: z.string().trim().min(1).optional(),
    batch: z.string().trim().optional(),
    amount: z.number().nonnegative().optional(),
    status: z.enum(["PAYMENT_PENDING", "PAYMENT_PROOF_SUBMITTED", "PAYMENT_VERIFIED", "PAYMENT_REJECTED", "CERTIFICATE_ISSUED"]).optional(),
    mentorId: z.string().trim().max(64).optional(),
    mentorName: z.string().trim().max(120).optional(),
    reviewNote: z.string().trim().max(400).optional(),
  }).optional(),
});

/** Admin direct creation of an internship application record. */
export const adminCreateApplicationSchema = z.object({
  name: z.string().trim().min(2, "Enter full name.").max(120),
  email: emailSchema,
  phone: z.string().trim().min(4, "Enter phone number.").max(30),
  college: z.string().trim().max(160).optional(),
  course: z.string().trim().max(120).optional(),
  year: z.string().trim().max(40).optional(),
  prn: z.string().trim().max(60).optional(),
  domain: z.string().trim().min(1, "Select or enter a domain."),
  batch: z.string().trim().optional(),
  amount: z.number().nonnegative().optional(),
  status: z.enum(["PAYMENT_PENDING", "PAYMENT_PROOF_SUBMITTED", "PAYMENT_VERIFIED", "PAYMENT_REJECTED", "CERTIFICATE_ISSUED"]).default("PAYMENT_VERIFIED"),
  mentorId: z.string().trim().max(64).optional(),
  mentorName: z.string().trim().max(120).optional(),
  reviewNote: z.string().trim().max(400).optional(),
  grantAccess: z.boolean().default(true),
});

/** Razorpay order creation request. */
export const razorpayOrderCreateSchema = z.object({
  applicationId: z.string().trim().min(4).max(64),
});

/** Razorpay checkout payment verification payload. */
export const razorpayPaymentVerifySchema = z.object({
  applicationId: z.string().trim().min(4).max(64),
  razorpay_order_id: z.string().trim().min(4).max(128),
  razorpay_payment_id: z.string().trim().min(4).max(128),
  razorpay_signature: z.string().trim().min(16).max(256),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
export type HackathonApplicationInput = z.infer<typeof hackathonApplicationSchema>;
export type PaymentProofInput = z.infer<typeof paymentProofSchema>;
export type ApplicationDecisionInput = z.infer<typeof applicationDecisionSchema>;
export type AdminCreateApplicationInput = z.infer<typeof adminCreateApplicationSchema>;
export type RazorpayOrderCreateInput = z.infer<typeof razorpayOrderCreateSchema>;
export type RazorpayPaymentVerifyInput = z.infer<typeof razorpayPaymentVerifySchema>;

export type StudentRegisterInput = z.infer<typeof studentRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;
export type RevokeCertificateInput = z.infer<typeof revokeCertificateSchema>;

export const hackathonScheduleItemSchema = z.object({
  id: z.string().default(() => `sch-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
  time: z.union([z.string(), z.null(), z.undefined()]).transform((v) => (v == null ? "" : String(v))),
  title: z.union([z.string(), z.null(), z.undefined()]).transform((v) => (v == null ? "" : String(v))),
  description: z.union([z.string(), z.null(), z.undefined()]).transform((v) => (v == null ? "" : String(v).trim())),
  status: z.union([z.enum(["upcoming", "live", "completed"]), z.string(), z.null(), z.undefined()]).transform((v) => {
    if (v === "live" || v === "completed") return v;
    return "upcoming";
  }),
}).passthrough();

export const hackathonResourceItemSchema = z.object({
  id: z.string().default(() => `res-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`),
  title: z.union([z.string(), z.null(), z.undefined()]).transform((v) => (v == null ? "" : String(v))),
  url: z.union([z.string(), z.null(), z.undefined()]).transform((v) => (v == null ? "" : String(v))),
  description: z.union([z.string(), z.null(), z.undefined()]).transform((v) => (v == null ? "" : String(v).trim())),
  type: z.union([z.enum(["link", "document", "code", "community"]), z.string(), z.null(), z.undefined()]).transform((v) => {
    if (v === "document" || v === "code" || v === "community") return v;
    return "link";
  }),
}).passthrough();

export const hackathonDashboardConfigSchema = z.object({
  eventName: z.union([z.string(), z.null(), z.undefined()]).optional(),
  tagline: z.union([z.string(), z.null(), z.undefined()]).optional(),
  description: z.union([z.string(), z.null(), z.undefined()]).optional(),
  date: z.union([z.string(), z.null(), z.undefined()]).optional(),
  time: z.union([z.string(), z.null(), z.undefined()]).optional(),
  reportingTime: z.union([z.string(), z.null(), z.undefined()]).optional(),
  venue: z.union([z.string(), z.null(), z.undefined()]).optional(),
  mode: z.union([z.string(), z.null(), z.undefined()]).optional(),
  theme: z.union([z.string(), z.null(), z.undefined()]).optional(),
  prizePool: z.union([z.string(), z.null(), z.undefined()]).optional(),
  announcement: z.union([z.string(), z.null(), z.undefined()]).optional(),
  announcementActive: z.union([z.boolean(), z.null(), z.undefined()]).optional(),
  whatsappGroupUrl: z.union([z.string(), z.null(), z.undefined()]).optional(),
  discordUrl: z.union([z.string(), z.null(), z.undefined()]).optional(),
  officialPortalUrl: z.union([z.string(), z.null(), z.undefined()]).optional(),
  submissionUrl: z.union([z.string(), z.null(), z.undefined()]).optional(),
  contactEmail: z.union([z.string(), z.null(), z.undefined()]).optional(),
  contactPhone: z.union([z.string(), z.null(), z.undefined()]).optional(),
  schedule: z.array(hackathonScheduleItemSchema).optional(),
  resources: z.array(hackathonResourceItemSchema).optional(),
  updatedAt: z.union([z.string(), z.null(), z.undefined()]).optional(),
}).passthrough();

export type HackathonDashboardConfigInput = z.infer<typeof hackathonDashboardConfigSchema>;
