import type { MetadataRoute } from "next";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://news-bias-analyzer.vercel.app";

// Pinned to a fixed date so crawlers don't see "updated today" on every fetch.
// Bump this when you make a meaningful content change (new page, big copy
// rewrite). Or, at build time, set NEXT_PUBLIC_SITEMAP_LAST_MODIFIED to a
// real ISO timestamp from the build pipeline (git commit date works well).
const FALLBACK_LAST_MODIFIED = "2026-05-09";
const LAST_MODIFIED = new Date(
  process.env.NEXT_PUBLIC_SITEMAP_LAST_MODIFIED ?? FALLBACK_LAST_MODIFIED,
);

export default function sitemap(): MetadataRoute.Sitemap {
  const routes: { path: string; priority: number }[] = [
    { path: "", priority: 1.0 },
    { path: "/learn", priority: 0.8 },
    { path: "/privacy", priority: 0.4 },
    { path: "/terms", priority: 0.4 },
    { path: "/contact", priority: 0.5 },
  ];
  return routes.map(({ path, priority }) => ({
    url: `${SITE_URL}${path}`,
    lastModified: LAST_MODIFIED,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority,
  }));
}
