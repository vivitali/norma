/**
 * The country seam: what a URL's locale segment splits into.
 *
 * `scripts/assert-prerendered.mjs` imports `./routing`, which imports this file, with
 * Node's type stripping — so this module has to stay trivially evaluable outside the
 * Next build too: no `@/` path aliases (Node does not read tsconfig `paths`), no JSON
 * imports, no env vars, and no dependency on `next-intl` itself. That last one is what
 * lets `scripts/smoke` import this file directly to learn each locale's URL prefix
 * without needing `node_modules` installed — smoke runs against a deployed URL from
 * wherever, and `routing.ts`'s own `next-intl/routing` import is exactly why smoke has
 * never imported THAT file.
 *
 * Three named types carry the split (docs/superpowers/specs/2026-08-29-us-market-design.md,
 * "Routing mechanics for Decision 1"):
 * - `Language` — what a catalogue is written in. Selects `messages/<language>.json`.
 * - `Country` — which market's rules apply. Selects the rules/data registry (future work).
 * - `Locale` — the pair, e.g. `en-CA`. The only thing next-intl's routing sees.
 *
 * `COUNTRIES` is a total `Record<Country, CountryProfile>`, so a country missing an
 * entry is a compile error rather than a silent fallback to Canadian conventions —
 * exactly the discipline `LOCALES` in `src/lib/locales.ts` already applies to locales.
 * Adding a second country (the US market spec's own next step) means adding one entry
 * here; `routing.locales` and every URL prefix are derived from it, not typed twice.
 */

export type Language = "en" | "fr" | "uk" | "es";

export type Country = "ca";

/** A BCP-47 language-region tag: the pair a URL prefix and next-intl both resolve. */
export type Locale = `${Language}-${Uppercase<Country>}`;

export interface CountryProfile {
  /** The path segment every one of this country's locales is nested under, e.g. "/ca". */
  readonly segment: string;
  /** Languages this country ships, in the order the switcher should offer them. */
  readonly languages: readonly Language[];
}

export const COUNTRIES: Record<Country, CountryProfile> = {
  ca: { segment: "/ca", languages: ["en", "fr", "uk", "es"] },
};

/** The language half of a locale pair: "fr-CA" -> "fr". */
export function languageOf(locale: Locale): Language {
  return locale.slice(0, locale.indexOf("-")) as Language;
}

/** The country half of a locale pair: "fr-CA" -> "ca". */
export function countryOf(locale: Locale): Country {
  return locale.slice(locale.indexOf("-") + 1).toLowerCase() as Country;
}

function localeFor(language: Language, country: Country): Locale {
  return `${language}-${country.toUpperCase()}` as Locale;
}

/** Every locale the app serves: one entry per (country, language) pair in the registry. */
export function allLocales(): Locale[] {
  return (Object.keys(COUNTRIES) as Country[]).flatMap((country) =>
    COUNTRIES[country].languages.map((language) => localeFor(language, country)),
  );
}

/** The URL prefix next-intl mounts each locale at, e.g. "en-CA" -> "/ca/en". */
export function localePrefixes(): Record<Locale, string> {
  const prefixes = {} as Record<Locale, string>;
  for (const country of Object.keys(COUNTRIES) as Country[]) {
    const profile = COUNTRIES[country];
    for (const language of profile.languages) {
      prefixes[localeFor(language, country)] = `${profile.segment}/${language}`;
    }
  }
  return prefixes;
}

/** Every locale belonging to the same country as `locale`, in registry order. */
export function localesForCountry(locale: Locale): Locale[] {
  const country = countryOf(locale);
  return COUNTRIES[country].languages.map((language) => localeFor(language, country));
}
