import { describe, expect, it } from "vitest";
import { affordability } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { getJurisdiction } from "@/domain/jurisdictions";
import { resolveInputs } from "@/lib/resolve-inputs";
import { AFFORDABILITY_DEFAULTS } from "@/lib/shared-inputs";
import { DELIBERATELY_UNRENDERED, RENDERED } from "./rendered-keys";

describe("engine-output coverage", () => {
  it("classifies exactly the fields affordability() returns", () => {
    // The typecheck catches an unclassified NEW field; this catches a
    // classified field that no longer exists.
    const j = getJurisdiction("winnipeg")!;
    const result = affordability(j, federal, resolveInputs(AFFORDABILITY_DEFAULTS, j, federal));
    const classified = [...RENDERED, ...DELIBERATELY_UNRENDERED].sort();
    expect(classified).toEqual(Object.keys(result).sort());
  });

  it("classifies each key exactly once", () => {
    const all = [...RENDERED, ...DELIBERATELY_UNRENDERED];
    expect(new Set(all).size).toBe(all.length);
  });
});
