import { describe, expect, it } from "vitest";
import {
  AFFORDABILITY_SECTIONS,
  anySectionOpen,
  isSectionOpen,
  setAllSections,
  SECTION_IDS,
  SECTION_REGISTRIES,
} from "./sections";

describe("AFFORDABILITY_SECTIONS", () => {
  it("puts the three checks, the gap and the math in ONE list", () => {
    // The whole point of v2: four disclosure mechanisms become one, so the
    // derivation is reachable by the same gesture as a check.
    expect(SECTION_IDS).toEqual(["approval", "comfort", "cash", "gap", "math"]);
  });

  it("labels every section with a key from the page's own namespace", async () => {
    const messages = (await import("../../messages/en.json")).default.Affordability as Record<
      string,
      string
    >;
    for (const section of AFFORDABILITY_SECTIONS) {
      expect(messages[section.labelKey], section.id).toBeDefined();
    }
  });

  it("has unique ids, which are also the hash targets", () => {
    expect(new Set(SECTION_IDS).size).toBe(SECTION_IDS.length);
  });
});

describe("isSectionOpen", () => {
  it("starts closed", () => {
    expect(isSectionOpen({ id: "comfort", open: {}, hashTarget: null })).toBe(false);
  });
  it("opens when the reader opens it", () => {
    expect(isSectionOpen({ id: "comfort", open: { comfort: true }, hashTarget: null })).toBe(true);
  });
  it("opens when the hash names it", () => {
    expect(isSectionOpen({ id: "comfort", open: {}, hashTarget: "comfort" })).toBe(true);
  });
  it("ignores a hash naming something else", () => {
    expect(isSectionOpen({ id: "comfort", open: {}, hashTarget: "gap" })).toBe(false);
  });
  it("lets an explicit close win over the hash", () => {
    expect(isSectionOpen({ id: "comfort", open: { comfort: false }, hashTarget: "comfort" })).toBe(
      false,
    );
  });
});

describe("expand all", () => {
  it("reports nothing open on a fresh page", () => {
    expect(anySectionOpen(SECTION_IDS, {}, null)).toBe(false);
  });
  it("reports open when the hash alone opened one", () => {
    expect(anySectionOpen(SECTION_IDS, {}, "math")).toBe(true);
  });
  it("opens and closes every section at once", () => {
    expect(Object.values(setAllSections(SECTION_IDS, true))).toEqual([true, true, true, true, true]);
    expect(anySectionOpen(SECTION_IDS, setAllSections(SECTION_IDS, false), null)).toBe(false);
  });
  it("collapse all beats a hash that would otherwise open one", () => {
    expect(anySectionOpen(SECTION_IDS, setAllSections(SECTION_IDS, false), "math")).toBe(false);
  });
  it("ignores sections belonging to another page", () => {
    // The map is keyed by bare id and ids are only unique WITHIN a page, so a
    // page must never ask about a list it does not own. Two pages both have a
    // "cash" section; expanding one must not report the other as open.
    expect(anySectionOpen(["cash"], setAllSections(SECTION_IDS, false), null)).toBe(false);
  });
});

describe("every section registry", () => {
  it("has unique ids within its own page", () => {
    for (const { namespace, sections } of SECTION_REGISTRIES) {
      const ids = sections.map((s) => s.id);
      expect(new Set(ids).size, namespace).toBe(ids.length);
    }
  });

  it("resolves every label key in BOTH locales", async () => {
    // A section whose label is missing in French renders the raw key to a French
    // reader. Checking en alone would have let that ship on six new pages at once.
    const en = (await import("../../messages/en.json")).default as unknown as Record<string, Record<string, string>>;
    const fr = (await import("../../messages/fr.json")).default as unknown as Record<string, Record<string, string>>;
    for (const { namespace, sections } of SECTION_REGISTRIES) {
      for (const section of sections) {
        expect(en[namespace]?.[section.labelKey], `en ${namespace}.${section.labelKey}`).toBeDefined();
        expect(fr[namespace]?.[section.labelKey], `fr ${namespace}.${section.labelKey}`).toBeDefined();
      }
    }
  });
});
