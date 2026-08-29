import { describe, expect, it } from "vitest";
import { defaultJurisdiction } from "@/domain/jurisdictions";
import {
  SHARED_INPUT_DEFAULTS,
  SHARED_INPUT_SCHEMA,
  TOOL_KEYS,
  TOOL_DEFAULTS,
  JURISDICTION_KEYS,
  JURISDICTION_DEFAULTS,
} from "./shared-inputs";

describe("shared input registry", () => {
  it("gives every registry key a default value", () => {
    // Assert against the union of every page's key tuple, not Object.keys(SHARED_INPUT_DEFAULTS)
    // — iterating the registry's own keys back against itself passes vacuously even against {}.
    const pageKeys = new Set<string>([...TOOL_KEYS, ...JURISDICTION_KEYS]);
    expect(pageKeys.size).toBeGreaterThan(0);
    for (const key of pageKeys) {
      expect(SHARED_INPUT_DEFAULTS, key).toHaveProperty(key);
      expect(SHARED_INPUT_DEFAULTS[key as keyof typeof SHARED_INPUT_DEFAULTS], key).toBeDefined();
    }
  });

  it("derives each page slice from the registry with no extra or missing keys", () => {
    expect(Object.keys(TOOL_DEFAULTS).sort()).toEqual([...TOOL_KEYS].sort());
    expect(Object.keys(JURISDICTION_DEFAULTS)).toEqual([...JURISDICTION_KEYS]);
  });

  // The point of the registry: a slice cannot hold a different default than the registry does,
  // so two pages can never disagree about what "default price" means.
  it("carries the registry's own value into every slice", () => {
    for (const key of TOOL_KEYS) {
      expect(TOOL_DEFAULTS[key], key).toBe(SHARED_INPUT_DEFAULTS[key]);
    }
  });

  it("takes the default jurisdiction from the domain layer rather than a second literal", () => {
    expect(JURISDICTION_DEFAULTS.jurId).toBe(defaultJurisdiction.id);
  });

  it("has no literal price or rate default — both derive", () => {
    // 450000 and 4.29 were the same figure for every user in every jurisdiction,
    // which is why federal.rates.insured/.uninsured went unread by any screen.
    expect(SHARED_INPUT_DEFAULTS.price).toBeNull();
    expect(SHARED_INPUT_DEFAULTS.contractRate).toBeNull();
  });

  it("keeps the non-derivable defaults explicit", () => {
    expect(SHARED_INPUT_DEFAULTS.dpPct).toBe(10);
    expect(SHARED_INPUT_DEFAULTS.amortYears).toBe(30);
    expect(SHARED_INPUT_DEFAULTS.ftb).toBe(true);
    expect(SHARED_INPUT_DEFAULTS.ptype).toBe("house");
    expect(SHARED_INPUT_DEFAULTS.elsewhere).toBe(false);
    expect(SHARED_INPUT_DEFAULTS.haircut).toBe(0);
    // The default a reader is charged at until they say otherwise, and the only safe one:
    // a resident's deed transfer tax is the smaller bill, so an unasked question can never
    // over-charge — it can only under-charge someone who then has the control to say so.
    expect(SHARED_INPUT_DEFAULTS.residency).toBe("resident");
  });

  it("keeps residency binary, because it means one thing", () => {
    // Nova Scotia's tax tests where you LIVE. Ontario's NRST and BC's additional property
    // transfer tax turn on citizenship or permanent residence, which is a different
    // question — widening this enum to carry both is an owner decision about the semantics,
    // not a refactor to be done on the way past. See CLAUDE.md's open items.
    expect(SHARED_INPUT_SCHEMA.residency).toEqual({
      kind: "enum",
      values: ["resident", "nonResident"],
    });
  });

  it("covers every registry key across the key tuples", () => {
    // A key added to SharedInputs and to no tuple is never persisted and never
    // read — silently dead state, which is how `haircut` and `elsewhere` ended
    // up with no control at all.
    //
    // Tuple coverage is necessary and NOT sufficient, and `residency` is the proof:
    // it was in TOOL_KEYS, in the schema, resolved and read by `applies()`, and no
    // component anywhere wrote it, so Halifax's 10% non-resident deed transfer tax
    // could never fire. What closes that hole is a control and a test over the
    // control — purchase-inputs.test.tsx — not another assertion in this file.
    const covered = new Set<string>([...JURISDICTION_KEYS, ...TOOL_KEYS]);
    expect(Object.keys(SHARED_INPUT_DEFAULTS).filter((k) => !covered.has(k))).toEqual([]);
  });

  it("has a schema entry for every key", () => {
    expect(Object.keys(SHARED_INPUT_SCHEMA).sort()).toEqual(
      Object.keys(SHARED_INPUT_DEFAULTS).sort(),
    );
  });
});
