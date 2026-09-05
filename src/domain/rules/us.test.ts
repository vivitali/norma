import { describe, expect, it } from "vitest";
import { ca } from "./ca";
import { us } from "./us";
import { getJurisdiction } from "../jurisdictions";
import {
  affordability,
  amortization,
  financing,
  marginalRate,
  rentVsBuy,
  taxOnBand,
} from "../engine";

const houston = getJurisdiction("houston")!;

describe("us rules data", () => {
  it("carries a toMaturity mortgage that never renews", () => {
    expect(us.mortgage).toEqual({ kind: "toMaturity", renews: false });
  });

  it("has no B-20-style stress test", () => {
    expect(us.stressTest).toBeNull();
  });

  it("has DTI (gds/tds) shaped like the Canadian ratios — front-end stricter than back-end", () => {
    expect(us.gds).toBeLessThan(us.tds);
    expect(us.gds).toBe(28);
    expect(us.tds).toBe(36);
  });

  it("has the FTB conventional down payment below the standard one", () => {
    expect(us.programs.conventional.minDownFtb).toBeLessThan(us.programs.conventional.minDown);
    expect(us.programs.conventional.minDownFtb).toBeCloseTo(0.03, 6);
    expect(us.programs.conventional.minDown).toBeCloseTo(0.05, 6);
  });

  it("has PMI's request-cancellation LTV above its automatic-termination LTV", () => {
    // A borrower may REQUEST cancellation at 80% of original value; the servicer MUST
    // automatically terminate at 78% regardless of request (Homeowners Protection Act).
    expect(us.programs.conventional.pmi.cancelRequestLtv).toBeGreaterThan(
      us.programs.conventional.pmi.autoTerminateLtv,
    );
    expect(us.programs.conventional.pmi.cancelRequestLtv).toBeCloseTo(0.8, 6);
    expect(us.programs.conventional.pmi.autoTerminateLtv).toBeCloseTo(0.78, 6);
  });

  it("uses one contract rate regardless of LTV — no CMHC-style insured/uninsured spread", () => {
    expect(us.rates.insured).toBe(us.rates.uninsured);
  });

  it("has a §121 exclusion with joint above single", () => {
    expect(us.sec121.joint).toBeGreaterThan(us.sec121.single);
    expect(us.sec121.single).toBe(250000);
    expect(us.sec121.joint).toBe(500000);
  });

  it("taxes a realised capital gain at a flat rate, not an inclusion fraction", () => {
    expect(us.gains.kind).toBe("flat");
  });

  it("has the FEDERAL marginal table under the state key, with no state add-on for Texas", () => {
    expect(us.marginal.TX).toBeDefined();
    const caps = us.marginal.TX.map(([cap]) => cap);
    expect(caps[caps.length - 1]).toBeNull();
    const closed = caps.filter((c): c is number => c !== null);
    for (let i = 1; i < closed.length; i++) expect(closed[i]).toBeGreaterThan(closed[i - 1]);
  });

  it("names its own fallback key, and that key resolves to a real table", () => {
    expect(us.marginalFallbackKey).toBe("US");
    expect(us.marginal[us.marginalFallbackKey]).toBeDefined();
    expect(us.marginal[us.marginalFallbackKey]).toEqual(us.marginal.TX);
  });
});

/**
 * `marginal[region] ?? marginal[marginalFallbackKey]` — a second state with no income-tax
 * table of its own must degrade to the US's real federal-only table, not throw on a bare
 * `.CA` lookup that only exists on `CaRules` (the bug this pair of tests guards). Exercised
 * through the public `marginalRate()`/`taxOnBand()` seam, not by reaching into the rules
 * object directly, since that seam is what every engine caller actually goes through.
 */
describe("marginalFallbackKey — an unknown region degrades to the country's own fallback", () => {
  it("us: an unmodelled state resolves to the same rate the federal (US) table gives", () => {
    const known = marginalRate(us, "TX", 90000);
    const unknown = marginalRate(us, "FL", 90000);
    expect(unknown).toBe(known);
    expect(taxOnBand(us, "FL", 0, 90000)).toBeCloseTo(taxOnBand(us, "TX", 0, 90000), 6);
  });

  it("ca: an unmodelled province still resolves via marginal.CA, unchanged by the US addition", () => {
    const known = marginalRate(ca, "ON", 90000);
    const unknown = marginalRate(ca, "NB", 90000);
    expect(unknown).toBe(marginalRate(ca, "CA", 90000));
    expect(unknown).not.toBe(known);
  });
});

describe("us financing — PMI is monthly, not financed, and cancels", () => {
  it("charges no upfront premium and does not finance one into the loan", () => {
    const fin = financing(us, { price: 350000, dpPct: 10, amortYears: 30, contractRate: 6.66 });
    expect(fin.insured).toBe(true);
    expect(fin.premium).toBe(0);
    expect(fin.loan).toBe(fin.baseLoan);
  });

  it("charges a positive MONTHLY premium while insured, and none when 20%+ down", () => {
    const insured = financing(us, { price: 350000, dpPct: 10, amortYears: 30, contractRate: 6.66 });
    expect(insured.monthlyInsurance).toBeGreaterThan(0);
    expect(insured.monthlyInsurance).toBeCloseTo(
      (insured.baseLoan * us.programs.conventional.pmi.annualRate) / 12,
      6,
    );

    const uninsured = financing(us, { price: 350000, dpPct: 20, amortYears: 30, contractRate: 6.66 });
    expect(uninsured.insured).toBe(false);
    expect(uninsured.monthlyInsurance).toBe(0);
    expect(uninsured.insuranceMonths).toBeNull();
  });

  it("terminates PMI at the month the scheduled balance first reaches 78% of original value", () => {
    const fin = financing(us, { price: 350000, dpPct: 10, amortYears: 30, contractRate: 6.66 });
    expect(fin.insuranceMonths).not.toBeNull();
    const targetBalance = us.programs.conventional.pmi.autoTerminateLtv * 350000;

    // Recompute the schedule independently (via amortization()) and check the month named
    // is genuinely the first one at or below the target balance — not a hardcoded number.
    const amort = amortization(us, {
      price: 350000,
      dpPct: 10,
      amortYears: 30,
      contractRate: 6.66,
      renewalRate: null,
      termYears: 5,
    });
    const month = fin.insuranceMonths!;
    const year = Math.ceil(month / 12);
    const row = amort.rows[year - 1];
    expect(row.closing).toBeLessThanOrEqual(targetBalance + 1);
    // The prior year's closing balance is still above the target — otherwise PMI would have
    // terminated a year earlier.
    if (year > 1) expect(amort.rows[year - 2].closing).toBeGreaterThan(targetBalance);
  });
});

describe("us amortization — no renewal, monthly compounding", () => {
  const amort = amortization(us, {
    price: 350000,
    dpPct: 10,
    amortYears: 30,
    contractRate: 6.66,
    // Deliberately non-null, to prove it is IGNORED on the toMaturity path.
    renewalRate: 9.99,
    termYears: 5,
  });

  it("keeps the payment constant to maturity — one distinct value across every row", () => {
    expect(new Set(amort.rows.map((r) => r.payment)).size).toBe(1);
  });

  it("never marks a row renewed, and reports zero shock", () => {
    expect(amort.rows.every((r) => !r.renewed)).toBe(true);
    expect(amort.shock).toBe(0);
    expect(amort.paymentAfterRenewal).toBe(amort.firstPayment);
  });

  it("matches a closed-form 30-year monthly-compounding total-interest figure", () => {
    const loan = amort.fin.loan;
    const rate = 0.0666 / 12;
    const n = 30 * 12;
    const payment = (loan * rate) / (1 - Math.pow(1 + rate, -n));
    const totalPaid = payment * n;
    const closedFormInterest = totalPaid - loan;
    expect(amort.totalInterest).toBeCloseTo(closedFormInterest, 0);
  });
});

/**
 * Guards the seam, not the symptom: `RentVsBuyInput.contractRate` is a FRACTION,
 * `FinancingInput.contractRate` (what `financing()` — and its `pmiTerminationMonth()` call —
 * actually reads) is a PERCENTAGE. Passing an explicit fractional rate straight through used to
 * feed `financing()` a percentage two orders of magnitude too small, moving PMI's
 * auto-termination month from 111 to 49 on $350k/10%-down/30y at 6.66%. This is the second time
 * this codebase has shipped a fraction-vs-percentage confusion (see `defaultContractRate`'s own
 * history) — the assertion below compares `rentVsBuy()`'s own `fin.insuranceMonths` against
 * `financing()` called directly at the equivalent PERCENTAGE, so a future regression that
 * reintroduces the unit bug fails here rather than only in a snapshot nobody re-derives by hand.
 */
describe("us rentVsBuy — contractRate unit (fraction in, percentage where financing() needs it)", () => {
  it("computes the same PMI termination month rentVsBuy() and financing() would, given an explicit fractional rate", () => {
    const contractRateFraction = 0.0666;
    const price = 350000;
    const dpPct = 10;
    const amortYears = 30;

    const result = rentVsBuy(houston, us, {
      price,
      dpPct,
      amortYears,
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
      termYears: 5,
      renewalRate: null,
      investDiff: true,
      years: 10,
      contractRate: contractRateFraction,
    });

    const expectedFin = financing(us, {
      price,
      dpPct,
      amortYears,
      contractRate: contractRateFraction * 100,
    });

    expect(result.fin.insuranceMonths).toBe(expectedFin.insuranceMonths);
    expect(result.fin.insuranceMonths).toBe(111);
    expect(result.fin.monthlyInsurance).toBeCloseTo(expectedFin.monthlyInsurance, 6);
  });
});

describe("us rentVsBuy — itemised-vs-standard deduction benefit", () => {
  it("beats the standard deduction for a large loan (high mortgage interest)", () => {
    const result = rentVsBuy(houston, us, {
      price: 900000,
      dpPct: 20,
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
      termYears: 5,
      renewalRate: null,
      investDiff: true,
      years: 1,
      taxableIncome: 150000,
    });
    expect(result.rows[0].itemizedBeatsStandard).toBe(true);
    expect(result.rows[0].deductionBenefit).toBeGreaterThan(0);
  });

  it("does NOT beat the standard deduction for a small loan", () => {
    const result = rentVsBuy(houston, us, {
      price: 150000,
      dpPct: 20,
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
      termYears: 5,
      renewalRate: null,
      investDiff: true,
      years: 1,
      taxableIncome: 60000,
    });
    expect(result.rows[0].itemizedBeatsStandard).toBe(false);
    expect(result.rows[0].deductionBenefit).toBe(0);
  });

  it("never renews and reports null renewal fields", () => {
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
      termYears: 5,
      renewalRate: 9.99,
      investDiff: true,
      years: 5,
    });
    expect(result.renewalRate).toBeNull();
    expect(result.renewedAt).toBeNull();
  });

  it("excludes the owner's gain up to §121, taxing only the excess", () => {
    // A large enough appreciation, long enough horizon, to push the gain past $250,000 single.
    const result = rentVsBuy(houston, us, {
      price: 900000,
      dpPct: 20,
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
      appreciation: 0.06,
      appreciationOn: true,
      investReturn: 0.046,
      termYears: 5,
      renewalRate: null,
      investDiff: true,
      years: 20,
    });
    const last = result.rows[result.rows.length - 1];
    const gain = last.homeValue - 900000;
    expect(gain).toBeGreaterThan(us.sec121.single);
    // If the whole gain were tax-free, equity would equal homeValue - sellingCost - balance
    // exactly. With sec121 exceeded, equity must be strictly less than that.
    expect(last.equity).toBeLessThan(last.homeValue - last.sellingCost - last.balance);
  });
});

describe("us affordability — qualifies at the bare contract rate, no heat allowance", () => {
  it("uses the contract rate as the qualifying rate (qualRate === contractRate)", () => {
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
    expect(result.qualRate).toBeCloseTo(6.66, 6);
  });

  it("includes PMI in the monthly total", () => {
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
    expect(result.monthly.pmi).toBeGreaterThan(0);
    expect(result.monthly.total).toBeGreaterThanOrEqual(
      result.monthly.pi + result.monthly.pmi + result.monthly.propTax,
    );
  });
});
