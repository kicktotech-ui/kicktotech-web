"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AdminAuthProvider, useAdminAuth } from "@/components/admin/AdminAuth";
import { ToastProvider } from "@/components/admin/toast";
import { AdminThemeProvider } from "@/components/admin/theme";
import { AdminShell } from "@/components/admin/Shell";
import { Spinner } from "@/components/admin/ui";

function Guard({ children }: { children: ReactNode }) {
  const { admin, ready } = useAdminAuth();
  const router = useRouter();

  useEffect(() => {
    if (ready && !admin) router.replace("/admin/login");
  }, [ready, admin, router]);

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-adm-surface2 text-adm-muted">
        <Spinner className="h-6 w-6" />
      </div>
    );
  }
  if (!admin) return null;
  return <AdminShell>{children}</AdminShell>;
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === "/admin/login";

  return (
    <AdminThemeProvider>
      <ToastProvider>
        <AdminAuthProvider>
          {isLogin ? children : <Guard>{children}</Guard>}
        </AdminAuthProvider>
      </ToastProvider>
    </AdminThemeProvider>
  );
}
