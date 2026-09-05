import { defineRouting } from "next-intl/routing";
import { allLocales, localePrefixes, languageOf, type Language, type Locale } from "./countries";

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
 *
 * **Slugs are declared once per LANGUAGE, not per locale**, and expanded below to every
 * locale that speaks it — `es-CA` and `es-US` share `/capacidad-de-compra`, because a slug is
 * a fact about the language, not the country segment in front of it (US-market spec, Decision
 * 3: "a country is a registry entry", applied one level down to languages within it). Writing
 * `"es-CA": "..."` a second time for `"es-US"` would be the exact two-locale-coincidence mistake
 * CLAUDE.md already records for `locale !== "en"`. `perLanguage()` reads `COUNTRIES` via
 * `allLocales()`/`languageOf()`, so a locale this app doesn't serve can never receive a slug and
 * a language absent from the map (Ukrainian, everywhere; Spanish, on `/rrsp-hbp`) is skipped
 * for every locale that speaks it — including a future one.
 */
function perLanguage(slugs: Partial<Record<Language, string>>): Partial<Record<Locale, string>> {
  const result: Partial<Record<Locale, string>> = {};
  for (const locale of allLocales()) {
    const slug = slugs[languageOf(locale)];
    if (slug) result[locale] = slug;
  }
  return result;
}

export const routing = defineRouting({
  locales: allLocales(),
  defaultLocale: "en-CA",
  localePrefix: { mode: "always", prefixes: localePrefixes() },
  pathnames: {
    "/": "/",
    "/affordability": perLanguage({ fr: "/abordabilite", es: "/capacidad-de-compra" }),
    "/closing-costs": perLanguage({ fr: "/frais-de-cloture", es: "/gastos-de-cierre" }),
    "/down-payment": perLanguage({ fr: "/mise-de-fonds", es: "/pago-inicial" }),
    // No US analogue exists at all (US-market spec, "Out of scope") — this route is still
    // declared here (next-intl needs a pathname config to resolve `Link` on it from ANY
    // locale, including US ones, even though no US page will ever render it), but with no
    // Spanish slug, same as today: RRSP and HBP name Canadian paperwork.
    "/rrsp-hbp": perLanguage({ fr: "/reer-rap" }),
    "/amortization": perLanguage({ fr: "/amortissement", es: "/amortizacion" }),
    "/rent-vs-buy": perLanguage({ fr: "/louer-ou-acheter", es: "/alquilar-o-comprar" }),
    "/scenarios": perLanguage({ fr: "/scenarios", es: "/escenarios" }),
    "/sources": perLanguage({ fr: "/sources", es: "/fuentes" }),
  },
});
