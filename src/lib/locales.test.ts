import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
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

  it("gives every locale a distinct switcher label", () => {
    const labels = Object.values(LOCALES).map((l) => l.label);
    expect(new Set(labels).size).toBe(labels.length);
  });

  it("falls an unknown locale back to the default rather than throwing", () => {
    // The locale reaching `useLocale()` is validated by the layout, so this is a
    // belt-and-braces path — but returning undefined here would format every figure
    // on the page as "NaN" rather than failing anywhere a reader could report.
    expect(localeProfile("de")).toBe(LOCALES[routing.defaultLocale]);
  });
});
