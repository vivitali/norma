import { describe, expect, it } from "vitest";
import { ca } from "./rules/ca";
import { us } from "./rules/us";
import { getJurisdiction } from "./jurisdictions";
import {
  affordability,
  amortization,
  closingTotal,
  hbpPlay,
  rentVsBuy,
  scenario,
} from "./engine";

/**
 * The regression net for the country seam (docs/superpowers/specs/2026-08-29-us-market-design.md,
 * implementation order item 2). This file exists to make that step reviewable: it freezes a
 * handful of engine outputs, computed on FIXED inputs across three jurisdictions, before
 * `ca.ts` becomes `rules/ca.ts` and every engine function is retyped to take `CountryRulesBase`
 * or `CaRules` instead of importing the `federal` singleton implicitly. If the country seam ever
 * changes a computed figure, this file fails — and it must not, because the seam is supposed to be
 * a pure refactor, not a behaviour change.
 *
 * Three jurisdictions, deliberately: winnipeg (the default, no municipal transfer tax layer),
 * toronto (a municipal top-up plus an Ontario first-time-buyer rebate), and halifax (the
 * residency-gated 10% non-resident deed transfer tax, the largest single conditional charge in
 * the dataset). Between them they exercise `Applicability.residency`, `.elsewhere`,
 * rebate groups and the GST-rebate omission path.
 *
 * `toMatchSnapshot()` rather than hand-computed literals: the point is not to re-derive the
 * arithmetic by hand and risk transcribing it wrong, it is to pin down whatever this engine
 * outputs TODAY so a later change is forced to explain itself. Keep this file — and its snapshot
 * — through step 3 (rules/us.ts) as well; it is the regression net for that step too.
 */

const winnipeg = getJurisdiction("winnipeg")!;
const toronto = getJurisdiction("toronto")!;
const halifax = getJurisdiction("halifax")!;
const houston = getJurisdiction("houston")!;

describe("golden: closingTotal", () => {
  it.each([
    ["winnipeg", winnipeg, { ftb: true, ptype: "house" as const, residency: "resident" as const, elsewhere: false }],
    ["toronto", toronto, { ftb: true, ptype: "condo" as const, residency: "resident" as const, elsewhere: false }],
    ["halifax", halifax, { ftb: false, ptype: "house" as const, residency: "nonResident" as const, elsewhere: false }],
  ])("%s", (_name, j, shape) => {
    const result = closingTotal(j, ca, {
      price: 650000,
      dpPct: 10,
      amortYears: 25,
      ...shape,
    });
    expect(result).toMatchSnapshot();
  });
});

describe("golden: affordability", () => {
  it.each([
    ["winnipeg", winnipeg],
    ["toronto", toronto],
    ["halifax", halifax],
  ])("%s", (_name, j) => {
    const result = affordability(j, ca, {
      income1: 95000,
      income2: 45000,
      otherIncome: 0,
      haircut: 0,
      debts: 350,
      amortYears: 25,
      comfortCeiling: 3200,
      insuranceAnnual: 1400,
      utilities: 180,
      condoFee: 0,
      contractRate: 4.29,
      price: 650000,
      dpPct: 10,
      ftb: true,
      ptype: "house",
      elsewhere: false,
      residency: "resident",
      funds: 45000,
      save: 800,
    });
    expect(result).toMatchSnapshot();
  });
});

describe("golden: amortization", () => {
  it.each([
    ["winnipeg", winnipeg],
    ["toronto", toronto],
    ["halifax", halifax],
  ])("%s", (_name, _j) => {
    // amortization() takes no jurisdiction parameter (see engine.ts's own note on why).
    const result = amortization(ca, {
      price: 650000,
      dpPct: 10,
      amortYears: 25,
      contractRate: 4.29,
      renewalRate: 5.75,
      termYears: 5,
    });
    expect(result).toMatchSnapshot();
  });
});

describe("golden: hbpPlay", () => {
  it.each([
    ["winnipeg", "MB"],
    ["toronto", "ON"],
    ["halifax", "NS"],
  ])("%s", (_name, prov) => {
    const result = hbpPlay(ca, {
      contribution: 40000,
      income: 85000,
      prov,
      withdrawAmount: 35000,
    });
    expect(result).toMatchSnapshot();
  });
});

describe("golden: rentVsBuy", () => {
  it.each([
    ["winnipeg", winnipeg],
    ["toronto", toronto],
    ["halifax", halifax],
  ])("%s", (_name, j) => {
    const result = rentVsBuy(j, ca, {
      price: 650000,
      dpPct: 10,
      amortYears: 25,
      ftb: true,
      ptype: "house",
      elsewhere: false,
      residency: "resident",
      insuranceAnnual: 1400,
      utilities: 180,
      condoFee: 0,
      rent: 2200,
      rentInflation: 0.03,
      appreciation: 0.031,
      appreciationOn: true,
      investReturn: 0.046,
      termYears: 5,
      renewalRate: 5.75,
      investDiff: true,
      years: 10,
    });
    expect(result).toMatchSnapshot();
  });
});

describe("golden: scenario", () => {
  it.each([
    ["winnipeg", winnipeg],
    ["toronto", toronto],
    ["halifax", halifax],
  ])("%s", (_name, j) => {
    const result = scenario(j, ca, {
      price: 650000,
      dpPct: 10,
      amortYears: 25,
      ftb: true,
      ptype: "house",
      elsewhere: false,
      residency: "resident",
      insuranceAnnual: 1400,
      utilities: 180,
      condoFee: 0,
      comfortCeiling: 3200,
      qualIncome: 130000,
      debts: 350,
      funds: 45000,
      save: 800,
    });
    expect(result).toMatchSnapshot();
  });
});

/**
 * The regression net for step 3+4 of the US-market spec (rules/us.ts and Houston): the same
 * discipline as the Canadian section above, on the one US jurisdiction. `price: 350000` matches
 * the research dossier's own worked title-insurance example ($2,015 on a $350,000 policy — see
 * `jurisdictions/houston.test.ts`), so this snapshot and that unit test describe the same
 * purchase from two angles.
 */
describe("golden: US (houston)", () => {
  it("closingTotal", () => {
    const result = closingTotal(houston, us, {
      price: 350000,
      dpPct: 10,
      amortYears: 30,
      ftb: true,
      ptype: "house",
      elsewhere: false,
      residency: "resident",
    });
    expect(result).toMatchSnapshot();
  });

  it("affordability", () => {
    const result = affordability(houston, us, {
      income1: 95000,
      income2: 45000,
      otherIncome: 0,
      haircut: 0,
      debts: 350,
      amortYears: 30,
      comfortCeiling: 3200,
      insuranceAnnual: 3506,
      utilities: 180,
      condoFee: 0,
      contractRate: 6.66,
      price: 350000,
      dpPct: 10,
      ftb: true,
      ptype: "house",
      elsewhere: false,
      residency: "resident",
      funds: 45000,
      save: 800,
    });
    expect(result).toMatchSnapshot();
  });

  it("amortization — payment is constant to maturity, no renewal fields", () => {
    const result = amortization(us, {
      price: 350000,
      dpPct: 10,
      amortYears: 30,
      contractRate: 6.66,
      // Ignored on the toMaturity path — see amortizationToMaturity()'s own doc comment.
      renewalRate: 5.75,
      termYears: 5,
    });
    expect(result).toMatchSnapshot();
    const payments = new Set(result.rows.map((r) => r.payment));
    expect(payments.size).toBe(1);
    expect(result.rows.every((r) => !r.renewed)).toBe(true);
    expect(result.shock).toBe(0);
    expect(result.paymentAfterRenewal).toBe(result.firstPayment);
  });

  it("rentVsBuy", () => {
    const result = rentVsBuy(houston, us, {
      price: 350000,
      dpPct: 10,
      amortYears: 30,
      ftb: true,
      ptype: "house",
      elsewhere: false,
      residency: "resident",
      insuranceAnnual: 3506,
      utilities: 180,
      condoFee: 0,
      rent: 1573,
      rentInflation: 0.03,
      appreciation: 0.04,
      appreciationOn: true,
      investReturn: 0.046,
      // Ignored on the toMaturity path.
      termYears: 5,
      renewalRate: 5.75,
      investDiff: true,
      years: 10,
      taxableIncome: 95000,
    });
    expect(result).toMatchSnapshot();
  });

  it("scenario", () => {
    const result = scenario(houston, us, {
      price: 350000,
      dpPct: 10,
      amortYears: 30,
      ftb: true,
      ptype: "house",
      elsewhere: false,
      residency: "resident",
      insuranceAnnual: 3506,
      utilities: 180,
      condoFee: 0,
      comfortCeiling: 3200,
      qualIncome: 130000,
      debts: 350,
      funds: 45000,
      save: 800,
    });
    expect(result).toMatchSnapshot();
  });
});
