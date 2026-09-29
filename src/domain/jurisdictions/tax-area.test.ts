import { describe, expect, it } from "vitest";
import type { Jurisdiction } from "../types";
import { propertyTaxAnnual, propertyTaxCredit } from "../engine";
import { winnipeg } from "./winnipeg";
import { withTaxArea } from "./index";

/**
 * Synthetic areas on a copy of a real record, so the mechanism is tested independently of
 * whichever figures the live record carries.
 */
const base: Jurisdiction = {
  ...winnipeg,
  propTax: {
    effective: 0.01,
    publishedRate: 0.02,
    assessmentRatio: 0.5,
    basis: "portioned",
    credit: { kind: "cappedAgainstSlice", amount: 1000, appliesToRate: 0.004 },
    areas: {
      default: "a",
      list: [
        { id: "a", publishedRate: 0.02, effective: 0.01, schoolEffective: 0.004 },
        { id: "b", publishedRate: 0.03, effective: 0.015, schoolEffective: 0.002 },
      ],
    },
  },
  provenance: {
    ...winnipeg.provenance,
    "propTax.areas.list.1.publishedRate": { conf: "high", src: "Area B's own rate", asOf: "2026" },
  },
};

describe("withTaxArea", () => {
  it("returns the record itself for the default, an unknown or no area", () => {
    expect(withTaxArea(base, "a")).toBe(base);
    expect(withTaxArea(base, null)).toBe(base);
    expect(withTaxArea(base, "nope")).toBe(base);
  });

  it("swaps in the area's rates, its credit slice and its provenance", () => {
    const b = withTaxArea(base, "b");
    expect(b.propTax.effective).toBe(0.015);
    expect(b.propTax.publishedRate).toBe(0.03);
    expect(b.propTax.credit?.appliesToRate).toBe(0.002);
    expect(b.provenance["propTax.publishedRate"]?.src).toBe("Area B's own rate");
    // The record it came from is untouched.
    expect(base.propTax.effective).toBe(0.01);
  });
});

describe("a capped bill credit", () => {
  it("takes the lesser of its amount and the capped slice", () => {
    // Cap binds: 400,000 × 0.004 = 1,600 > 1,000.
    expect(propertyTaxAnnual(base, 400_000)).toBeCloseTo(400_000 * 0.01 - 1000, 6);
    // Slice binds: 100,000 × 0.004 = 400 < 1,000.
    expect(propertyTaxAnnual(base, 100_000)).toBeCloseTo(100_000 * 0.01 - 400, 6);
  });

  it("follows the chosen area's slice", () => {
    const b = withTaxArea(base, "b");
    // 200,000 × 0.002 = 400 < 1,000, so area B's smaller school slice caps the credit.
    expect(propertyTaxAnnual(b, 200_000)).toBeCloseTo(200_000 * 0.015 - 400, 6);
  });

  it("enters the closed-form ceiling solve at its full amount", () => {
    expect(propertyTaxCredit(base)).toBe(1000);
  });

  it("never makes a tax bill negative", () => {
    expect(propertyTaxAnnual(base, 0)).toBe(0);
  });
});

describe("Winnipeg's school divisions", () => {
  const areas = winnipeg.propTax.areas!;

  it("lists the eight divisions the City levies for, with the default first-class", () => {
    expect(areas.list).toHaveLength(8);
    expect(areas.default).toBe("winnipeg-sd");
    expect(areas.list.map((a) => a.id)).toContain("pembina-trails");
  });

  it("keeps the record's own rates equal to its default division's", () => {
    const def = areas.list.find((a) => a.id === areas.default)!;
    expect(def.publishedRate).toBeCloseTo(winnipeg.propTax.publishedRate, 9);
    expect(def.effective).toBeCloseTo(winnipeg.propTax.effective, 9);
  });

  it("derives every division's effective rate from its published rate and the 45% portion", () => {
    for (const a of areas.list) {
      expect(a.effective, a.id).toBeCloseTo(a.publishedRate * winnipeg.propTax.assessmentRatio, 12);
      expect(a.schoolEffective, a.id).toBeLessThan(a.effective);
    }
  });

  it("matches the City's 2026 published combined rates at the ends of the range", () => {
    const rate = (id: string) => areas.list.find((a) => a.id === id)!.publishedRate;
    expect(rate("pembina-trails")).toBeCloseTo(0.025223, 9);
    expect(rate("seven-oaks")).toBeCloseTo(0.02953, 9);
  });

  it("carries a dated, high-confidence source for every division", () => {
    for (const [i, a] of areas.list.entries()) {
      const prov = winnipeg.provenance[`propTax.areas.list.${i}.publishedRate`];
      expect(prov?.conf, a.id).toBe("high");
      expect(prov?.asOf, a.id).toBe("2026");
    }
  });
});
