import { describe, expect, it } from "vitest";
import { COUNTRIES, type Country, type Language } from "@/i18n/countries";
import { redirects } from "./redirects";

/**
 * Reads `source` as Next's redirect matcher would, without depending on
 * `path-to-regexp` — it is only a transitive dependency here (via `next` and
 * `@opennextjs/aws`, at two different versions), not one this project declares, so
 * importing it directly would make this test's correctness depend on hoisting.
 *
 * `redirects()` only ever emits three shapes, so this stays a translation of the actual
 * `source` strings rather than a hardcoded assumption about what they say:
 * - a `(a|b|c)` capture group for the constrained `:lang` segment, with an optional
 *   `/:path*` tail. `:path*` is zero-or-more *path segments*, which is why Next needs
 *   a separate bare rule for "/en" — that optional tail still requires the leading
 *   slash plus at least one character when present, mirrored here as `(?:/.+)?`.
 * - a literal, non-dynamic segment (a bare country's `source`, e.g. "/ca") — no
 *   capture group, no wildcard tail, matches only that exact path.
 * - a literal two-segment `/<country>/<invalid-language>` source (an invalid pair,
 *   from `invalidLanguagePairRedirects()`), with an optional literal `/:path*` tail —
 *   same shape as the bare literal above, one segment deeper, with the same optional
 *   tail the dynamic case has.
 */
function matches(source: string, path: string): boolean {
  const dynamic = /^\/:lang\(([^)]+)\)(\/:path\*)?$/.exec(source);
  if (dynamic) {
    const [, langPattern, hasPathTail] = dynamic;
    const tail = hasPathTail ? "(?:/.+)?" : "";
    return new RegExp(`^/(?:${langPattern})${tail}$`).test(path);
  }
  if (/^\/[a-z0-9-]+$/i.test(source)) {
    return source === path;
  }
  const pair = /^(\/[a-z0-9-]+\/[a-z0-9-]+)(\/:path\*)?$/i.exec(source);
  if (pair) {
    const [, literal, hasPathTail] = pair;
    const tail = hasPathTail ? "(?:/.+)?" : "";
    return new RegExp(`^${literal}${tail}$`).test(path);
  }
  throw new Error(`redirects.test.ts does not know this source shape: ${source}`);
}

describe("redirects", () => {
  const rules = redirects();

  it("covers every pre-migration Canadian language", () => {
    for (const lang of COUNTRIES.ca.languages) {
      expect(rules.some((r) => matches(r.source, `/${lang}`))).toBe(true);
      expect(rules.some((r) => matches(r.source, `/${lang}/affordability`))).toBe(true);
    }
  });

  it("redirects a bare language prefix to its /ca/ equivalent", () => {
    const rule = rules.find((r) => matches(r.source, "/en"));
    expect(rule).toBeDefined();
    expect(rule?.destination).toBe("/ca/:lang");
    expect(rule?.permanent).toBe(true);
  });

  it("redirects a language-prefixed page to its /ca/ equivalent", () => {
    const rule = rules.find((r) => matches(r.source, "/fr/abordabilite"));
    expect(rule).toBeDefined();
    expect(rule?.destination).toBe("/ca/:lang/:path*");
    expect(rule?.permanent).toBe(true);
  });

  it("covers every registered country with a bare-segment redirect", () => {
    // Derived from COUNTRIES, not hardcoded to "/ca": the point of this rule set is
    // that a second country's bare segment gets the same redirect for free.
    for (const country of Object.keys(COUNTRIES) as Country[]) {
      const segment = COUNTRIES[country].segment;
      expect(rules.some((r) => matches(r.source, segment)), segment).toBe(true);
    }
  });

  it("redirects a bare country segment to that country's default-language prefix", () => {
    const rule = rules.find((r) => matches(r.source, "/ca"));
    expect(rule).toBeDefined();
    // The bare segment names no language yet, so the redirect target is the first
    // entry in COUNTRIES.ca.languages, resolved to its real URL prefix — not a
    // template like the language rules above, since a country's default language
    // varies per country and can't be filled in from the matched segment alone.
    expect(rule?.destination).toBe("/ca/en");
    expect(rule?.permanent).toBe(true);
  });

  it("never matches a /ca/<language> or deeper path, so a redirected request cannot loop", () => {
    for (const rule of rules) {
      expect(matches(rule.source, "/ca/en")).toBe(false);
      expect(matches(rule.source, "/ca/en/affordability")).toBe(false);
      expect(matches(rule.source, "/ca/fr/abordabilite")).toBe(false);
    }
  });

  it("leaves the sitemap, robots, and Next internals alone", () => {
    for (const rule of rules) {
      expect(matches(rule.source, "/sitemap.xml")).toBe(false);
      expect(matches(rule.source, "/robots.txt")).toBe(false);
      expect(matches(rule.source, "/_next/static/chunk.js")).toBe(false);
      expect(matches(rule.source, "/favicon.ico")).toBe(false);
    }
  });

  it("leaves an unrecognized language prefix alone", () => {
    for (const rule of rules) {
      expect(matches(rule.source, "/de")).toBe(false);
      expect(matches(rule.source, "/de/affordability")).toBe(false);
    }
  });

  it("leaves an unregistered country segment alone", () => {
    for (const rule of rules) {
      expect(matches(rule.source, "/mx")).toBe(false);
    }
  });

  it("redirects the bare US segment to its default-language prefix", () => {
    // US-market spec: the bare-country rule is derived from COUNTRIES via
    // defaultPrefixes(), so a second registered country gets this redirect for free —
    // this is the assertion that promise actually held once "us" landed in the registry.
    const rule = rules.find((r) => matches(r.source, "/us"));
    expect(rule).toBeDefined();
    expect(rule?.destination).toBe("/us/en");
    expect(rule?.permanent).toBe(true);
  });

  it("never matches a /us/<language> or deeper path, so a redirected request cannot loop", () => {
    for (const rule of rules) {
      expect(matches(rule.source, "/us/en")).toBe(false);
      expect(matches(rule.source, "/us/en/affordability")).toBe(false);
      expect(matches(rule.source, "/us/es/capacidad-de-compra")).toBe(false);
    }
  });

  describe("invalid (country, language) pairs", () => {
    const ALL_LANGUAGES: Language[] = Array.from(
      new Set((Object.keys(COUNTRIES) as Country[]).flatMap((c) => COUNTRIES[c].languages)),
    );

    it("redirects every (country, language-not-in-that-country) pair to the country's own default language", () => {
      for (const country of Object.keys(COUNTRIES) as Country[]) {
        const profile = COUNTRIES[country];
        const [defaultLanguage] = profile.languages;
        const countryLanguages: readonly Language[] = profile.languages;
        const invalidLanguages = ALL_LANGUAGES.filter((l) => !countryLanguages.includes(l));
        for (const lang of invalidLanguages) {
          const bare = rules.find((r) => matches(r.source, `${profile.segment}/${lang}`));
          expect(bare, `${profile.segment}/${lang}`).toBeDefined();
          expect(bare?.destination).toBe(`${profile.segment}/${defaultLanguage}`);
          expect(bare?.permanent).toBe(true);

          const withPath = rules.find((r) =>
            matches(r.source, `${profile.segment}/${lang}/affordability`),
          );
          expect(withPath, `${profile.segment}/${lang}/affordability`).toBeDefined();
          expect(withPath?.destination).toBe(`${profile.segment}/${defaultLanguage}/:path*`);
          expect(withPath?.permanent).toBe(true);
        }
      }
    });

    it("redirects /us/fr/affordability and /us/uk to the US default language, concretely", () => {
      const frRule = rules.find((r) => matches(r.source, "/us/fr/affordability"));
      expect(frRule).toBeDefined();
      expect(frRule?.destination).toBe("/us/en/:path*");

      const ukRule = rules.find((r) => matches(r.source, "/us/uk"));
      expect(ukRule).toBeDefined();
      expect(ukRule?.destination).toBe("/us/en");
    });

    it("leaves every valid (country, language) pair untouched", () => {
      for (const country of Object.keys(COUNTRIES) as Country[]) {
        const profile = COUNTRIES[country];
        for (const lang of profile.languages) {
          for (const rule of rules) {
            expect(matches(rule.source, `${profile.segment}/${lang}`), rule.source).toBe(false);
            expect(
              matches(rule.source, `${profile.segment}/${lang}/affordability`),
              rule.source,
            ).toBe(false);
          }
        }
      }
    });
  });
});
