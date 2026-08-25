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
 * A locale is deliberately absent from an entry when its slug is the canonical key:
 * next-intl resolves a missing locale as `pathnameConfig[locale] || internalTemplate`. That is
 * why `en` appears nowhere — the canonical key IS the English slug — and it is also the seam
 * that makes a new locale additive. A locale can ship with English slugs and have them
 * translated later, one line at a time.
 *
 * `uk` uses that seam and carries no slugs at all. Slugs here are ASCII (below), and there is no
 * ASCII spelling of a Ukrainian word — only a transliteration, which is a string nobody searches
 * for and nobody reads. `/uk/affordability` is at least a word the reader can recognise from the
 * English page. This is a decision to revisit if Cyrillic slugs ever earn their percent-encoding,
 * not an omission.
 *
 * Slugs are ASCII without accents. `/abordabilite` rather than `/abordabilité`, and
 * `/amortizacion` rather than `/amortización`, because an accented path percent-encodes to
 * %C3%A9 as soon as it is copied, pasted or logged, and the reader loses nothing legible.
 * `reer-rap` uses the French acronyms (Régime enregistré d'épargne-retraite / Régime d'accession
 * à la propriété) — what a francophone actually searches for, not a transliteration of
 * "RRSP-HBP". Spanish keeps `rrsp-hbp`: those are the names on the reader's own Canadian bank
 * and tax paperwork, so there is nothing to translate them into.
 *
 * The filesystem keeps the canonical key: src/app/[locale]/affordability/page.tsx serves
 * /fr/abordabilite via a rewrite in src/middleware.ts. This costs no extra Worker invocations —
 * the middleware matcher already catches every non-asset path for locale detection.
 */
export const routing = defineRouting({
  locales: ["en", "fr", "uk", "es"],
  defaultLocale: "en",
  pathnames: {
    "/": "/",
    "/affordability": { fr: "/abordabilite", es: "/capacidad-de-compra" },
    "/closing-costs": { fr: "/frais-de-cloture", es: "/gastos-de-cierre" },
    "/down-payment": { fr: "/mise-de-fonds", es: "/pago-inicial" },
    "/rrsp-hbp": { fr: "/reer-rap" },
    "/amortization": { fr: "/amortissement", es: "/amortizacion" },
    "/rent-vs-buy": { fr: "/louer-ou-acheter", es: "/alquilar-o-comprar" },
    "/scenarios": { fr: "/scenarios", es: "/escenarios" },
    "/sources": { fr: "/sources", es: "/fuentes" },
    "/privacy": { fr: "/confidentialite", es: "/privacidad" },
    "/terms": { fr: "/conditions", es: "/terminos" },
  },
});
