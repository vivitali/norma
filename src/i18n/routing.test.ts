import { describe, expect, it } from "vitest";
import { getPathname } from "@/i18n/navigation";
import { allLocales, localePrefixes } from "./countries";
import { routing } from "./routing";

describe("routing", () => {
  it("supports four Canadian locales with en-CA as default", () => {
    expect(routing.locales).toEqual(["en-CA", "fr-CA", "uk-CA", "es-CA"]);
    expect(routing.defaultLocale).toBe("en-CA");
  });

  it("derives its locale list from the country registry, not a literal array", () => {
    expect(routing.locales).toEqual(allLocales());
  });

  it("mounts each locale at its country-qualified prefix", () => {
    expect(routing.localePrefix).toEqual({
      mode: "always",
      prefixes: localePrefixes(),
    });
    expect(localePrefixes()).toEqual({
      "en-CA": "/ca/en",
      "fr-CA": "/ca/fr",
      "uk-CA": "/ca/uk",
      "es-CA": "/ca/es",
    });
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
      expect(value, `${key} has no localized map`).toHaveProperty("fr-CA");
    }
  });

  it("gives every non-root route a Spanish slug, except the one with nothing to translate", () => {
    // /rrsp-hbp keeps the English acronyms: RRSP and HBP are the names on the reader's
    // own Canadian bank and tax paperwork, so a Spanish slug would name nothing.
    for (const [key, value] of Object.entries(routing.pathnames)) {
      if (key === "/" || key === "/rrsp-hbp") continue;
      expect(value, `${key} has no Spanish slug`).toHaveProperty("es-CA");
    }
    expect(routing.pathnames["/rrsp-hbp"]).not.toHaveProperty("es-CA");
  });

  it("gives Ukrainian no slugs at all, so every route falls back to the English one", () => {
    // Deliberate, and the reason is the ASCII rule below: there is no ASCII spelling of
    // a Ukrainian word, only a transliteration nobody searches for or reads. Delete this
    // test when Cyrillic slugs earn their percent-encoding — do not quietly add one slug.
    for (const value of Object.values(routing.pathnames)) {
      if (typeof value === "string") continue;
      expect(value).not.toHaveProperty("uk-CA");
    }
    expect(getPathname({ href: "/affordability", locale: "uk-CA" })).toBe(
      "/ca/uk/affordability",
    );
  });

  it("omits en-CA, because a missing locale falls back to the canonical key", () => {
    // Verified in next-intl 4.13.7: getLocalizedTemplate is
    //   pathnameConfig[locale] || internalTemplate
    // Writing en-CA explicitly would be redundant and would drift when a key is renamed.
    for (const value of Object.values(routing.pathnames)) {
      if (typeof value === "string") continue;
      expect(value).not.toHaveProperty("en-CA");
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
    // en-CA is deliberately absent from every entry above; getLocalizedTemplate is
    // `pathnameConfig[locale] || internalTemplate`, so this must resolve to the canonical key.
    expect(getPathname({ href: "/affordability", locale: "en-CA" })).toBe(
      "/ca/en/affordability",
    );
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
    "resolves %s to the Spanish path /ca/es%s",
    (href, esSlug) => {
      expect(getPathname({ href, locale: "es-CA" })).toBe(`/ca/es${esSlug}`);
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
    "resolves %s to the French path /ca/fr%s",
    (href, frSlug) => {
      expect(getPathname({ href, locale: "fr-CA" })).toBe(`/ca/fr${frSlug}`);
    },
  );
});

describe("two-segment locale prefixes", () => {
  // The load-bearing check for Decision 1 of the US-market spec: next-intl's
  // `localePrefix.prefixes` accepts an arbitrary string per locale, and a prefix
  // spanning two URL segments ("/ca/en") works identically to a one-segment prefix
  // in both directions next-intl exposes — middleware rewriting, and `Link`/
  // `getPathname` resolving a route to its localized URL and back.
  it("getPathname produces a two-segment prefix for every route shape", () => {
    expect(getPathname({ href: "/", locale: "en-CA" })).toBe("/ca/en");
    expect(getPathname({ href: "/", locale: "fr-CA" })).toBe("/ca/fr");
    expect(getPathname({ href: "/sources", locale: "uk-CA" })).toBe("/ca/uk/sources");
  });
});
