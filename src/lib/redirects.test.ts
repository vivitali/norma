import { describe, expect, it } from "vitest";
import { COUNTRIES } from "@/i18n/countries";
import { redirects } from "./redirects";

/**
 * Reads `source` as Next's redirect matcher would, without depending on
 * `path-to-regexp` — it is only a transitive dependency here (via `next` and
 * `@opennextjs/aws`, at two different versions), not one this project declares, so
 * importing it directly would make this test's correctness depend on hoisting.
 *
 * `redirects()` only ever emits the two shapes below, so this stays a translation of
 * the actual `source` strings rather than a hardcoded assumption about what they say:
 * a `(a|b|c)` capture group for the constrained `:lang` segment, and an optional
 * `/:path*` tail. `:path*` is zero-or-more *path segments*, which is why Next needs a
 * separate bare rule for "/en" — that optional tail still requires the leading slash
 * plus at least one character when present, mirrored here as `(?:/.+)?`.
 */
function matches(source: string, path: string): boolean {
  const parsed = /^\/:lang\(([^)]+)\)(\/:path\*)?$/.exec(source);
  if (!parsed) throw new Error(`redirects.test.ts does not know this source shape: ${source}`);
  const [, langPattern, hasPathTail] = parsed;
  const tail = hasPathTail ? "(?:/.+)?" : "";
  return new RegExp(`^/(?:${langPattern})${tail}$`).test(path);
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

  it("never matches a /ca/ path, so a redirected request cannot loop", () => {
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
});
