import { describe, expect, it } from "vitest";
import {
  amortization,
  financing,
  glidePath,
  hbpPlay,
  marginalRate,
  minDown,
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
    need: 100000, prov: "ON", income: 100000,
    fhsa: 0, cash: 0, rrsp: 0, tfsa: 0, gift: 0, nonreg: 0, nonregGain: 0,
  };

  it("draws in the fixed cost order: free, then strings, then taxed", () => {
    const w = waterfall(federal, { ...base, need: 30000, fhsa: 10000, cash: 10000, rrsp: 60000, tfsa: 10000 });
    const drawn = w.rows.filter((r) => r.drawn > 0).map((r) => r.key);
    expect(drawn).toEqual(["fhsa", "cash", "hbp"]);
    // TFSA is available and untouched -- the order is by cost, not by balance.
    expect(w.rows.find((r) => r.key === "tfsa")!.untouched).toBe(true);
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

describe("hbpPlay", () => {
  it("caps the contribution at the federal maximum", () => {
    const h = hbpPlay(federal, { contribution: 100000, marginalRate: 0.3389, withdrawAmount: 100000 });
    expect(h.contribution).toBe(federal.hbp.max);
    expect(h.withdraw).toBe(federal.hbp.max);
  });

  it("cannot withdraw more than was contributed", () => {
    const h = hbpPlay(federal, { contribution: 20000, marginalRate: 0.3389, withdrawAmount: 60000 });
    expect(h.withdraw).toBe(20000);
  });

  it("values the refund at the marginal rate", () => {
    const h = hbpPlay(federal, { contribution: 30000, marginalRate: 0.4, withdrawAmount: 30000 });
    expect(h.refund).toBeCloseTo(12000, 6);
  });

  it("repays the whole withdrawal over the statutory years, to exactly zero", () => {
    const h = hbpPlay(federal, { contribution: 60000, marginalRate: 0.3, withdrawAmount: 60000 });
    expect(h.schedule).toHaveLength(federal.hbp.repayYears);
    expect(h.schedule[h.schedule.length - 1].balance).toBeCloseTo(0, 6);
    expect(h.schedule.reduce((t, s) => t + s.repay, 0)).toBeCloseTo(60000, 6);
  });

  it("prices a missed repayment year at the marginal rate on the missed amount", () => {
    // The real risk of the manoeuvre, and permanent: the missed amount is added
    // to income and there is no way to put it back.
    const h = hbpPlay(federal, { contribution: 60000, marginalRate: 0.4, withdrawAmount: 60000 });
    expect(h.taxIfMissed).toBeCloseTo((60000 / federal.hbp.repayYears) * 0.4, 6);
  });

  it("ships no worthIt verdict", () => {
    // The reference returned one computed as `refund + growth > 0 && withdraw > 0`,
    // which is true whenever anything is withdrawn at all -- a verdict that could
    // only ever say yes, on the screen whose job is to say whether this is wise.
    const h = hbpPlay(federal, { contribution: 1, marginalRate: 0.2, withdrawAmount: 1 });
    expect(h).not.toHaveProperty("worthIt");
  });
});

describe("rentVsBuy", () => {
  const base = {
    price: 700000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false,
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
    const r = rentVsBuy(toronto, federal, base);
    expect(r.upFront).toBeCloseTo(r.fin.down + r.cc.total, 4);
  });
});

describe("scenario", () => {
  const base = {
    price: 600000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false,
    insuranceAnnual: 1500, utilities: 300, condoFee: 0, comfortCeiling: 3200,
    qualIncome: 120000, debts: 400, funds: 100000, save: 1000,
  };

  it("raises a below-minimum request to the legal floor and says it did", () => {
    const s = scenario(toronto, federal, { ...base, dpPct: 3 });
    expect(s.belowMinimum).toBe(true);
    expect(s.down).toBeCloseTo(minDown(base.price), 6);
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
