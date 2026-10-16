import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

/** Public marketing routes (private/auth/dashboard routes are excluded). */
const routes = [
  "",
  "/about",
  "/events",
  "/hackathon",
  "/community",
  "/team",
  "/gallery",
  "/blog",
  "/contact",
  "/internship",
  "/collaborate",
  "/partners",
  "/verify_cert",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return routes.map((route) => ({
    url: `${siteConfig.url}${route}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: route === "" ? 1 : 0.7,
  }));
}
