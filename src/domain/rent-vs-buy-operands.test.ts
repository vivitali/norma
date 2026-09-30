import { describe, expect, it } from "vitest";
import { ca } from "./rules/ca";
import { us } from "./rules/us";
import { getJurisdiction } from "./jurisdictions";
import type { CountryRules } from "./types";
import { rentVsBuy } from "./engine";

/**
 * Every figure `buyW` and `rentW` are made of is on the row, so a screen can show the sum
 * rather than re-derive it: the calc trace on /rent-vs-buy prints exactly these operands.
 * The US branch once netted a tax on investment gains that no field reported, and the trace's
 * subtotals stopped adding up.
 */
const input = {
  price: 1200000,
  dpPct: 20,
  amortYears: 30,
  ftb: true,
  ptype: "house" as const,
  elsewhere: false,
  residency: "resident" as const,
  insuranceAnnual: 3000,
  utilities: 180,
  condoFee: 0,
  rent: 2600,
  rentInflation: 0.03,
  appreciation: 0.04,
  appreciationOn: true,
  investReturn: 0.05,
  termYears: 5,
  renewalRate: 5.75,
  investDiff: true,
  years: 30,
  taxableIncome: 150000,
};

describe("rent vs buy: the wealth figures are sums of reported operands", () => {
  it.each([
    ["seattle", us],
    ["houston", us],
    ["toronto", ca],
    ["winnipeg", ca],
  ] as [string, CountryRules][])("%s", (id, rules) => {
    const j = getJurisdiction(id)!;
    const { rows } = rentVsBuy(j, rules, input);
    for (const r of rows) {
      expect(r.equity).toBeCloseTo(
        r.homeValue - r.sellingCost - (r.saleTax ?? 0) - (r.homeGainTax ?? 0) - r.balance,
        6,
      );
      expect(r.buyW).toBeCloseTo(r.equity + r.taxTimeCredits + r.bp - (r.buyGainsTax ?? 0), 6);
      expect(r.rentW).toBeCloseTo(r.upFrontGrown + r.rp - (r.rentGainsTax ?? 0), 6);
    }
    // Canada taxes none of these at the sale in this model; the US taxes both portfolios.
    const last = rows.at(-1)!;
    if (rules.country === "ca") {
      expect("buyGainsTax" in last || "rentGainsTax" in last || "homeGainTax" in last).toBe(false);
    } else {
      expect(last.rentGainsTax).toBeGreaterThan(0);
    }
  });
});

describe("rent vs buy (US): the investment-gains tax is the flat rate on growth", () => {
  // The identities above hold by construction for buyGainsTax/rentGainsTax, which the engine
  // derives by subtraction. This computes them independently, from figures the row reports:
  // with no invested difference, the renter's only holding is the grown up-front cash, and the
  // buyer's is the deduction benefit invested as it arrived.
  it("seattle, no invested difference", () => {
    if (us.gains.kind !== "flat") throw new Error("the US branch taxes gains at a flat rate");
    const rate = us.gains.rate;
    const result = rentVsBuy(getJurisdiction("seattle")!, us, { ...input, investDiff: false });
    let contributed = 0;
    for (const r of result.rows) {
      contributed += r.deductionBenefit ?? 0;
      expect(r.rentGainsTax ?? 0).toBeCloseTo((r.upFrontGrown - result.upFront) * rate, 6);
      expect(r.buyGainsTax ?? 0).toBeCloseTo(Math.max(0, r.taxTimeCredits - contributed) * rate, 6);
    }
  });
});
