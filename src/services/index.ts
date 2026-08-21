/**
 * Service layer barrel.
 *
 * The UI imports services from here only. Swapping the mock adapters for
 * Firebase/API implementations later is a service-layer change — components
 * and hooks stay untouched.
 */
export { authService, type AuthService, type SignupInput } from "./auth";
export { eventService, type EventService } from "./events";
export { internshipService, type InternshipService } from "./internship";
export { paymentService, type PaymentService } from "./payments";
export {
  certificateService,
  type CertificateService,
  type PublicCertificate,
  type VerificationOutcome,
  type VerificationResult,
} from "./certificates";
export { contentService, type ContentService } from "./content";
export {
  contactService,
  collaborationService,
  newsletterService,
  emailService,
} from "./forms";
export { createPermissions, type Permission } from "./permissions";
