import { describe, expect, it } from "vitest";
import { jurisdictions, getJurisdiction } from "./index";

const VALID_PROVINCES = new Set([
  "ON", "QC", "BC", "AB", "MB", "SK", "NS", "NB", "PE", "NL", "YT", "NT", "NU",
]);

describe("jurisdictions", () => {
  it("has exactly 14 jurisdictions", () => {
    expect(jurisdictions).toHaveLength(14);
  });

  it("has unique ids", () => {
    const ids = jurisdictions.map((j) => j.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("has a valid province code on every jurisdiction", () => {
    for (const j of jurisdictions) {
      expect(VALID_PROVINCES.has(j.prov), `${j.id} has invalid province ${j.prov}`).toBe(true);
    }
  });

  it("has at least one transfer line item and a lawyer/notary fee on every jurisdiction", () => {
    for (const j of jurisdictions) {
      expect(j.transfer.length, `${j.id} has no transfer line items`).toBeGreaterThan(0);
      expect(
        j.fees.lawyer ?? j.fees.notary,
        `${j.id} has neither a lawyer nor notary fee`,
      ).toBeGreaterThan(0);
    }
  });

  it("has rent/yoy only on jurisdictions with cityData true", () => {
    for (const j of jurisdictions) {
      if (j.cityData) {
        expect(j.rent, `${j.id} is cityData but has no rent`).toBeGreaterThan(0);
      } else {
        expect(j.rent, `${j.id} is not cityData but has rent`).toBeUndefined();
      }
    }
  });

  it("looks up a known jurisdiction by id", () => {
    expect(getJurisdiction("winnipeg")?.prov).toBe("MB");
  });

  it("returns undefined for an unknown id", () => {
    expect(getJurisdiction("nope")).toBeUndefined();
  });

  // Trading a positional index for a string trades an off-by-one for a typo. This is the guard
  // that makes the string field safe: a misspelled `on` fails here instead of silently
  // dropping a rebate at runtime.
  it("targets every rebate at a transfer line that exists in its own jurisdiction", () => {
    for (const j of jurisdictions) {
      const lineKeys = new Set(j.transfer.map((l) => l.key));
      for (const rb of j.rebates) {
        expect(lineKeys, `${j.id} rebate ${rb.key}`).toContain(rb.on);
      }
    }
  });
});
