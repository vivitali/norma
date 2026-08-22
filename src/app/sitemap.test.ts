import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { INDEXABLE_ROUTES, absoluteUrl } from "@/lib/seo";
import sitemap from "./sitemap";

describe("sitemap", () => {
  const entries = sitemap();

  it("has one entry per route per locale", () => {
    expect(entries).toHaveLength(INDEXABLE_ROUTES.length * routing.locales.length);
  });

  it("contains every locale of every indexable route", () => {
    for (const href of INDEXABLE_ROUTES) {
      for (const locale of routing.locales) {
        expect(entries.some((e) => e.url === absoluteUrl(locale, href))).toBe(true);
      }
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
