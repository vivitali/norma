import { describe, expect, it } from "vitest";
import {
  AFFORDABILITY_SECTIONS,
  anySectionOpen,
  isSectionOpen,
  setAllSections,
  SECTION_IDS,
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
    expect(anySectionOpen({}, null)).toBe(false);
  });
  it("reports open when the hash alone opened one", () => {
    expect(anySectionOpen({}, "math")).toBe(true);
  });
  it("opens and closes every section at once", () => {
    expect(Object.values(setAllSections(true))).toEqual([true, true, true, true, true]);
    expect(anySectionOpen(setAllSections(false), null)).toBe(false);
  });
  it("collapse all beats a hash that would otherwise open one", () => {
    expect(anySectionOpen(setAllSections(false), "math")).toBe(false);
  });
});
