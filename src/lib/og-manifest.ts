/**
 * The indexable route list, each route's `Metadata` message key, and the
 * social-card path rule. Deliberately import-free.
 *
 * `scripts/generate-og.mjs` imports this with Node's type stripping, exactly as
 * `scripts/assert-prerendered.mjs` imports `src/i18n/routing.ts`. So: no `@/`
 * path aliases here (Node does not read tsconfig `paths`), no JSON imports, no
 * env vars. `src/lib/seo.ts` re-exports all of it, so application code carries
 * on importing from there.
 */

/**
 * Routes that belong in the sitemap. Extend as pages ship.
 *
 * `/privacy` and `/terms` are indexable, deliberately: they are unremarkable legal
 * pages, not the kind of thin/duplicate content a sitemap should hide, and a search
 * engine surfacing them directly (rather than only via the footer link) is normal.
 */
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
  "/privacy",
  "/terms",
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
  "/privacy": "privacy",
  "/terms": "terms",
} as const satisfies Record<IndexableRoute, string>;

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
