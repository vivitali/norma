import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { INDEXABLE_ROUTES, absoluteUrl, localesForRoute } from "@/lib/seo";
import sitemap from "./sitemap";

describe("sitemap", () => {
  const entries = sitemap();

  it("has one entry per route per locale THAT ROUTE EXISTS IN", () => {
    // Not INDEXABLE_ROUTES.length * routing.locales.length: RRSP-HBP is Canada-only
    // (US-market spec), so it contributes four entries, not six, and the sitemap must
    // not claim an es-US or en-US RRSP-HBP page that 404s.
    const expected = INDEXABLE_ROUTES.reduce(
      (sum, href) => sum + localesForRoute(href).length,
      0,
    );
    expect(entries).toHaveLength(expected);
  });

  it("contains every locale of every indexable route THAT ROUTE EXISTS IN", () => {
    for (const href of INDEXABLE_ROUTES) {
      for (const locale of localesForRoute(href)) {
        expect(entries.some((e) => e.url === absoluteUrl(locale, href))).toBe(true);
      }
    }
  });

  it("never lists a US locale for the Canada-only RRSP-HBP route", () => {
    const usUrls = ["en-US", "es-US"].map((locale) => absoluteUrl(locale, "/rrsp-hbp"));
    for (const url of usUrls) {
      expect(entries.some((e) => e.url === url)).toBe(false);
    }
  });

  it("has no duplicate urls", () => {
    const urls = entries.map((e) => e.url);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it("gives every entry hreflang alternates", () => {
    for (const entry of entries) {
      expect(Object.keys(entry.alternates?.languages ?? {})).toContain("x-default");
    }
  });

  /**
   * Six more pages are coming (Closing Costs, Down Payment, RRSP-HBP,
   * Amortization, Rent vs Buy, Scenarios). Without this, each one ships
   * unlisted and nobody notices, because a short sitemap looks exactly like a
   * correct one.
   *
   * The glob is "src/app/ ** /page.tsx" rather than one naming [locale]:
   * square brackets in a glob pattern are a character class, so "[locale]"
   * would match a single letter, not the directory.
   */
  it("lists every page route that exists on disk", () => {
    const routesOnDisk = globSync("src/app/**/page.tsx")
      .map((file) => {
        const route = file
          .replace(/^src\/app\/\[locale\]/, "")
          .replace(/\/page\.tsx$/, "");
        return route === "" ? "/" : route;
      })
      .sort();

    expect([...INDEXABLE_ROUTES].sort()).toEqual(routesOnDisk);
  });
});
