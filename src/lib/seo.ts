import type { Metadata } from "next";
import { routing } from "@/i18n/routing";

/**
 * The canonical host. One host, always absolute: a relative canonical resolves
 * against whatever host served the page, which on a Worker can be a versioned
 * preview hostname — exactly the duplicate a canonical exists to prevent.
 */
export const SITE_URL = "https://affordmath.com";
export const SITE_NAME = "AffordMath";

/** Routes that belong in the sitemap. Extend as pages ship. */
export const INDEXABLE_ROUTES = [
  "/",
  "/affordability",
  "/closing-costs",
  "/down-payment",
  "/rrsp-hbp",
  "/amortization",
  "/rent-vs-buy",
  "/scenarios",
  "/sources",
] as const;

export type IndexableRoute = (typeof INDEXABLE_ROUTES)[number];

type LocalePrefixMode = "always" | "as-needed" | "never";

/**
 * next-intl leaves `localePrefix` undefined when it is not set, and "always" is
 * its default. It also accepts an object form, `{ mode, prefixes }`.
 */
function prefixMode(): LocalePrefixMode {
  const configured = (
    routing as { localePrefix?: LocalePrefixMode | { mode: LocalePrefixMode } }
  ).localePrefix;
  if (!configured) return "always";
  return typeof configured === "string" ? configured : configured.mode;
}

/**
 * The locale-aware path for a route.
 *
 * This deliberately does NOT go through `getPathname` from `@/i18n/navigation`.
 * That module is next-intl's react-client navigation factory: it cannot be
 * resolved under Vitest (every existing test that touches it mocks it away
 * wholesale), and importing it would pull client navigation code into
 * `sitemap.ts` and `robots.ts`, which run at build time outside React.
 *
 * The cost is that next-intl's prefix rule is reimplemented here. It is kept
 * honest by seo.test.ts, which asserts the rule directly, and it already reads
 * `routing.pathnames`, so the French slugs planned for phase 1.5 propagate to
 * canonicals, hreflang and the sitemap without an edit here.
 */
function localizedPathname(locale: string, href: string): string {
  const pathnames = (
    routing as { pathnames?: Record<string, string | Record<string, string>> }
  ).pathnames;
  const entry = pathnames?.[href];
  const path =
    entry === undefined
      ? href
      : typeof entry === "string"
        ? entry
        : (entry[locale] ?? href);

  const mode = prefixMode();
  const unprefixed =
    mode === "never" || (mode === "as-needed" && locale === routing.defaultLocale);
  const prefix = unprefixed ? "" : `/${locale}`;
  const tail = path === "/" ? "" : path;

  return `${prefix}${tail}` || "/";
}

/** Absolute URL for a route in a locale, on the canonical host. */
export function absoluteUrl(locale: string, href: string): string {
  const url = new URL(localizedPathname(locale, href), SITE_URL).toString();
  // new URL("/", base) keeps a trailing slash; every other path has none.
  // Strip it so the root and its canonical are the same string everywhere.
  return url.endsWith("/") ? url.slice(0, -1) : url;
}

export function languageAlternates(href: string): Record<string, string> {
  const languages: Record<string, string> = {};
  for (const locale of routing.locales) {
    languages[locale] = absoluteUrl(locale, href);
  }
  languages["x-default"] = absoluteUrl(routing.defaultLocale, href);
  return languages;
}

export function buildMetadata({
  locale,
  href,
  title,
  description,
}: {
  locale: string;
  href: string;
  title: string;
  description: string;
}): Metadata {
  const url = absoluteUrl(locale, href);
  return {
    title,
    description,
    alternates: {
      canonical: url,
      languages: languageAlternates(href),
    },
    openGraph: {
      type: "website",
      siteName: SITE_NAME,
      title,
      description,
      url,
      locale,
      images: ["/og.png"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/og.png"],
    },
  };
}
