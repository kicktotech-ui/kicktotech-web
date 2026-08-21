"use client";

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, type Firestore } from "firebase/firestore";

/**
 * Firebase CLIENT SDK (browser) initialization.
 *
 * The web config below is PUBLIC by design (Firebase ships it in client
 * bundles) — it is NOT a secret. Access is protected by Firebase Auth +
 * Firestore Security Rules, not by hiding this config. Values are read from
 * NEXT_PUBLIC_FIREBASE_* so the same code works across environments.
 *
 * Returns null when unconfigured so the app degrades gracefully instead of
 * crashing (e.g. in CI/build with no env).
 */
const config = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
};

export interface FirebaseClient {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
}

let cached: FirebaseClient | null = null;

export function isFirebaseConfigured(): boolean {
  return Boolean(config.apiKey && config.projectId && config.appId);
}

export function getFirebaseClient(): FirebaseClient | null {
  if (typeof window === "undefined") return null; // client-only
  if (!isFirebaseConfigured()) return null;
  if (cached) return cached;
  const app = getApps().length ? getApp() : initializeApp(config);
  cached = { app, auth: getAuth(app), db: getFirestore(app) };
  return cached;
}
