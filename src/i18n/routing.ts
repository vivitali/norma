import { defineRouting } from "next-intl/routing";

/**
 * `scripts/assert-prerendered.mjs` imports this file directly with Node's type
 * stripping to learn which locales must be prerendered. That means this module has
 * to stay trivially evaluable outside the Next build: no `@/` path aliases (Node
 * does not read tsconfig `paths`), no JSON imports, no env vars. If you need one of
 * those here, the guard needs another way to read the locale list — CI will go red
 * rather than silently stop checking, but it will be red until you fix it.
 *
 * Canonical route keys are English and double as the English slug — next-intl's convention.
 * Adding a page means adding one entry here and one nav entry in src/lib/routes.ts; no component
 * ever writes a route string.
 *
 * `en` is deliberately absent from every entry: next-intl resolves a missing locale as
 * `pathnameConfig[locale] || internalTemplate`, so the canonical key IS the English slug. Writing
 * it out would be redundant and would drift the moment a key is renamed.
 *
 * Slugs are ASCII without accents. `/abordabilite` rather than `/abordabilité`, because an
 * accented path percent-encodes to %C3%A9 as soon as it is copied, pasted or logged, and the
 * French reader loses nothing legible. `reer-rap` uses the French acronyms (Régime enregistré
 * d'épargne-retraite / Régime d'accession à la propriété) — what a francophone actually searches
 * for, not a transliteration of "RRSP-HBP".
 *
 * The filesystem keeps the canonical key: src/app/[locale]/affordability/page.tsx serves
 * /fr/abordabilite via a rewrite in src/middleware.ts. This costs no extra Worker invocations —
 * the middleware matcher already catches every non-asset path for locale detection.
 */
export const routing = defineRouting({
  locales: ["en", "fr"],
  defaultLocale: "en",
  pathnames: {
    "/": "/",
    "/affordability": { fr: "/abordabilite" },
    "/closing-costs": { fr: "/frais-de-cloture" },
    "/down-payment": { fr: "/mise-de-fonds" },
    "/rrsp-hbp": { fr: "/reer-rap" },
    "/amortization": { fr: "/amortissement" },
    "/rent-vs-buy": { fr: "/louer-ou-acheter" },
    "/scenarios": { fr: "/scenarios" },
    "/sources": { fr: "/sources" },
    "/privacy": { fr: "/confidentialite" },
    "/terms": { fr: "/conditions" },
  },
});
