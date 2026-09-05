import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { COUNTRIES, localesForCountry, type Country } from "@/i18n/countries";
import { CATALOGUES } from "@/test/catalogues";
import { LOCALES, localeProfile } from "./locales";

describe("the locale table", () => {
  it("describes every routed locale, and nothing else", () => {
    // `Record<Locale, LocaleProfile>` already makes a missing entry a compile error.
    // This is the runtime half — and the readable statement of the invariant, which a
    // type in a file nobody opens is not.
    expect(Object.keys(LOCALES).sort()).toEqual([...routing.locales].sort());
  });

  it("gives every locale a tag Intl actually resolves", () => {
    for (const [locale, { intl }] of Object.entries(LOCALES)) {
      // A typo'd tag does not throw — Intl silently falls back to the system locale,
      // so the figures would be formatted for whatever machine ran the build.
      expect(Intl.NumberFormat.supportedLocalesOf([intl]), locale).toEqual([intl]);
    }
  });

  it("gives every locale an intl tag Open Graph can also use", () => {
    // `intl` has two consumers now: Intl formatting, and og:locale via seo.ts, which needs
    // a language_TERRITORY tag. Their well-formedness rules differ, and
    // `supportedLocalesOf` above would happily accept `es-419` — a defensible future
    // choice for Latin American Spanish that this table's own comment weighs, and one that
    // becomes an invalid `es_419` in a meta tag. Either this constraint holds or
    // LocaleProfile needs its own `ogLocale`; it must not be discovered by a crawler.
    for (const [locale, { intl }] of Object.entries(LOCALES)) {
      expect(intl, locale).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
    }
  });

  it("gives every locale a distinct switcher label WITHIN ITS OWN COUNTRY", () => {
    // Not globally distinct: LocaleSwitcher only ever offers one country's locales at
    // once (localesForCountry), so "en-CA" and "en-US" sharing the label "EN" is fine
    // — they never appear together in the same dropdown. What must not happen is two
    // locales of the SAME country sharing a label.
    for (const country of Object.keys(COUNTRIES) as Country[]) {
      const labels = localesForCountry(`${COUNTRIES[country].languages[0]}-${country.toUpperCase()}` as never)
        .map((locale) => LOCALES[locale].label);
      expect(new Set(labels).size, country).toBe(labels.length);
    }
  });

  it("gives every locale a catalogue of its own, not another locale's", () => {
    // `satisfies Record<Locale, unknown>` in catalogues.ts catches a MISSING locale and an
    // extra one. It cannot catch an aliased one: `import uk from "../../messages/fr.json"`
    // type-checks, every cross-locale test then passes, and French ships to Ukrainian
    // readers. The switcher labels already have this guard; the catalogues, which are what
    // actually reaches a reader, did not.
    const seen = new Map<string, string>();
    for (const [locale, messages] of Object.entries(CATALOGUES)) {
      const fingerprint = JSON.stringify(messages);
      const twin = seen.get(fingerprint);
      expect(twin, `${locale} and ${twin} are the same catalogue`).toBeUndefined();
      seen.set(fingerprint, locale);
    }
  });

  it("falls an unknown locale back to the default rather than throwing", () => {
    // The locale reaching `useLocale()` is validated by the layout, so this is a
    // belt-and-braces path — but returning undefined here would format every figure
    // on the page as "NaN" rather than failing anywhere a reader could report.
    expect(localeProfile("de")).toBe(LOCALES[routing.defaultLocale]);
  });
});
