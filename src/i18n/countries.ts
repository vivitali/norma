/**
 * The country seam: what a URL's locale segment splits into.
 *
 * `scripts/smoke`, `scripts/assert-prerendered.mjs` and `scripts/generate-og.mjs` all
 * import THIS file directly, with Node's type stripping — not `./routing`. `routing.ts`
 * imports `next-intl/routing` (so it needs `node_modules` installed) AND imports this
 * file with a bare relative specifier (`"./countries"`), which the Next/webpack bundler
 * and tsc both resolve but which Node's own ESM resolver rejects outright with no
 * bundler in front of it — an extensionless relative specifier is not something Node
 * will resolve on its own. So this module has to stay trivially evaluable outside the
 * Next build: no `@/` path aliases (Node does not read tsconfig `paths`), no JSON
 * imports, no env vars, and no dependency on `next-intl` itself. That is what lets the
 * three scripts above import this file directly to learn each locale's URL prefix
 * without needing `node_modules` installed — `scripts/smoke` in particular runs against
 * a deployed URL from wherever, and going through `routing.ts` would fail there for a
 * reason that has nothing to do with the deploy it is testing.
 *
 * Three named types carry the split (docs/superpowers/specs/2026-08-29-us-market-design.md,
 * "Routing mechanics for Decision 1"):
 * - `Language` — what a catalogue is written in. Selects `messages/<language>.json`.
 * - `Country` — which market's rules apply. Selects the rules/data registry (future work).
 * - `Locale` — the pair, e.g. `en-CA`. The only thing next-intl's routing sees.
 *
 * `Country` is `keyof typeof COUNTRIES`, DERIVED from the registry rather than declared
 * separately — so the two can never disagree, which a hand-written `Country = "ca"` union
 * checked only one-way (`COUNTRIES` had to satisfy `Record<Country, CountryProfile>`, but
 * nothing stopped `Country` itself from naming a key `COUNTRIES` lacked). Adding a second
 * country means adding one entry to `COUNTRIES`; `routing.locales`, every URL prefix, and
 * `Country` itself are all derived from it, not typed twice.
 *
 * `Locale` is likewise derived, as the registry's own (country, language) PAIRS — not the
 * full cross product of every `Language` against every `Country`. `us: { languages: ["en",
 * "es"] }` must NOT make `"fr-US"` or `"uk-US"` valid `Locale` values just because `fr` and
 * `uk` exist as `Language`s somewhere else in the registry: a `Record<Locale, …>` like
 * `LOCALES` in `src/lib/locales.ts` would then accept — and silently under-constrain — a
 * locale no country actually declares. See `LocalePairsOf` below, and
 * `countries.types.test.ts`, which proves this against a registry shape unrelated to
 * `COUNTRIES` so the property is asserted rather than merely true of today's one country.
 */

export type Language = "en" | "fr" | "uk" | "es";

export interface CountryProfile {
  /** The path segment every one of this country's locales is nested under, e.g. "/ca". */
  readonly segment: string;
  /** Languages this country ships, in the order the switcher should offer them. */
  readonly languages: readonly Language[];
}

export const COUNTRIES = {
  ca: { segment: "/ca", languages: ["en", "fr", "uk", "es"] },
  /**
   * The US does not inherit Canada's locale set (design spec, "Locales per country"):
   * French and Ukrainian have no particular claim on a US audience, while Spanish plainly
   * does. `en` first so `defaultPrefixes()` and the locale switcher's default ordering
   * both resolve `en-US` as the US default, the same way `en-CA` is Canada's.
   */
  us: { segment: "/us", languages: ["en", "es"] },
} as const satisfies Record<string, CountryProfile>;

export type Country = keyof typeof COUNTRIES;

/**
 * The exact (country, language) pairs a registry declares, as a union of template-literal
 * locale tags. Generic — not written directly against `COUNTRIES` — purely so its
 * correctness can be pinned by a type-level test against a registry `COUNTRIES` does not
 * itself define; see the module doc comment above and `countries.types.test.ts`.
 */
export type LocalePairsOf<Registry extends Record<string, CountryProfile>> = {
  [C in keyof Registry & string]: `${Registry[C]["languages"][number]}-${Uppercase<C>}`;
}[keyof Registry & string];

/** A BCP-47 language-region tag: the pair a URL prefix and next-intl both resolve. */
export type Locale = LocalePairsOf<typeof COUNTRIES>;

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

/**
 * Each country's own default-language prefix, e.g. `ca` -> `/ca/en` (the first entry in
 * `languages`, the same ordering `routing.defaultLocale` already relies on for `ca`).
 *
 * This is the destination for a redirect on the BARE country segment (`/ca`, which names
 * no language yet): `src/lib/redirects.ts` generates one such rule per registry entry
 * from this, rather than writing `/ca` -> `/ca/en` by hand, so a second country gets the
 * same redirect for free.
 */
export function defaultPrefixes(): Record<Country, string> {
  const prefixes = localePrefixes();
  const result = {} as Record<Country, string>;
  for (const country of Object.keys(COUNTRIES) as Country[]) {
    const [defaultLanguage] = COUNTRIES[country].languages;
    result[country] = prefixes[localeFor(defaultLanguage, country)];
  }
  return result;
}
