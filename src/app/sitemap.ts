import type { MetadataRoute } from "next";
import { INDEXABLE_ROUTES, absoluteUrl, languageAlternates, localesForRoute } from "@/lib/seo";

/**
 * Derived from INDEXABLE_ROUTES x each route's OWN locale set rather than the full
 * `routing.locales` cross product, so a Canada-only route (RRSP-HBP) lists four entries,
 * not six with two that 404 — sitemap.test.ts cross-checks INDEXABLE_ROUTES against the
 * page files on disk, and `localesForRoute` against ROUTE_COUNTRIES, which is what makes
 * "derived" mean something as more countries and routes land.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_ROUTES.flatMap((href) =>
    localesForRoute(href).map((locale) => ({
      url: absoluteUrl(locale, href),
      alternates: { languages: languageAlternates(href) },
    })),
  );
}
