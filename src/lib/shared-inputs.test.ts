import { describe, expect, it } from "vitest";
import { defaultJurisdiction } from "@/domain/jurisdictions";
import {
  SHARED_INPUT_DEFAULTS,
  AFFORDABILITY_KEYS,
  AFFORDABILITY_DEFAULTS,
  JURISDICTION_KEYS,
  JURISDICTION_DEFAULTS,
} from "./shared-inputs";

describe("shared input registry", () => {
  it("gives every registry key a default value", () => {
    for (const key of Object.keys(SHARED_INPUT_DEFAULTS)) {
      expect(SHARED_INPUT_DEFAULTS[key as keyof typeof SHARED_INPUT_DEFAULTS], key).toBeDefined();
    }
  });

  it("derives each page slice from the registry with no extra or missing keys", () => {
    expect(Object.keys(AFFORDABILITY_DEFAULTS).sort()).toEqual([...AFFORDABILITY_KEYS].sort());
    expect(Object.keys(JURISDICTION_DEFAULTS)).toEqual([...JURISDICTION_KEYS]);
  });

  // The point of the registry: a slice cannot hold a different default than the registry does,
  // so two pages can never disagree about what "default price" means.
  it("carries the registry's own value into every slice", () => {
    for (const key of AFFORDABILITY_KEYS) {
      expect(AFFORDABILITY_DEFAULTS[key], key).toBe(SHARED_INPUT_DEFAULTS[key]);
    }
  });

  it("takes the default jurisdiction from the domain layer rather than a second literal", () => {
    expect(JURISDICTION_DEFAULTS.jurId).toBe(defaultJurisdiction.id);
  });

  it("keeps the Phase 1 default values unchanged", () => {
    expect(SHARED_INPUT_DEFAULTS.price).toBe(450000);
    expect(SHARED_INPUT_DEFAULTS.dpPct).toBe(10);
    expect(SHARED_INPUT_DEFAULTS.contractRate).toBe(4.29);
    expect(SHARED_INPUT_DEFAULTS.comfortCeiling).toBe(2800);
    expect(SHARED_INPUT_DEFAULTS.ftb).toBe(true);
    expect(SHARED_INPUT_DEFAULTS.ptype).toBe("house");
    expect(SHARED_INPUT_DEFAULTS.elsewhere).toBe(false);
  });
});
