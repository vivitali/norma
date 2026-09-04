/**
 * The indexable route list, each route's `Metadata` message key, and the
 * social-card path rule. Deliberately import-free.
 *
 * `scripts/generate-og.mjs` imports this with Node's type stripping, exactly as
 * `scripts/assert-prerendered.mjs` and `scripts/smoke` import `src/i18n/countries.ts`
 * directly (not `src/i18n/routing.ts` — that file imports `next-intl/routing`, and its
 * own relative import of `./countries` is extensionless, which the Next/webpack
 * bundler resolves fine but which Node's own ESM resolver rejects with no bundler in
 * front of it). So: no `@/` path aliases here (Node does not read tsconfig `paths`),
 * no JSON imports, no env vars. `src/lib/seo.ts` re-exports all of it, so application
 * code carries on importing from there.
 */

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

/**
 * The key under `Metadata` in messages/*.json for each route. The mapping was
 * previously implicit, spread across nine route layouts; the card generator
 * needs it in one place, and `satisfies` turns "added a route, forgot the key"
 * into a typecheck failure rather than a missing card.
 *
 * Deliberately NOT reusing `NAV[].label` from ./routes: those are keys under
 * the `Nav` namespace. They happen to coincide today, and coupling them would
 * mean renaming a nav label silently breaks a social card.
 */
export const ROUTE_METADATA_KEY = {
  "/": "home",
  "/affordability": "affordability",
  "/closing-costs": "closingCosts",
  "/down-payment": "downPayment",
  "/rrsp-hbp": "rrspHbp",
  "/amortization": "amortization",
  "/rent-vs-buy": "rentVsBuy",
  "/scenarios": "scenarios",
  "/sources": "sources",
} as const satisfies Record<IndexableRoute, string>;

/**
 * Country literal, duplicated rather than imported from `src/i18n/countries.ts` — this
 * file has to stay import-free (see the header comment), and `Country` there is
 * `keyof typeof COUNTRIES` rather than a hand-written union, so it cannot be
 * re-declared here without an import either. `src/lib/routes.ts`'s `ROUTE_COUNTRIES`
 * (the one every NAV entry and every UI surface actually reads) is checked against
 * this one in `routes-availability.test.ts` so the two cannot drift.
 */
type Country = "ca" | "us";

/**
 * Which countries each route exists in — RRSP-HBP is Canada-only (US-market spec, "no
 * US analogue"), every other route ships in both. This is the route half of what
 * `src/lib/routes.ts`'s `NAV[].countries` also states (for the header nav); this copy
 * exists so `scripts/generate-og.mjs` and `scripts/assert-prerendered.mjs` can read it
 * with Node's type stripping and no bundler, exactly like `INDEXABLE_ROUTES` above.
 */
export const ROUTE_COUNTRIES: Record<IndexableRoute, readonly Country[]> = {
  "/": ["ca", "us"],
  "/affordability": ["ca", "us"],
  "/closing-costs": ["ca", "us"],
  "/down-payment": ["ca", "us"],
  "/rrsp-hbp": ["ca"],
  "/amortization": ["ca", "us"],
  "/rent-vs-buy": ["ca", "us"],
  "/scenarios": ["ca", "us"],
  "/sources": ["ca", "us"],
};

/**
 * Every locale, out of the ones passed in, whose country segment matches this route's
 * `ROUTE_COUNTRIES` entry. Takes the full locale list as a parameter rather than
 * importing `allLocales()`/`countryOf()` from `src/i18n/countries.ts` — that import
 * would reintroduce the exact extensionless-relative-specifier failure this file's own
 * header comment describes, just one file removed. A locale's country is read off its
 * own suffix (`"en-US".slice(2 + 1)` -> `"us"`) rather than imported, which is safe
 * only because every locale this app serves is a two-letter language plus a hyphen
 * plus the country code — exactly what `countryOf()` in `src/i18n/countries.ts` does,
 * duplicated here for the same Node-type-stripping reason as `Country` above.
 */
export function routeLocales<L extends string>(
  route: IndexableRoute,
  locales: readonly L[],
): L[] {
  const countries = ROUTE_COUNTRIES[route];
  return locales.filter((locale) => {
    const country = locale.slice(locale.indexOf("-") + 1).toLowerCase();
    return (countries as readonly string[]).includes(country);
  });
}

/**
 * Every platform that unfurls a link reads these. Declaring them in the markup
 * lets Slack, LinkedIn and Discord lay the card out before the image finishes
 * downloading; without them some renderers skip the image on first paste and
 * only show it after a re-scrape.
 */
export const OG_IMAGE_WIDTH = 1200;
export const OG_IMAGE_HEIGHT = 630;

/**
 * One card per route per locale. A French share showing an English card is the
 * kind of seam that makes a product look machine-translated, and the card text
 * comes from the same message files as the page title, so the two cannot drift.
 *
 * Written by scripts/generate-og.mjs; og-image.test.ts asserts every one exists.
 */
export function ogImagePath(locale: string, href: string): string {
  const slug = href === "/" ? "home" : href.replace(/^\//, "");
  return `/og/${locale}/${slug}.png`;
}
