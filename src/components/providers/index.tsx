"use client";

import type { ReactNode } from "react";
import { AuthProvider } from "./AuthProvider";
import { StudentToastProvider } from "@/components/ui/Toast";

/** Single wrapper for all client-side providers. */
export function Providers({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <StudentToastProvider>{children}</StudentToastProvider>
    </AuthProvider>
  );
}

export { useAuth } from "./AuthProvider";
