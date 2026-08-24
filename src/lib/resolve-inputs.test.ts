import { describe, expect, it } from "vitest";
import { defaultContractRate, minDown } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { getJurisdiction } from "@/domain/jurisdictions";
import { TOOL_DEFAULTS } from "./shared-inputs";
import {
  anySourceGiven,
  DEFAULT_COMFORT_CEILING,
  DEFAULT_RENT,
  isPersonalised,
  resolveInputs,
} from "./resolve-inputs";

const winnipeg = getJurisdiction("winnipeg")!;
const vancouver = getJurisdiction("vancouver")!;
const untouched = TOOL_DEFAULTS;

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

  it("produces no nulls except the unknowns and the one absent-by-meaning field", () => {
    const r = resolveInputs(untouched, winnipeg, federal);
    const nulls = Object.entries(r)
      .filter(([, v]) => v === null)
      .map(([k]) => k);
    // funds and save are UNKNOWNS: nothing honest to assume. renewalRate is a
    // third thing again -- null there means "no renewal shock modelled", which
    // is a modelling choice, not a missing answer, and resolving it to a number
    // would silently assert a rate the reader never predicted.
    expect(nulls.sort()).toEqual(["funds", "renewalRate", "save"]);
  });

  it("resolves every down-payment source to a number, and remembers that none was given", () => {
    // The two facts drive different screens. Zero is right for the arithmetic;
    // reporting a shortfall on a first visit and blaming the reader is not.
    const r = resolveInputs(untouched, winnipeg, federal);
    expect([r.fhsa, r.cashSav, r.rrsp, r.tfsa, r.gift, r.nonreg]).toEqual([0, 0, 0, 0, 0, 0]);
    expect(anySourceGiven(untouched)).toBe(false);
    expect(anySourceGiven({ ...untouched, tfsa: 12000 })).toBe(true);
  });

  it("takes taxable income from the household income already given", () => {
    const r = resolveInputs({ ...untouched, income1: 80000, income2: 40000 }, winnipeg, federal);
    expect(r.taxIncome).toBe(120000);
  });

  it("takes benchmark rent from the jurisdiction, not a universal constant", () => {
    const r = resolveInputs(untouched, winnipeg, federal);
    expect(r.rent).toBe(winnipeg.rent ?? DEFAULT_RENT);
  });

  it("converts rent inflation from the stored percentage to the fraction the engine takes", () => {
    const r = resolveInputs({ ...untouched, rentInflation: 3 }, winnipeg, federal);
    expect(r.rentInflation).toBeCloseTo(0.03, 10);
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

describe("isPersonalised — every page's own inputs count", () => {
  // The predicate was written for Affordability and drives the typical/yours
  // badge on all nine pages. A reader who filled in six account balances on Down
  // Payment, or a contribution and a withdrawal on RRSP-HBP, was still told the
  // answer above them was "typical".
  const CASES: [string, Partial<typeof untouched>][] = [
    ["a down-payment source", { tfsa: 30000 }],
    ["every down-payment source", { fhsa: 1, cashSav: 1, rrsp: 1, tfsa: 1, gift: 1, nonreg: 1 }],
    ["an HBP contribution", { hbpContribution: 40000 }],
    ["an HBP withdrawal", { hbpWithdraw: 40000 }],
    ["taxable income", { taxIncome: 120000 }],
    ["the rent being compared against", { rent: 2400 }],
    ["a monthly saving rate", { save: 800 }],
  ];
  for (const [what, patch] of CASES) {
    it(`is true once the reader gives ${what}`, () => {
      expect(isPersonalised({ ...untouched, ...patch })).toBe(true);
    });
  }

  it("stays false for the question being asked, not the household asking it", () => {
    // dpPct, amortization, property type and the rent-vs-buy assumptions all have
    // non-null defaults. Counting them would pin the badge to "yours" forever.
    expect(
      isPersonalised({ ...untouched, dpPct: 25, amortYears: 25, ptype: "condo", holding: 25 }),
    ).toBe(false);
  });
});

describe("the legal minimum down payment", () => {
  it("raises a request below the floor, and says it did", () => {
    // 5% is legal below $500,000 and not above it. A page that amortized 5% on a
    // $1.6M house would be quoting a mortgage no lender in Canada may write.
    const r = resolveInputs({ ...untouched, price: 1600000, dpPct: 5 }, winnipeg, federal);
    expect(r.belowMinimum).toBe(true);
    expect(r.dpPctRequested).toBe(5);
    expect(r.dpPct).toBeGreaterThan(5);
    expect((r.price * r.dpPct) / 100).toBeCloseTo(minDown(1600000), 4);
  });

  it("leaves a legal request exactly alone", () => {
    const r = resolveInputs({ ...untouched, price: 400000, dpPct: 5 }, winnipeg, federal);
    expect(r.belowMinimum).toBe(false);
    expect(r.dpPct).toBe(5);
  });

  it("prices the contract rate off the MODELLED percentage, not the requested one", () => {
    // Being raised to 20% removes the insurance premium, which is exactly when
    // the rate offered changes. Deriving it from the request would quote an
    // insured rate on an uninsured mortgage.
    const raised = resolveInputs({ ...untouched, price: 3000000, dpPct: 5 }, winnipeg, federal);
    expect(raised.dpPct).toBeCloseTo(20, 6);
    expect(raised.contractRate).toBeCloseTo(defaultContractRate(federal, 20), 10);
  });
});
