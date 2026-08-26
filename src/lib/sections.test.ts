import { describe, expect, it } from "vitest";
import {
  AFFORDABILITY_SECTIONS,
  allSectionsOpen,
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
  it("does not report everything open on a fresh page", () => {
    expect(allSectionsOpen(SECTION_IDS, {}, null)).toBe(false);
  });
  it("does not report everything open when the hash opened one", () => {
    expect(allSectionsOpen(SECTION_IDS, {}, "math")).toBe(false);
  });
  it("reports everything open only when nothing is left to expand", () => {
    // Keyed off ALL, not ANY. With one section open on arrival by design, an
    // any-test made the control read "Collapse all" on first paint — offering to
    // undo something the reader had not done.
    expect(allSectionsOpen(SECTION_IDS, setAllSections(SECTION_IDS, true), null)).toBe(true);
    expect(allSectionsOpen(SECTION_IDS, { approval: true }, null)).toBe(false);
  });
  it("opens and closes every section at once", () => {
    expect(Object.values(setAllSections(SECTION_IDS, true))).toEqual([true, true, true, true, true]);
    expect(allSectionsOpen(SECTION_IDS, setAllSections(SECTION_IDS, false), null)).toBe(false);
  });
  it("collapse all beats a hash that would otherwise open one", () => {
    expect(allSectionsOpen(SECTION_IDS, setAllSections(SECTION_IDS, false), "math")).toBe(false);
  });
  it("ignores sections belonging to another page", () => {
    // The map is keyed by bare id and ids are only unique WITHIN a page, so a
    // page must never ask about a list it does not own. Two pages both have a
    // "cash" section; expanding one must not report the other as open.
    expect(allSectionsOpen(["cash"], setAllSections(SECTION_IDS, false), null)).toBe(false);
  });
});

describe("the deciding section opens on arrival", () => {
  it("opens the named section and nothing else", () => {
    const open = (id: string) => isSectionOpen({ id, open: {}, hashTarget: null, defaultId: "approval" });
    expect(open("approval")).toBe(true);
    expect(SECTION_IDS.filter(open)).toEqual(["approval"]);
  });

  it("lets a hash win, so a link still lands where it points", () => {
    const at = (id: string) =>
      isSectionOpen({ id, open: {}, hashTarget: "math", defaultId: "approval" });
    expect(at("math")).toBe(true);
    expect(at("approval")).toBe(false);
  });

  it("lets the reader close it, and it stays closed", () => {
    expect(
      isSectionOpen({ id: "approval", open: { approval: false }, hashTarget: null, defaultId: "approval" }),
    ).toBe(false);
  });

  it("opens nothing when no section decided anything", () => {
    const open = (id: string) => isSectionOpen({ id, open: {}, hashTarget: null, defaultId: null });
    expect(SECTION_IDS.filter(open)).toEqual([]);
  });
});

describe("every section registry", () => {
  it("has unique ids within its own page", () => {
    for (const { namespace, sections } of SECTION_REGISTRIES) {
      const ids = sections.map((s) => s.id);
      expect(new Set(ids).size, namespace).toBe(ids.length);
    }
  });

  it("resolves every label key in EVERY locale", async () => {
    // A section whose label is missing in one locale renders the raw key to that
    // reader. Checking en alone would have let that ship on six new pages at once.
    const { CATALOGUES } = await import("@/test/catalogues");
    for (const [locale, messages] of Object.entries(CATALOGUES)) {
      const tree = messages as unknown as Record<string, Record<string, string>>;
      for (const { namespace, sections } of SECTION_REGISTRIES) {
        for (const section of sections) {
          expect(
            tree[namespace]?.[section.labelKey],
            `${locale} ${namespace}.${section.labelKey}`,
          ).toBeDefined();
        }
      }
    }
  });
});
