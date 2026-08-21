"use client";

import { useEffect, useState } from "react";
import { collection, onSnapshot, query, type QueryConstraint } from "firebase/firestore";
import { getFirebaseClient } from "./client";

/**
 * Real-time Firestore reads via onSnapshot. This is the REAL-TIME READ path:
 *   Firestore → onSnapshot → frontend state → UI updates automatically.
 *
 * `collectionName` MUST be a real existing Firestore collection (confirmed with
 * the project owner). No collection names are assumed here.
 */
export type Snapshot<T> = { status: "loading" | "ready" | "error" | "unconfigured"; rows: T[]; error?: string };

export function subscribeCollection<T = Record<string, unknown>>(
  collectionName: string,
  onData: (rows: (T & { id: string })[]) => void,
  onError?: (message: string) => void,
  constraints: QueryConstraint[] = [],
): () => void {
  const client = getFirebaseClient();
  if (!client) {
    onError?.("Firebase is not configured. Add NEXT_PUBLIC_FIREBASE_* to .env.local.");
    return () => {};
  }
  const q = query(collection(client.db, collectionName), ...constraints);
  return onSnapshot(
    q,
    (snap) => onData(snap.docs.map((d) => ({ id: d.id, ...(d.data() as T) }))),
    (err) => onError?.(err.message),
  );
}

/** React hook wrapper for a live Firestore collection. */
export function useFirestoreCollection<T = Record<string, unknown>>(
  collectionName: string | null,
  constraints: QueryConstraint[] = [],
): Snapshot<T & { id: string }> {
  const [state, setState] = useState<Snapshot<T & { id: string }>>({ status: "loading", rows: [] });

  useEffect(() => {
    if (!collectionName) return;
    setState({ status: "loading", rows: [] });
    const unsub = subscribeCollection<T>(
      collectionName,
      (rows) => setState({ status: "ready", rows }),
      (error) => setState({ status: error.includes("not configured") ? "unconfigured" : "error", rows: [], error }),
      constraints,
    );
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [collectionName]);

  return state;
}
