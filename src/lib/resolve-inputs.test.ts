import { describe, expect, it } from "vitest";
import { federal } from "@/domain/federal";
import { getJurisdiction } from "@/domain/jurisdictions";
import { AFFORDABILITY_DEFAULTS } from "./shared-inputs";
import { DEFAULT_COMFORT_CEILING, isPersonalised, resolveInputs } from "./resolve-inputs";

const winnipeg = getJurisdiction("winnipeg")!;
const vancouver = getJurisdiction("vancouver")!;
const untouched = AFFORDABILITY_DEFAULTS;

describe("resolveInputs", () => {
  it("derives price from the city benchmark for the chosen property type", () => {
    // A Winnipeg user and a Vancouver user must not both start at $450,000.
    expect(resolveInputs(untouched, winnipeg, federal).price).toBe(winnipeg.bench.house);
    expect(resolveInputs(untouched, vancouver, federal).price).toBe(vancouver.bench.house);
    expect(winnipeg.bench.house).not.toBe(vancouver.bench.house);
  });

  it("follows the property type", () => {
    const condo = { ...untouched, ptype: "condo" as const };
    expect(resolveInputs(condo, winnipeg, federal).price).toBe(winnipeg.bench.condo);
  });

  it("keeps an edited price across a jurisdiction change", () => {
    const edited = { ...untouched, price: 512345 };
    expect(resolveInputs(edited, winnipeg, federal).price).toBe(512345);
    expect(resolveInputs(edited, vancouver, federal).price).toBe(512345);
  });

  it("derives the contract rate from the down payment", () => {
    expect(resolveInputs({ ...untouched, dpPct: 10 }, winnipeg, federal).contractRate).toBeCloseTo(
      federal.rates.insured * 100,
      10,
    );
    expect(resolveInputs({ ...untouched, dpPct: 20 }, winnipeg, federal).contractRate).toBeCloseTo(
      federal.rates.uninsured * 100,
      10,
    );
  });

  it("keeps an overridden contract rate across the 20% boundary", () => {
    const over = { ...untouched, contractRate: 5.75 };
    expect(resolveInputs({ ...over, dpPct: 10 }, winnipeg, federal).contractRate).toBe(5.75);
    expect(resolveInputs({ ...over, dpPct: 20 }, winnipeg, federal).contractRate).toBe(5.75);
  });

  it("sums the four named debts", () => {
    const r = resolveInputs(
      { ...untouched, car: 550, student: 200, cc: 75, otherDebt: 0 },
      winnipeg,
      federal,
    );
    expect(r.debts).toBe(825);
  });

  it("treats untouched debts as zero, not as an assumed payment", () => {
    expect(resolveInputs(untouched, winnipeg, federal).debts).toBe(0);
  });

  it("treats an absent second applicant as absent, not as one earning nothing", () => {
    // The accepted ruling: a co-buyer is not assumed. Defaulting income2 to a
    // real figure roughly doubles every new visitor's headline number from a
    // fact they never gave.
    expect(resolveInputs(untouched, winnipeg, federal).income2).toBe(0);
    expect(resolveInputs({ ...untouched, income2: 45000 }, winnipeg, federal).income2).toBe(45000);
  });

  it("derives condoFee to 0 even for a condo", () => {
    // We have no strata-fee data. Inventing one would be a rule with no source;
    // the comfort check asks for it inline instead.
    const condo = { ...untouched, ptype: "condo" as const };
    expect(resolveInputs(condo, winnipeg, federal).condoFee).toBe(0);
  });

  it("leaves funds and save null — there is nothing honest to assume", () => {
    const r = resolveInputs(untouched, winnipeg, federal);
    expect(r.funds).toBeNull();
    expect(r.save).toBeNull();
  });

  it("passes an answered funds figure through", () => {
    expect(resolveInputs({ ...untouched, funds: 50000 }, winnipeg, federal).funds).toBe(50000);
  });

  it("resolves the comfort ceiling to the named constant", () => {
    expect(resolveInputs(untouched, winnipeg, federal).comfortCeiling).toBe(DEFAULT_COMFORT_CEILING);
  });

  it("resolves a blanked field back to its derived default", () => {
    // Blanking is how a user says "go back to what you had". Empty commits null
    // from NumberField, and null re-derives here.
    const edited = { ...untouched, price: 999999 };
    expect(resolveInputs({ ...edited, price: null }, winnipeg, federal).price).toBe(
      winnipeg.bench.house,
    );
  });

  it("produces no nulls except the two unknowns", () => {
    const r = resolveInputs(untouched, winnipeg, federal);
    const nulls = Object.entries(r)
      .filter(([, v]) => v === null)
      .map(([k]) => k);
    expect(nulls.sort()).toEqual(["funds", "save"]);
  });
});

describe("isPersonalised", () => {
  it("is false on an untouched form", () => {
    expect(isPersonalised(untouched)).toBe(false);
  });
  it("is true once income is given", () => {
    expect(isPersonalised({ ...untouched, income1: 92000 })).toBe(true);
  });
  it("is true once a second applicant is added", () => {
    expect(isPersonalised({ ...untouched, income2: 45000 })).toBe(true);
  });
  it("is true once any of the four debts is given", () => {
    for (const key of ["car", "student", "cc", "otherDebt"] as const) {
      expect(isPersonalised({ ...untouched, [key]: 100 })).toBe(true);
    }
  });
  it("is true once funds are given", () => {
    expect(isPersonalised({ ...untouched, funds: 30000 })).toBe(true);
  });
  it("is true once the monthly ceiling is stated", () => {
    // The user's own limit, and the single input driving the headline figure.
    expect(isPersonalised({ ...untouched, comfortCeiling: 3100 })).toBe(true);
  });
  it("is false for a price change alone", () => {
    // Price is the target being tested, not the household's situation.
    expect(isPersonalised({ ...untouched, price: 600000 })).toBe(false);
  });
});
