import { describe, expect, it } from "vitest";
import { SITE_NAME } from "./seo";
import { CATALOGUES } from "@/test/catalogues";

const LOCALES = CATALOGUES;
const PAGES = [
  "home",
  "affordability",
  "closingCosts",
  "downPayment",
  "rrspHbp",
  "amortization",
  "rentVsBuy",
  "scenarios",
  "sources",
  "privacy",
  "terms",
  "notFound",
] as const;

/**
 * Google truncates titles near 60 characters and descriptions near 155.
 * Every locale is checked, not just the source one, because the translations are the
 * ones that break it: French runs 15-20% longer than English for the same sentence,
 * Spanish similarly, and Ukrainian's declensions lengthen the words themselves.
 */
describe("metadata copy", () => {
  for (const [locale, messages] of Object.entries(LOCALES)) {
    for (const page of PAGES) {
      const entry = (
        messages as unknown as Record<string, Record<string, Record<string, string>>>
      ).Metadata[page];

      it(`${locale}/${page} has a title within 60 characters`, () => {
        expect(entry?.title).toBeTruthy();
        expect(entry.title.length).toBeLessThanOrEqual(60);
      });

      it(`${locale}/${page} has a description within 155 characters`, () => {
        expect(entry?.description).toBeTruthy();
        expect(entry.description.length).toBeLessThanOrEqual(155);
      });
    }
  }

  it("does not imply adoption anywhere in metadata copy", () => {
    // PRODUCT.md: no users, no traffic, no testimonials, no press, no revenue.
    // Copy must not fabricate any of them.
    const banned = /trusted by|thousands|join \d|millions|#1|award/i;
    for (const messages of Object.values(LOCALES)) {
      const json = JSON.stringify(
        (messages as unknown as Record<string, unknown>).Metadata,
      );
      expect(json).not.toMatch(banned);
    }
  });
});

describe("brand", () => {
  it("uses the product name in the header, in every locale", () => {
    for (const messages of Object.values(LOCALES)) {
      expect(
        (messages as unknown as Record<string, Record<string, string>>).AppHeader.brand,
      ).toBe(SITE_NAME);
    }
  });
});
