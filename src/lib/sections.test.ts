import { describe, expect, it } from "vitest";
import {
  AFFORDABILITY_SECTIONS,
  isDisclosureOpen,
  visibleSections,
  type DisclosureDef,
} from "./sections";

describe("visibleSections", () => {
  it("hides the math section below depth 2", () => {
    // Depth sets PRESENCE for math: below 'the math' the section is not rendered
    // and does not appear in the jump rail.
    for (const depth of [0, 1] as const) {
      expect(visibleSections(AFFORDABILITY_SECTIONS, depth).map((s) => s.id)).toEqual([
        "verdict",
        "checks",
        "gap",
        "inputs",
      ]);
    }
  });
  it("shows the math section at depth 2", () => {
    expect(visibleSections(AFFORDABILITY_SECTIONS, 2).map((s) => s.id)).toEqual([
      "verdict",
      "checks",
      "gap",
      "inputs",
      "math",
    ]);
  });
});

describe("isDisclosureOpen", () => {
  const def: DisclosureDef = { id: "check-comfort", labelKey: "ckComfort", openAtDepth: 1 };
  const never: DisclosureDef = { id: "adv-income", labelKey: "cAdvanced", openAtDepth: null };

  it("is closed at 'the answer' by default", () => {
    expect(isDisclosureOpen({ def, depth: 0, hashTarget: null, override: undefined })).toBe(false);
  });
  it("opens at or above its floor depth", () => {
    expect(isDisclosureOpen({ def, depth: 1, hashTarget: null, override: undefined })).toBe(true);
    expect(isDisclosureOpen({ def, depth: 2, hashTarget: null, override: undefined })).toBe(true);
  });
  it("never auto-opens when openAtDepth is null", () => {
    expect(isDisclosureOpen({ def: never, depth: 2, hashTarget: null, override: undefined })).toBe(
      false,
    );
  });
  it("opens when the hash names it, at any depth", () => {
    expect(isDisclosureOpen({ def, depth: 0, hashTarget: "check-comfort", override: undefined })).toBe(
      true,
    );
    expect(
      isDisclosureOpen({ def: never, depth: 0, hashTarget: "adv-income", override: undefined }),
    ).toBe(true);
  });
  it("ignores a hash naming something else", () => {
    expect(isDisclosureOpen({ def, depth: 0, hashTarget: "check-cash", override: undefined })).toBe(
      false,
    );
  });
  it("lets an explicit open win at the lowest depth", () => {
    expect(isDisclosureOpen({ def, depth: 0, hashTarget: null, override: true })).toBe(true);
  });
  it("lets an explicit CLOSE win at the highest depth", () => {
    // The reference's own defect: `open = openCheck === key || depth >= 1` pins
    // every check open at depth >= 1 and makes its toggle inoperative. The
    // override is two-way here, deliberately.
    expect(isDisclosureOpen({ def, depth: 2, hashTarget: null, override: false })).toBe(false);
  });
  it("lets an explicit close win over the hash", () => {
    expect(isDisclosureOpen({ def, depth: 0, hashTarget: "check-comfort", override: false })).toBe(
      false,
    );
  });
});

describe("AFFORDABILITY_SECTIONS", () => {
  it("has globally unique ids across sections and disclosures", () => {
    // The ids are URL hash targets and test handles; a collision silently makes
    // one of them unreachable.
    const ids = AFFORDABILITY_SECTIONS.flatMap((s) => [
      s.id,
      ...(s.disclosures ?? []).map((d) => d.id),
    ]);
    expect(new Set(ids).size).toBe(ids.length);
  });
  it("opens the three checks at 'why'", () => {
    const checks = AFFORDABILITY_SECTIONS.find((s) => s.id === "checks");
    expect(checks?.disclosures?.map((d) => [d.id, d.openAtDepth])).toEqual([
      ["check-approval", 1],
      ["check-comfort", 1],
      ["check-cash", 1],
    ]);
  });
  it("never auto-opens the advanced disclosures", () => {
    const inputs = AFFORDABILITY_SECTIONS.find((s) => s.id === "inputs");
    expect(inputs?.disclosures?.every((d) => d.openAtDepth === null)).toBe(true);
  });
});
