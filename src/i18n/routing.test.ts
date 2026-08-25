import { describe, expect, it } from "vitest";
import { getPathname } from "@/i18n/navigation";
import { routing } from "./routing";

describe("routing", () => {
  it("supports English and French with English as default", () => {
    expect(routing.locales).toEqual(["en", "fr"]);
    expect(routing.defaultLocale).toBe("en");
  });
});

describe("routing.pathnames", () => {
  it("declares every route the product will have, so URLs are decided once", () => {
    expect(Object.keys(routing.pathnames).sort()).toEqual([
      "/",
      "/affordability",
      "/amortization",
      "/closing-costs",
      "/down-payment",
      "/privacy",
      "/rent-vs-buy",
      "/rrsp-hbp",
      "/scenarios",
      "/sources",
      "/terms",
    ]);
  });

  it("gives every non-root route a French slug", () => {
    for (const [key, value] of Object.entries(routing.pathnames)) {
      if (key === "/") continue;
      expect(value, `${key} has no localized map`).toHaveProperty("fr");
    }
  });

  it("omits en, because a missing locale falls back to the canonical key", () => {
    // Verified in next-intl 4.13.7: getLocalizedTemplate is
    //   pathnameConfig[locale] || internalTemplate
    // Writing en explicitly would be redundant and would drift when a key is renamed.
    for (const value of Object.values(routing.pathnames)) {
      if (typeof value === "string") continue;
      expect(value).not.toHaveProperty("en");
    }
  });

  it("uses ASCII slugs, so a copied URL never percent-encodes", () => {
    for (const value of Object.values(routing.pathnames)) {
      const slugs = typeof value === "string" ? [value] : Object.values(value);
      for (const slug of slugs) {
        expect(slug, `${slug} is not ASCII`).toMatch(/^\/[a-z0-9-]*$/);
      }
    }
  });

  it("falls a locale with no pathnames entry for a route back to the canonical slug", () => {
    // en is deliberately absent from every entry above; getLocalizedTemplate is
    // `pathnameConfig[locale] || internalTemplate`, so this must resolve to the canonical key.
    expect(getPathname({ href: "/affordability", locale: "en" })).toBe("/en/affordability");
  });

  it.each([
    ["/affordability", "/abordabilite"],
    ["/closing-costs", "/frais-de-cloture"],
    ["/down-payment", "/mise-de-fonds"],
    ["/rrsp-hbp", "/reer-rap"],
    ["/amortization", "/amortissement"],
    ["/rent-vs-buy", "/louer-ou-acheter"],
    ["/scenarios", "/scenarios"],
    ["/sources", "/sources"],
  ] satisfies Array<[keyof typeof routing.pathnames, string]>)(
    "resolves %s to the French path /fr%s",
    (href, frSlug) => {
      expect(getPathname({ href, locale: "fr" })).toBe(`/fr${frSlug}`);
    },
  );
});
