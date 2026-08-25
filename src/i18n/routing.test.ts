import { describe, expect, it } from "vitest";
import { getPathname } from "@/i18n/navigation";
import { routing } from "./routing";

describe("routing", () => {
  it("supports four locales with English as default", () => {
    expect(routing.locales).toEqual(["en", "fr", "uk", "es"]);
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
      "/rent-vs-buy",
      "/rrsp-hbp",
      "/scenarios",
      "/sources",
    ]);
  });

  it("gives every non-root route a French slug", () => {
    for (const [key, value] of Object.entries(routing.pathnames)) {
      if (key === "/") continue;
      expect(value, `${key} has no localized map`).toHaveProperty("fr");
    }
  });

  it("gives every non-root route a Spanish slug, except the one with nothing to translate", () => {
    // /rrsp-hbp keeps the English acronyms: RRSP and HBP are the names on the reader's
    // own Canadian bank and tax paperwork, so a Spanish slug would name nothing.
    for (const [key, value] of Object.entries(routing.pathnames)) {
      if (key === "/" || key === "/rrsp-hbp") continue;
      expect(value, `${key} has no Spanish slug`).toHaveProperty("es");
    }
    expect(routing.pathnames["/rrsp-hbp"]).not.toHaveProperty("es");
  });

  it("gives Ukrainian no slugs at all, so every route falls back to the English one", () => {
    // Deliberate, and the reason is the ASCII rule below: there is no ASCII spelling of
    // a Ukrainian word, only a transliteration nobody searches for or reads. Delete this
    // test when Cyrillic slugs earn their percent-encoding — do not quietly add one slug.
    for (const value of Object.values(routing.pathnames)) {
      if (typeof value === "string") continue;
      expect(value).not.toHaveProperty("uk");
    }
    expect(getPathname({ href: "/affordability", locale: "uk" })).toBe("/uk/affordability");
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
    ["/affordability", "/capacidad-de-compra"],
    ["/closing-costs", "/gastos-de-cierre"],
    ["/down-payment", "/pago-inicial"],
    ["/rrsp-hbp", "/rrsp-hbp"],
    ["/amortization", "/amortizacion"],
    ["/rent-vs-buy", "/alquilar-o-comprar"],
    ["/scenarios", "/escenarios"],
    ["/sources", "/fuentes"],
  ] satisfies Array<[keyof typeof routing.pathnames, string]>)(
    "resolves %s to the Spanish path /es%s",
    (href, esSlug) => {
      expect(getPathname({ href, locale: "es" })).toBe(`/es${esSlug}`);
    },
  );

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
