"use client";

import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseClient } from "./client";

/* ============================================================================
   Firestore Student Profiles — REAL Firestore CRUD for students/{uid}.
   No passwords stored. Firebase Auth handles credentials.
   ========================================================================== */

/** The Firestore collection name for student profiles. */
const STUDENTS_COLLECTION = "students";

/** Shape of a student profile document in Firestore. */
export interface StudentProfile {
  uid: string;
  fullName: string;
  email: string;
  phone: string;
  college?: string;
  company?: string;
  role: "student" | "company";
  emailVerified: boolean;
  createdAt: unknown; // serverTimestamp
  updatedAt: unknown; // serverTimestamp
}

/**
 * Create a student profile document at students/{uid}.
 * Uses the Firebase Auth UID as the document ID — no duplicates possible.
 */
export async function createStudentProfile(
  uid: string,
  data: {
    fullName: string;
    email: string;
    phone: string;
    college?: string;
    company?: string;
    role: "student" | "company";
  },
): Promise<boolean> {
  const client = getFirebaseClient();
  if (!client) return false;

  try {
    const ref = doc(client.db, STUDENTS_COLLECTION, uid);
    await setDoc(ref, {
      uid,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      college: data.college ?? null,
      company: data.company ?? null,
      role: data.role,
      emailVerified: false,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error("Failed to create student profile:", e);
    return false;
  }
}

/**
 * Get a student profile from Firestore by UID.
 */
export async function getStudentProfile(
  uid: string,
): Promise<StudentProfile | null> {
  const client = getFirebaseClient();
  if (!client) return null;

  try {
    const ref = doc(client.db, STUDENTS_COLLECTION, uid);
    const snap = await getDoc(ref);
    if (!snap.exists()) return null;
    return snap.data() as StudentProfile;
  } catch (e) {
    console.error("Failed to get student profile:", e);
    return null;
  }
}

/**
 * Update fields on a student profile.
 */
export async function updateStudentProfile(
  uid: string,
  patch: Partial<Pick<StudentProfile, "fullName" | "phone" | "college" | "company" | "emailVerified">>,
): Promise<boolean> {
  const client = getFirebaseClient();
  if (!client) return false;

  try {
    const ref = doc(client.db, STUDENTS_COLLECTION, uid);
    await updateDoc(ref, {
      ...patch,
      updatedAt: serverTimestamp(),
    });
    return true;
  } catch (e) {
    console.error("Failed to update student profile:", e);
    return false;
  }
}
