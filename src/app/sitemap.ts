import type { MetadataRoute } from "next";
import { routing } from "@/i18n/routing";
import { INDEXABLE_ROUTES, absoluteUrl, languageAlternates } from "@/lib/seo";

/**
 * Derived from INDEXABLE_ROUTES x routing.locales rather than written out, so
 * a new page or a new locale cannot be silently left out. sitemap.test.ts
 * cross-checks INDEXABLE_ROUTES against the page files on disk, which is what
 * makes "derived" mean something once six more tools land.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  return INDEXABLE_ROUTES.flatMap((href) =>
    routing.locales.map((locale) => ({
      url: absoluteUrl(locale, href),
      alternates: { languages: languageAlternates(href) },
    })),
  );
}
