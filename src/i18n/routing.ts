import { defineRouting } from "next-intl/routing";
import { allLocales, localePrefixes } from "./countries";

/**
 * This file imports `next-intl/routing`, so it needs `node_modules` installed to
 * evaluate — unlike `./countries`, which `scripts/smoke` and
 * `scripts/assert-prerendered.mjs` both import DIRECTLY instead of importing this
 * file, precisely to avoid that dependency. `./countries` is imported below with a
 * relative path, extensionless, which the Next/webpack bundler and tsc both resolve
 * fine; Node's own ESM resolver (used by those two scripts via native type stripping,
 * with no bundler in front of it) cannot resolve an extensionless relative specifier
 * at all, which is the other reason those scripts read the registry directly rather
 * than through this file. If you need a `@/` path alias, a JSON import, or an env var
 * in this file, the two scripts need another way to read the locale list — CI will go
 * red rather than silently stop checking, but it will be red until you fix it.
 *
 * Canonical route keys are English and double as the English slug — next-intl's convention.
 * Adding a page means adding one entry here and one nav entry in src/lib/routes.ts; no component
 * ever writes a route string.
 *
 * A locale is deliberately absent from an entry when its slug is the canonical key:
 * next-intl resolves a missing locale as `pathnameConfig[locale] || internalTemplate`. That is
 * why `en-CA` appears nowhere — the canonical key IS the English slug — and it is also the seam
 * that makes a new locale additive. A locale can ship with English slugs and have them
 * translated later, one line at a time.
 *
 * `uk-CA` uses that seam and carries no slugs at all. Slugs here are ASCII (below), and there is
 * no ASCII spelling of a Ukrainian word — only a transliteration, which is a string nobody
 * searches for and nobody reads. `/ca/uk/affordability` is at least a word the reader can
 * recognise from the English page. This is a decision to revisit if Cyrillic slugs ever earn
 * their percent-encoding, not an omission.
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
 * /ca/fr/abordabilite via a rewrite in src/middleware.ts. This costs no extra Worker
 * invocations — the middleware matcher already catches every non-asset path for locale
 * detection.
 *
 * `locales` and `localePrefix.prefixes` are DERIVED from `COUNTRIES` in `./countries` rather
 * than written out here — the country×language pairs live in exactly one place. A prefix spans
 * two URL segments (`/ca/en`), which next-intl's `prefixes` map accepts as an arbitrary string;
 * internally the middleware still rewrites to a single `/en-CA/...` segment, so the filesystem
 * stays `src/app/[locale]/...` with no second dynamic segment. Verified in routing.test.ts.
 */
export const routing = defineRouting({
  locales: allLocales(),
  defaultLocale: "en-CA",
  localePrefix: { mode: "always", prefixes: localePrefixes() },
  pathnames: {
    "/": "/",
    "/affordability": { "fr-CA": "/abordabilite", "es-CA": "/capacidad-de-compra" },
    "/closing-costs": { "fr-CA": "/frais-de-cloture", "es-CA": "/gastos-de-cierre" },
    "/down-payment": { "fr-CA": "/mise-de-fonds", "es-CA": "/pago-inicial" },
    "/rrsp-hbp": { "fr-CA": "/reer-rap" },
    "/amortization": { "fr-CA": "/amortissement", "es-CA": "/amortizacion" },
    "/rent-vs-buy": { "fr-CA": "/louer-ou-acheter", "es-CA": "/alquilar-o-comprar" },
    "/scenarios": { "fr-CA": "/scenarios", "es-CA": "/escenarios" },
    "/sources": { "fr-CA": "/sources", "es-CA": "/fuentes" },
    "/privacy": { "fr-CA": "/confidentialite", "es-CA": "/privacidad" },
    "/terms": { "fr-CA": "/conditions", "es-CA": "/terminos" },
  },
});
