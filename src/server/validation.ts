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

/** Mark payment proof as submitted (public, by application id). */
export const paymentProofSchema = z.object({
  applicationId: z.string().trim().min(4).max(64),
});

/** Admin payment decision. */
export const applicationDecisionSchema = z.object({
  applicationId: z.string().trim().min(4).max(64),
  action: z.enum(["verify", "reject"]),
  reason: z.string().trim().max(240).optional(),
});

export type ApplicationInput = z.infer<typeof applicationSchema>;
export type PaymentProofInput = z.infer<typeof paymentProofSchema>;
export type ApplicationDecisionInput = z.infer<typeof applicationDecisionSchema>;

export type StudentRegisterInput = z.infer<typeof studentRegisterSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type IssueCertificateInput = z.infer<typeof issueCertificateSchema>;
export type RevokeCertificateInput = z.infer<typeof revokeCertificateSchema>;
