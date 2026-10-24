/**
 * Global Feature Flags & Maintenance Configuration.
 *
 * CENTRALIZED INTERNSHIP MAINTENANCE MODE:
 * Pauses public internship listing, registration, new submissions, and /interns Firestore collection queries
 * to protect the Firebase Spark plan free tier (50,000 reads/day) while prioritizing the live PromptWars Hackathon.
 *
 * HOW TO TOGGLE / DISABLE LATER:
 * Option 1 (Environment variable - no rebuild required if runtime-read, or via Vercel env settings):
 *   Set NEXT_PUBLIC_INTERNSHIP_MAINTENANCE="false"
 *
 * Option 2 (In Code):
 *   Change `defaultInternshipMaintenance` below from `true` to `false`.
 */

const envFlag = process.env.NEXT_PUBLIC_INTERNSHIP_MAINTENANCE ?? process.env.INTERNSHIP_MAINTENANCE;

// Defaults to FALSE now that MongoDB Atlas migration is complete.
const defaultInternshipMaintenance = false;

const isMaintenanceActive =
  envFlag !== undefined ? envFlag.toLowerCase() === "true" || envFlag === "1" : defaultInternshipMaintenance;

export const FEATURES = {
  /**
   * When true:
   * - Public internship pages (/internship, /internship/register, etc.) display a clean maintenance message.
   * - No internship listings, details, or student lists are loaded from Firestore.
   * - /api/v1/internship/apply and /api/v1/internship/apply/proof return HTTP 503 (MAINTENANCE_MODE).
   * - /interns collection reads and scans are completely bypassed.
   * - Hackathon (/hackathon, /hackathon/register) and certificate verification remain 100% operational.
   */
  internshipMaintenance: isMaintenanceActive,
} as const;

export function isInternshipMaintenance(): boolean {
  return FEATURES.internshipMaintenance;
}
