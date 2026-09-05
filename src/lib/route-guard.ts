import { notFound } from "next/navigation";
import { countryOf, type Locale } from "@/i18n/countries";
import { ROUTE_COUNTRIES, type IndexableRoute } from "./seo";

/**
 * The server-side half of route availability — the one place a route's own layout
 * asks "does this route exist in this locale's country" before rendering anything.
 *
 * `ROUTE_COUNTRIES` (re-exported from `src/lib/og-manifest.ts` through `src/lib/seo.ts`)
 * already drives the sitemap, hreflang and `NAV[].countries`; this is the same table
 * reached from the one place that can actually turn "absent" into a 404 rather than a
 * page that merely isn't linked to. RRSP-HBP is the first route this fires for
 * (`ROUTE_COUNTRIES["/rrsp-hbp"] = ["ca"]`) — every other route lists both
 * registered countries today, so this is a no-op there, but every route's layout
 * calls it rather than only the one route that currently needs it: a route
 * restricted to fewer countries later gets this for free, and a layout that forgets
 * to call it is the only way this class of bug can come back.
 *
 * Called from a route's `layout.tsx` (a server component — `page.tsx` is
 * `"use client"` throughout this app and cannot call `notFound()` before first
 * paint) rather than `page.tsx` itself, so the 404 is decided before any client
 * bundle for the excluded route ships. Called during static generation (every
 * locale × route pair `generateStaticParams` enumerates), `notFound()` here is
 * what makes the excluded pair a build-time 404 rather than a page Cloudflare
 * would otherwise serve as a free static asset — see CLAUDE.md, "Every page route
 * must stay prerendered."
 */
export function assertRouteAvailable(locale: string, route: IndexableRoute): void {
  const countries = ROUTE_COUNTRIES[route];
  if (!countries.includes(countryOf(locale as Locale))) {
    notFound();
  }
}
