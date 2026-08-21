"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/navigation/Navbar";
import { Footer } from "@/components/layout/Footer";

/**
 * Renders the public site chrome (navbar + footer) for the marketing site, but
 * gets out of the way entirely for the admin platform, which provides its own
 * full-screen shell under /admin.
 */
export function SiteChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAdmin = pathname === "/admin" || pathname?.startsWith("/admin/");

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <>
      <Navbar />
      <main id="main" className="min-h-screen pt-16">
        {children}
      </main>
      <Footer />
    </>
  );
}
