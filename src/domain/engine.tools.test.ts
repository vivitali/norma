import { describe, expect, it } from "vitest";
import {
  amortization,
  closingTotal,
  financing,
  glidePath,
  hbpPlay,
  marginalRate,
  minDown,
  taxOnBand,
  payFactor,
  rentVsBuy,
  rowAt,
  scenario,
  waterfall,
} from "./engine";
import { federal } from "./federal";
import { getJurisdiction } from "./jurisdictions";

/** Throws rather than asserting non-null: a renamed jurisdiction id should fail here, loudly. */
function jur(id: string) {
  const j = getJurisdiction(id);
  if (!j) throw new Error(`no jurisdiction "${id}"`);
  return j;
}

const toronto = jur("toronto");
const montreal = jur("montreal");
// Alberta levies no retail sales tax on insurance premiums. Ontario does (8%),
// which is why toronto is the wrong control for a "no premium tax" case.
const calgary = jur("calgary");

describe("amortization", () => {
  const base = { price: 500000, dpPct: 20, amortYears: 25, contractRate: 4.04, renewalRate: null, termYears: 5 };

  it("repays exactly the loan, no more and no less", () => {
    const a = amortization(federal, base);
    const principal = a.rows.reduce((t, r) => t + r.principal, 0);
    expect(principal).toBeCloseTo(a.fin.loan, 2);
    expect(a.rows[a.rows.length - 1].closing).toBe(0);
  });

  it("accrues less interest than an annual model would, because the balance falls monthly", () => {
    // The whole reason the inner loop is monthly. An annual calculation on the
    // opening balance overstates year-one interest by roughly half a year's
    // amortization -- a real dollar figure, not a rounding difference.
    const a = amortization(federal, base);
    const annualNaive = a.fin.loan * (Math.pow(1 + 0.0404 / 2, 2) - 1);
    expect(a.rows[0].interest).toBeLessThan(annualNaive);
  });

  it("reports no shock when no renewal rate is given", () => {
    const a = amortization(federal, base);
    // Closed to float noise, not exactly 0: renewal still recomputes the payment,
    // it just recomputes it at the same rate. money() rounds the difference away.
    expect(a.shock).toBeCloseTo(0, 6);
    expect(a.paymentAfterRenewal).toBeCloseTo(a.firstPayment, 6);
    expect(a.rows.every((r) => r.rate === 4.04)).toBe(true);
  });

  it("re-amortizes over the REMAINING years at renewal, not the original term", () => {
    // Re-amortizing over the full 25 years again would understate the payment
    // and hide the shock -- the one thing this screen exists to show.
    const a = amortization(federal, { ...base, renewalRate: 7 });
    const renewal = a.rows.find((r) => r.renewed)!;
    expect(renewal.t).toBe(6);
    const remaining = base.amortYears - (renewal.t - 1);
    expect(remaining).toBe(20);
    // The comparison that isolates the choice: the SAME balance at the SAME rate,
    // stretched back over the original 25 years, buys a smaller payment. Renewal
    // must not do that -- the clock does not reset, and pretending it does is
    // exactly how a screen hides the shock.
    const stretched = renewal.opening * payFactor(0.07, base.amortYears);
    expect(renewal.payment).toBeGreaterThan(stretched);
    expect(renewal.payment).toBeCloseTo(renewal.opening * payFactor(0.07, remaining), 6);
  });

  it("raises the payment when renewal lands on a higher rate", () => {
    const a = amortization(federal, { ...base, renewalRate: 7 });
    expect(a.shock).toBeGreaterThan(0);
    expect(a.peakPayment).toBeCloseTo(a.paymentAfterRenewal, 6);
  });

  it("lowers the payment when renewal lands on a lower rate", () => {
    const a = amortization(federal, { ...base, renewalRate: 2 });
    expect(a.shock).toBeLessThan(0);
    // Peak stays the FIRST payment: a shock can be a relief, and peakPayment
    // must not quietly track the latest payment instead of the largest.
    expect(a.peakPayment).toBeCloseTo(a.firstPayment, 6);
  });

  it("renews once per term, at the start of each new one", () => {
    const a = amortization(federal, { ...base, renewalRate: 5, termYears: 5 });
    expect(a.rows.filter((r) => r.renewed).map((r) => r.t)).toEqual([6, 11, 16, 21]);
  });

  it("pays off inside the amortization it was given", () => {
    const a = amortization(federal, base);
    expect(a.payoffYear).toBeLessThanOrEqual(base.amortYears);
  });
});

describe("marginalRate", () => {
  it("returns the bracket the income falls in", () => {
    expect(marginalRate(federal, "ON", 50000)).toBe(0.2005);
    expect(marginalRate(federal, "ON", 100000)).toBe(0.2965);
  });

  it("treats a bracket cap as the top of that bracket, not the bottom of the next", () => {
    expect(marginalRate(federal, "ON", 52886)).toBe(0.2005);
    expect(marginalRate(federal, "ON", 52887)).toBe(0.2415);
  });

  it("falls back to the CA table for a province with no table of its own", () => {
    expect(marginalRate(federal, "NU", 60000)).toBe(marginalRate(federal, "CA", 60000));
  });

  it("returns the top rate above the last cap", () => {
    expect(marginalRate(federal, "ON", 5_000_000)).toBe(0.5353);
  });
});

describe("waterfall", () => {
  const base = {
    need: 100000, prov: "ON", income: 100000, ftb: true,
    fhsa: 0, cash: 0, rrsp: 0, tfsa: 0, gift: 0, nonreg: 0, nonregGain: 0,
  };

  it("draws in the fixed cost order: free, then strings, then taxed", () => {
    const w = waterfall(federal, { ...base, need: 30000, fhsa: 10000, cash: 10000, rrsp: 60000, tfsa: 10000 });
    const drawn = w.rows.filter((r) => r.drawn > 0).map((r) => r.key);
    expect(drawn).toEqual(["fhsa", "cash", "hbp"]);
    // TFSA is available and untouched -- the order is by cost, not by balance.
    expect(w.rows.find((r) => r.key === "tfsa")!.untouched).toBe(true);
  });

  it("spends a gift before an HBP withdrawal or a TFSA", () => {
    // The rows render in array order under copy reading "each source costs more than the
    // one above it", and a gift costs nothing at all: drawing the RRSP first bought
    // fifteen years of repayment obligation the reader did not need.
    const w = waterfall(federal, { ...base, need: 30000, gift: 30000, rrsp: 60000, tfsa: 30000 });
    const drawn = w.rows.filter((r) => r.drawn > 0).map((r) => r.key);
    expect(drawn).toEqual(["gift"]);
    expect(w.rows.find((r) => r.key === "hbp")!.repayAnnual).toBe(0);
  });

  it("orders the rows free, free, free, strings, strings, taxed", () => {
    const w = waterfall(federal, base);
    expect(w.rows.map((r) => r.key)).toEqual(["fhsa", "cash", "gift", "hbp", "tfsa", "nonreg"]);
    expect(w.rows.map((r) => r.cost)).toEqual([
      "free", "free", "free", "strings", "strings", "tax",
    ]);
  });

  it("draws neither FHSA nor HBP money for a buyer who is not a first-time buyer", () => {
    // Both are qualifying-home-buyer programmes in law. The waterfall used to spend them
    // regardless, so a repeat buyer was funded from two accounts they may not touch.
    const w = waterfall(federal, { ...base, ftb: false, need: 100000, fhsa: 40000, rrsp: 60000 });
    const fhsa = w.rows.find((r) => r.key === "fhsa")!;
    const hbp = w.rows.find((r) => r.key === "hbp")!;
    expect(fhsa.drawn).toBe(0);
    expect(hbp.drawn).toBe(0);
    expect(w.shortfall).toBe(100000);
  });

  it("keeps the blocked rows present, with a reason, rather than dropping them", () => {
    // Mirrors CreditLine.st === "ftbOnly": a reader with $40,000 in an FHSA must learn the
    // rule that stops them using it here, not conclude the app forgot the account.
    const w = waterfall(federal, { ...base, ftb: false, fhsa: 40000, rrsp: 60000 });
    expect(w.rows.map((r) => r.key)).toContain("fhsa");
    expect(w.rows.find((r) => r.key === "fhsa")!.blocked).toBe("ftb");
    expect(w.rows.find((r) => r.key === "hbp")!.blocked).toBe("ftb");
    expect(w.rows.find((r) => r.key === "cash")!.blocked).toBeUndefined();
    expect(w.totalAvailable).toBe(0);
  });

  it("marks nothing blocked for a first-time buyer", () => {
    const w = waterfall(federal, { ...base, fhsa: 40000, rrsp: 60000 });
    expect(w.rows.every((r) => r.blocked === undefined)).toBe(true);
  });

  it("caps the HBP draw at the federal maximum, not at the RRSP balance", () => {
    const w = waterfall(federal, { ...base, need: 200000, rrsp: 200000 });
    expect(w.rows.find((r) => r.key === "hbp")!.drawn).toBe(federal.hbp.max);
  });

  it("creates a 15-year repayment obligation sized to what was drawn", () => {
    const w = waterfall(federal, { ...base, need: 30000, rrsp: 60000 });
    const hbp = w.rows.find((r) => r.key === "hbp")!;
    expect(hbp.repayAnnual).toBeCloseTo(30000 / federal.hbp.repayYears, 6);
  });

  it("pro-rates the gain on a partial non-registered draw", () => {
    // Selling a third of the account realises a third of the gain, not all of it
    // and not none of it.
    const w = waterfall(federal, { ...base, need: 10000, nonreg: 30000, nonregGain: 9000 });
    const nr = w.rows.find((r) => r.key === "nonreg")!;
    expect(nr.gainRealised).toBeCloseTo(3000, 6);
    expect(nr.tax).toBeCloseTo(3000 * federal.capGainsInclusion * marginalRate(federal, "ON", 100000), 6);
  });

  it("charges no tax on a source that carries none, however large the draw", () => {
    const w = waterfall(federal, { ...base, need: 50000, fhsa: 40000, gift: 20000 });
    expect(w.taxTotal).toBe(0);
  });

  it("reports the uncovered remainder as a shortfall rather than silently funding it", () => {
    const w = waterfall(federal, { ...base, need: 100000, cash: 25000 });
    expect(w.drawnTotal).toBe(25000);
    expect(w.shortfall).toBe(75000);
    expect(w.surplus).toBe(0);
  });

  it("reports a surplus when the sources exceed the need", () => {
    const w = waterfall(federal, { ...base, need: 20000, cash: 50000 });
    expect(w.shortfall).toBe(0);
    expect(w.surplus).toBe(30000);
  });

  it("never draws from a negative balance", () => {
    const w = waterfall(federal, { ...base, need: 10000, cash: -5000, fhsa: 10000 });
    expect(w.rows.find((r) => r.key === "cash")!.drawn).toBe(0);
    expect(w.drawnTotal).toBe(10000);
  });
});

describe("glidePath", () => {
  it("reaches the target and reports the month it happened", () => {
    const g = glidePath(federal, 12000, 1000, 36);
    expect(g.reach).not.toBeNull();
    expect(g.reach!).toBeLessThanOrEqual(12);
    expect(g.series[g.reach!].saved).toBeGreaterThanOrEqual(12000);
  });

  it("returns null rather than a rounded-up month when the target is out of reach", () => {
    // The honest answer. A number here would be a promise the saving rate cannot keep.
    const g = glidePath(federal, 500000, 200, 36);
    expect(g.reach).toBeNull();
  });

  it("starts at zero and never goes backwards", () => {
    const g = glidePath(federal, 10000, 300, 24);
    expect(g.series[0].saved).toBe(0);
    expect(g.series).toHaveLength(25);
    for (let i = 1; i < g.series.length; i++) {
      expect(g.series[i].saved).toBeGreaterThan(g.series[i - 1].saved);
    }
  });

  it("compounds, so it beats plain monthly saving times the months", () => {
    const g = glidePath(federal, 0, 1000, 36);
    expect(g.series[36].saved).toBeGreaterThan(36000);
  });
});

describe("taxOnBand", () => {
  it("integrates the bracket table over a band that spans three brackets", () => {
    // Hand-computed against federal.marginal.ON, band by band:
    //   15,000 -> 52,886 : 37,886 x 0.2005 = 7,596.143
    //   52,886 -> 58,522 :  5,636 x 0.2415 = 1,361.094
    //   58,522 -> 75,000 : 16,478 x 0.2965 = 4,885.727
    //                                      = 13,842.964
    expect(taxOnBand(federal, "ON", 15000, 75000)).toBeCloseTo(13842.964, 3);
  });

  it("agrees with the marginal rate on an infinitesimal band", () => {
    const at = 90000;
    const band = taxOnBand(federal, "ON", at, at + 1);
    expect(band).toBeCloseTo(marginalRate(federal, "ON", at + 1), 9);
  });

  it("is additive across a split, so no bracket boundary is double-counted or skipped", () => {
    const whole = taxOnBand(federal, "BC", 0, 250000);
    const parts =
      taxOnBand(federal, "BC", 0, 98560) +
      taxOnBand(federal, "BC", 98560, 181400) +
      taxOnBand(federal, "BC", 181400, 250000);
    expect(parts).toBeCloseTo(whole, 6);
  });

  it("returns nothing for an empty or inverted band, and clamps a negative floor to zero", () => {
    expect(taxOnBand(federal, "ON", 50000, 50000)).toBe(0);
    expect(taxOnBand(federal, "ON", 75000, 15000)).toBeCloseTo(
      taxOnBand(federal, "ON", 15000, 75000),
      9,
    );
    expect(taxOnBand(federal, "ON", -20000, 10000)).toBeCloseTo(
      taxOnBand(federal, "ON", 0, 10000),
      9,
    );
  });

  it("falls back to the national table for a province it does not carry", () => {
    expect(taxOnBand(federal, "NU", 0, 60000)).toBeCloseTo(taxOnBand(federal, "CA", 0, 60000), 9);
  });

  it("keeps running above the final bracket, whose ceiling is null", () => {
    const top = federal.marginal.ON[federal.marginal.ON.length - 1][1];
    expect(taxOnBand(federal, "ON", 1_000_000, 1_100_000)).toBeCloseTo(100000 * top, 4);
  });
});

describe("hbpPlay", () => {
  const ON = { prov: "ON", income: 75000 };

  it("caps the contribution at the federal maximum", () => {
    const h = hbpPlay(federal, { ...ON, contribution: 100000, withdrawAmount: 100000 });
    expect(h.contribution).toBe(federal.hbp.max);
    expect(h.withdraw).toBe(federal.hbp.max);
  });

  it("cannot withdraw more than was contributed", () => {
    const h = hbpPlay(federal, { ...ON, contribution: 20000, withdrawAmount: 60000 });
    expect(h.withdraw).toBe(20000);
  });

  it("prices the deduction over the brackets it walks through, not at the top rate", () => {
    // The defect this replaced: `contribution * marginalRate(income)` priced the whole
    // $60,000 at Ontario's 29.65% and printed ~$17,790 as the page's hero figure. The
    // deduction actually carries the taxpayer from $75,000 down to $15,000, through three
    // brackets, and saves ~$13,842 -- a 29% overstatement, in the flattering direction.
    const h = hbpPlay(federal, { ...ON, contribution: 60000, withdrawAmount: 60000 });
    expect(h.refund).toBeCloseTo(13842.964, 3);
    expect(h.refund).toBeLessThan(60000 * marginalRate(federal, "ON", 75000));
  });

  it("still prices the FIRST dollar of the deduction at the marginal rate", () => {
    const h = hbpPlay(federal, { ...ON, contribution: 1, withdrawAmount: 1 });
    expect(h.refund).toBeCloseTo(marginalRate(federal, "ON", 75000), 6);
  });

  it("never refunds tax on income that was never earned", () => {
    // A $60,000 deduction against $20,000 of income cannot save tax on $40,000 of nothing.
    const h = hbpPlay(federal, { prov: "ON", income: 20000, contribution: 60000, withdrawAmount: 60000 });
    expect(h.refund).toBeCloseTo(taxOnBand(federal, "ON", 0, 20000), 6);
  });

  it("repays the whole withdrawal over the statutory years, to exactly zero", () => {
    const h = hbpPlay(federal, { ...ON, contribution: 60000, withdrawAmount: 60000 });
    expect(h.schedule).toHaveLength(federal.hbp.repayYears);
    expect(h.schedule[h.schedule.length - 1].balance).toBeCloseTo(0, 6);
    expect(h.schedule.reduce((t, s) => t + s.repay, 0)).toBeCloseTo(60000, 6);
  });

  it("prices a missed repayment year at the marginal rate on the missed amount", () => {
    // The real risk of the manoeuvre, and permanent: the missed amount is added
    // to income and there is no way to put it back. The MARGINAL rate is right here --
    // one year's repayment sits on top of an otherwise unchanged income.
    const h = hbpPlay(federal, { ...ON, contribution: 60000, withdrawAmount: 60000 });
    const rate = marginalRate(federal, "ON", 75000);
    expect(h.marginalRate).toBe(rate);
    expect(h.taxIfMissed).toBeCloseTo((60000 / federal.hbp.repayYears) * rate, 6);
  });

  it("says when the withdrawal was cut back to the contribution", () => {
    // The state that collapsed the whole page to $0 with no explanation: someone who
    // already holds $60,000 in an RRSP, contributes nothing further, and asks for it.
    const h = hbpPlay(federal, { ...ON, contribution: 0, withdrawAmount: 60000 });
    expect(h.withdraw).toBe(0);
    expect(h.clampedByContribution).toBe(true);
    expect(h.withdrawRequested).toBe(60000);
  });

  it("names the contribution even where the federal maximum ties with it", () => {
    // Contributing the maximum makes the two caps identical, so the flag would be
    // ambiguous if it were about which cap won. It is not: the contribution is capped at
    // the federal maximum before either is applied, so a cut-back withdrawal is ALWAYS cut
    // back to the contribution, and the sentence naming it is always true.
    const h = hbpPlay(federal, { ...ON, contribution: 100000, withdrawAmount: 200000 });
    expect(h.contribution).toBe(federal.hbp.max);
    expect(h.withdraw).toBe(federal.hbp.max);
    expect(h.clampedByContribution).toBe(true);
  });

  it("claims no clamp when the reader asked for less than they contributed", () => {
    const h = hbpPlay(federal, { ...ON, contribution: 60000, withdrawAmount: 20000 });
    expect(h.clampedByContribution).toBe(false);
  });

  it("ships no worthIt verdict", () => {
    // The reference returned one computed as `refund + growth > 0 && withdraw > 0`,
    // which is true whenever anything is withdrawn at all -- a verdict that could
    // only ever say yes, on the screen whose job is to say whether this is wise.
    const h = hbpPlay(federal, { ...ON, contribution: 1, withdrawAmount: 1 });
    expect(h).not.toHaveProperty("worthIt");
  });
});

describe("rentVsBuy", () => {
  const base = {
    price: 700000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false, residency: "resident" as const,
    insuranceAnnual: 1500, utilities: 300, condoFee: 0,
    rent: 2400, rentInflation: 0.03, appreciation: 0.031, appreciationOn: true,
    investReturn: 0.046, investDiff: true, years: 40,
  };

  it("stops the mortgage payment at payoff, which is where the buy line steepens", () => {
    // The reason the schedule runs 40 years and monthly. A 15-year table never
    // had to model the discharge and quietly flatters renting.
    const r = rentVsBuy(toronto, federal, base);
    expect(r.payoffYear).toBe(25);
    const lastPaying = rowAt(r.rows, 25);
    const firstFree = rowAt(r.rows, 26);
    expect(firstFree.ownerOutlay).toBeLessThan(lastPaying.ownerOutlay);
    expect(firstFree.paid).toBe(0);
  });

  it("nets selling cost out of equity, because unrealisable wealth is not wealth", () => {
    const r = rentVsBuy(toronto, federal, base);
    const row = rowAt(r.rows, 10);
    expect(row.equity).toBeCloseTo(row.homeValue * (1 - federal.sellingCost) - row.balance, 4);
  });

  it("holds the house flat when appreciation is switched off", () => {
    const r = rentVsBuy(toronto, federal, { ...base, appreciationOn: false });
    expect(rowAt(r.rows, 20).homeValue).toBeCloseTo(base.price, 4);
  });

  it("funds only one side's portfolio in any given year", () => {
    // The symmetry the whole comparison rests on: whoever spends LESS this year
    // invests the difference, and the other side's portfolio only compounds. If
    // both sides could be credited in the same year the model would be inventing
    // money, and the buy line would drift up for free.
    const r = rentVsBuy(toronto, federal, base);
    for (let t = 2; t <= r.years; t++) {
      const prev = rowAt(r.rows, t - 1);
      const row = rowAt(r.rows, t);
      const idle = row.diff > 0 ? { now: row.bp, before: prev.bp } : { now: row.rp, before: prev.rp };
      expect(idle.now).toBeCloseTo(idle.before * (1 + base.investReturn), 6);
    }
  });

  it("credits neither side with the difference when investing it is switched off", () => {
    const r = rentVsBuy(toronto, federal, { ...base, investDiff: false });
    expect(r.rows.every((row) => row.rp === 0 && row.bp === 0)).toBe(true);
  });

  it("reports a null break-even rather than inventing one when buying never gets ahead", () => {
    const r = rentVsBuy(toronto, federal, {
      ...base, rent: 600, appreciationOn: false, investReturn: 0.12, years: 10,
    });
    expect(r.breakEven).toBeNull();
  });

  it("counts the down payment AND closing costs as the renter's starting capital", () => {
    // The renter does not spend that money; it is invested. Omitting closing
    // costs from it would hand the buyer a free head start.
    //
    // Asserted NET of rebates applied at the closing table, not on the gross
    // bill: this used to read `r.fin.down + r.cc.total`, which handed the RENTER
    // the head start instead — see the block below.
    const r = rentVsBuy(toronto, federal, base);
    expect(r.upFront).toBeCloseTo(r.fin.down + r.cc.total - r.cc.creditsAtClosing, 4);
  });
});

describe("scenario", () => {
  const base = {
    price: 600000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false, residency: "resident" as const,
    insuranceAnnual: 1500, utilities: 300, condoFee: 0, comfortCeiling: 3200,
    qualIncome: 120000, debts: 400, funds: 100000, save: 1000,
  };

  it("raises a below-minimum request to the legal floor and says it did", () => {
    const s = scenario(toronto, federal, { ...base, dpPct: 3 });
    expect(s.belowMinimum).toBe(true);
    expect(s.down).toBeCloseTo(minDown(federal, base.price), 6);
    expect(s.dpPctEff).toBeGreaterThan(3);
  });

  it("leaves a legal request alone", () => {
    const s = scenario(toronto, federal, { ...base, dpPct: 20 });
    expect(s.belowMinimum).toBe(false);
    expect(s.dpPctEff).toBeCloseTo(20, 6);
  });

  it("stops insuring at 20% down", () => {
    expect(scenario(toronto, federal, { ...base, dpPct: 19 }).insured).toBe(true);
    expect(scenario(toronto, federal, { ...base, dpPct: 20 }).insured).toBe(false);
    expect(scenario(toronto, federal, { ...base, dpPct: 20 }).premium).toBe(0);
  });

  it("recomputes closing costs per column where the province taxes the premium", () => {
    // Quebec taxes the CMHC premium, so a low-down-payment column costs MORE at
    // closing than the down-payment difference alone. Holding closing costs
    // constant across columns would hide the one cost that varies with the thing
    // being compared.
    const low = scenario(montreal, federal, { ...base, dpPct: 5 });
    const high = scenario(montreal, federal, { ...base, dpPct: 20 });
    expect(low.premiumTaxLine).toBeGreaterThan(0);
    expect(high.premiumTaxLine).toBe(0);
    expect(low.closingTotal).toBeGreaterThan(high.closingTotal);
  });

  it("charges no premium tax where the province does not levy one", () => {
    expect(scenario(calgary, federal, { ...base, dpPct: 5 }).premiumTaxLine).toBe(0);
  });

  it("returns null, not zero, for fundability when funds were never given", () => {
    const s = scenario(toronto, federal, { ...base, funds: null });
    expect(s.surplus).toBeNull();
    expect(s.fundable).toBeNull();
    expect(s.months).toBeNull();
  });

  it("returns null months when there is a shortfall and no saving rate", () => {
    const s = scenario(toronto, federal, { ...base, funds: 1000, save: null });
    expect(s.fundable).toBe(false);
    expect(s.months).toBeNull();
  });

  it("costs more to borrow at a lower down payment, premium included", () => {
    const low = scenario(toronto, federal, { ...base, dpPct: 5 });
    const high = scenario(toronto, federal, { ...base, dpPct: 20 });
    expect(low.costOfBorrowing).toBeGreaterThan(high.costOfBorrowing);
  });

  it("qualifies against the stress rate, never the contract rate", () => {
    const s = scenario(toronto, federal, base);
    expect(s.qualRate).toBeGreaterThan(s.contractRate);
    expect(s.stressPay).toBeGreaterThan(s.monthly.pi);
  });

  it("agrees with financing() about the premium at the same effective percentage", () => {
    const s = scenario(toronto, federal, { ...base, dpPct: 10 });
    const f = financing(federal, { price: base.price, dpPct: 10, amortYears: 25 });
    expect(s.premium).toBeCloseTo(f.premium, 4);
  });
});

describe("rentVsBuy — the renter invests what the buyer actually produces", () => {
  const toronto = jur("toronto");

  const base = (ftb: boolean, dpPct: number) => ({
    price: toronto.bench.house!,
    dpPct,
    amortYears: 30,
    ftb,
    ptype: "house" as const,
    elsewhere: false,
    residency: "resident" as const,
    insuranceAnnual: 1500,
    utilities: 300,
    condoFee: 0,
    rent: toronto.rent!,
    rentInflation: 0.03,
    years: 10,
    appreciation: federal.appreciation.shelter,
    appreciationOn: true,
    investReturn: federal.investReturn.balanced,
    investDiff: true,
  });

  it("tracks the down-payment slider, less the closing costs a bigger down payment avoids", () => {
    const low = rentVsBuy(toronto, federal, base(true, 10));
    const high = rentVsBuy(toronto, federal, base(true, 20));

    // A bigger down payment is a bigger sum the renter does not have to find, so the
    // renter's invested base rises with it.
    expect(high.upFront).toBeGreaterThan(low.upFront);

    // But it rises by LESS than the down payment did, and that is correct rather than
    // a rounding artefact: 20% down retires the CMHC premium, and with it the
    // provincial sales tax charged on that premium — which is a closing cost, and the
    // one closing cost that moves with the thing being compared. The buyer's total
    // bill therefore falls by ~$3,458 at the same moment their down payment rises by
    // $145,520, and the renter's invested base has to reflect both halves.
    const dDown = high.fin.down - low.fin.down;
    const dBill = low.cc.total - high.cc.total;
    expect(dBill).toBeGreaterThan(0);
    expect(high.upFront - low.upFront).toBeCloseTo(dDown - dBill, 2);
  });

  it("invests the closing costs too — the buyer needs that cash upfront as well", () => {
    const r = rentVsBuy(toronto, federal, base(true, 10));
    expect(r.upFront).toBeGreaterThan(r.fin.down);
    expect(r.upFront - r.fin.down).toBeCloseTo(r.cc.total - r.cc.creditsAtClosing, 2);
  });

  it("nets off rebates applied AT the closing table, not the gross bill", () => {
    const r = rentVsBuy(toronto, federal, base(true, 10));
    // Toronto's first-time buyer collects the Ontario rebate and the municipal one.
    expect(r.cc.creditsAtClosing).toBeGreaterThan(0);
    expect(r.upFront).toBe(r.cc.net);
    // The defect this pins: investing the GROSS bill hands the renter money the
    // buyer never had to produce, and compounds it for the whole horizon.
    const gross = r.fin.down + r.cc.total;
    expect(gross - r.upFront).toBeCloseTo(r.cc.creditsAtClosing, 2);
  });

  it("agrees to the dollar with the Closing Costs page's own answer", () => {
    // page.tsx prints `upFront` under a Trace cross-link asserting it IS that
    // page's figure, and that page's hero is `closingTotal().net`.
    const o = base(true, 10);
    expect(rentVsBuy(toronto, federal, o).upFront).toBe(closingTotal(toronto, federal, o).net);
  });

  it("leaves a non-first-time buyer's upfront cash unchanged", () => {
    const r = rentVsBuy(toronto, federal, base(false, 10));
    expect(r.cc.creditsAtClosing).toBe(0);
    expect(r.upFront).toBe(r.fin.down + r.cc.total);
  });
});
