import type { Metadata } from "next";
import { routing } from "@/i18n/routing";
import { localeProfile } from "@/lib/locales";
import {
  INDEXABLE_ROUTES,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  ROUTE_METADATA_KEY,
  ogImagePath,
  type IndexableRoute,
} from "./og-manifest";

export {
  INDEXABLE_ROUTES,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  ROUTE_METADATA_KEY,
  ogImagePath,
  type IndexableRoute,
};

/**
 * The canonical host. One host, always absolute: a relative canonical resolves
 * against whatever host served the page, which on a Worker can be a versioned
 * preview hostname — exactly the duplicate a canonical exists to prevent.
 */
export const SITE_URL = "https://affordmath.com";
export const SITE_NAME = "AffordMath";

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
function localePrefixOf(locale: string): string {
  const configured = (
    routing as { localePrefix?: LocalePrefixMode | { mode: LocalePrefixMode; prefixes?: Record<string, string> } }
  ).localePrefix;
  const prefixes = typeof configured === "object" ? configured.prefixes : undefined;
  const prefix = prefixes?.[locale];
  // A country-qualified locale ("en-CA") spans two URL segments ("/ca/en"): the
  // `prefixes` map in routing.ts is the one place that mapping is written, so this
  // reads it rather than reconstructing a prefix from the locale tag. There is no
  // honest fallback for a locale missing from that map — "/<locale>" would silently
  // emit "/en-CA/..." into a canonical or a sitemap entry, exactly the old, pre-/ca/
  // URL shape this migration exists to retire, and it would do it invisibly, in
  // output nothing in this module's own tests would catch (they iterate
  // `routing.locales`, which is itself derived from the same registry `prefixes`
  // comes from — so this can only diverge from an actual routing.ts bug, never from a
  // locale this app doesn't serve). Throw rather than paper over it.
  if (!prefix) {
    throw new Error(`localePrefixOf: no URL prefix configured for locale "${locale}"`);
  }
  return prefix;
}

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
  const prefix = unprefixed ? "" : localePrefixOf(locale);
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
  const image = {
    url: ogImagePath(locale, href),
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    alt: title,
    type: "image/png",
  };

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
      // og:locale wants a full language_TERRITORY tag, not a bare language subtag:
      // "es" alone tells a crawler nothing about which Spanish, and Facebook's own
      // parser ignores a value it cannot match. The territory comes off the same
      // table that decides how figures are formatted, so the two cannot disagree.
      locale: localeProfile(locale).intl.replace("-", "_"),
      // Declaring the other locales lets a crawler that lands on one language
      // know the others exist. Distinct from hreflang, which search engines
      // read; this is what social scrapers read.
      alternateLocale: routing.locales
        .filter((other) => other !== locale)
        .map((other) => localeProfile(other).intl.replace("-", "_")),
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      // Next derives twitter:image:alt from the alt on this object, so the card
      // is described for screen readers on the platforms that expose it.
      images: [image],
    },
  };
}
