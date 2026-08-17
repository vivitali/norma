import { describe, expect, it } from "vitest";
import { money, bracketTax, payFactor, minDown, financing, buildLines, credits, closingTotal } from "./engine";
import { federal } from "./federal";
import { getJurisdiction } from "./jurisdictions";

describe("money", () => {
  it("formats a positive amount with the symbol first in en", () => {
    expect(money(1234, "en-CA", false)).toBe("$1,234");
  });

  it("puts the sign outside the symbol for a negative amount, never $-340", () => {
    const result = money(-340, "en-CA", false);
    expect(result).toBe("− $340");
    expect(result).not.toContain("$-");
  });

  it("formats with the symbol trailing in fr", () => {
    const result = money(1234, "fr-CA", true);
    expect(result.endsWith(" $")).toBe(true);
  });

  it("treats -0 as 0, not negative zero", () => {
    expect(money(-0.001, "en-CA", false)).toBe("$0");
  });
});

describe("bracketTax", () => {
  const brackets: [number | null, number][] = [
    [100, 0.01],
    [200, 0.02],
    [null, 0.03],
  ];

  it("taxes only within the first bracket when price is below its cap", () => {
    const result = bracketTax(50, brackets);
    expect(result.total).toBeCloseTo(0.5, 5);
    expect(result.parts).toHaveLength(1);
  });

  it("taxes across multiple brackets proportionally", () => {
    // 100 @ 1% = 1, next 100 (100->200) @ 2% = 2, next 50 (200->250) @ 3% = 1.5
    const result = bracketTax(250, brackets);
    expect(result.total).toBeCloseTo(1 + 2 + 1.5, 5);
    expect(result.parts).toHaveLength(3);
  });

  it("returns zero tax for a zero price", () => {
    expect(bracketTax(0, brackets).total).toBe(0);
  });
});

describe("payFactor", () => {
  it("returns 1/n for a zero rate (equal principal payments)", () => {
    expect(payFactor(0, 25)).toBeCloseTo(1 / (25 * 12), 8);
  });

  it("returns a larger monthly factor for a higher rate at the same amortization", () => {
    expect(payFactor(0.06, 25)).toBeGreaterThan(payFactor(0.03, 25));
  });

  it("returns a smaller monthly factor for a longer amortization at the same rate", () => {
    expect(payFactor(0.04, 30)).toBeLessThan(payFactor(0.04, 15));
  });
});

describe("minDown", () => {
  it("requires 5% under $500,000", () => {
    expect(minDown(400000)).toBeCloseTo(20000, 5);
  });

  it("requires 5% on the first $500,000 plus 10% above it, between $500,000 and $1,500,000", () => {
    expect(minDown(600000)).toBeCloseTo(25000 + 10000, 5);
  });

  it("requires a flat 20% at or above $1,500,000", () => {
    expect(minDown(1500000)).toBeCloseTo(300000, 5);
    expect(minDown(2000000)).toBeCloseTo(400000, 5);
  });
});

describe("financing", () => {
  it("does not require CMHC insurance at 20% down", () => {
    const result = financing(federal, { price: 500000, dpPct: 20, amortYears: 25 });
    expect(result.insured).toBe(false);
    expect(result.premium).toBe(0);
    expect(result.loan).toBeCloseTo(result.baseLoan, 5);
  });

  it("requires CMHC insurance and adds a premium below 20% down", () => {
    const result = financing(federal, { price: 500000, dpPct: 10, amortYears: 25 });
    expect(result.insured).toBe(true);
    expect(result.premium).toBeGreaterThan(0);
    expect(result.loan).toBeCloseTo(result.baseLoan + result.premium, 5);
  });

  it("does not allow insurance at or above the insured price cap", () => {
    const result = financing(federal, { price: 2000000, dpPct: 10, amortYears: 25 });
    expect(result.insured).toBe(false);
  });

  it("surcharges the premium rate for amortizations over 25 years", () => {
    const short = financing(federal, { price: 500000, dpPct: 10, amortYears: 25 });
    const long = financing(federal, { price: 500000, dpPct: 10, amortYears: 30 });
    expect(long.premRate).toBeGreaterThan(short.premRate);
  });
});

describe("buildLines", () => {
  const winnipeg = getJurisdiction("winnipeg")!;
  const toronto = getJurisdiction("toronto")!;

  it("omits a non-applicable line item entirely rather than rendering it as zero", () => {
    // Winnipeg has no premiumTax, so no li_premTax line should ever appear.
    const lines = buildLines(winnipeg, federal, {
      price: 500000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house", elsewhere: false,
    });
    expect(lines.gov.some((l) => l.key === "li_premTax")).toBe(false);
  });

  it("includes a premium-tax line only when the jurisdiction has one and CMHC premium is charged", () => {
    const lines = buildLines(toronto, federal, {
      price: 500000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house", elsewhere: false,
    });
    expect(lines.gov.some((l) => l.key === "li_premTax")).toBe(true);
  });

  it("skips Toronto's municipal LTT line when elsewhere-in-Ontario is selected", () => {
    const lines = buildLines(toronto, federal, {
      price: 500000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house", elsewhere: true,
    });
    expect(lines.gov.some((l) => l.key === "li_lttMuni")).toBe(false);
  });

  it("only adds a condo status-certificate fee line for condo purchases", () => {
    const house = buildLines(toronto, federal, {
      price: 500000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house", elsewhere: false,
    });
    const condo = buildLines(toronto, federal, {
      price: 500000, dpPct: 20, amortYears: 25, ftb: true, ptype: "condo", elsewhere: false,
    });
    expect(house.pro.some((l) => l.key === "li_statusCert")).toBe(false);
    expect(condo.pro.some((l) => l.key === "li_statusCert")).toBe(true);
  });
});

describe("credits", () => {
  const toronto = getJurisdiction("toronto")!;

  it("caps a rebate at the line item's rule cap when the raw tax exceeds it", () => {
    const input = { price: 2000000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false };
    const lines = buildLines(toronto, federal, input);
    const result = credits(toronto, federal, input, lines.gov);
    const provRebate = result.atClosing.find((c) => c.key === "cr_lttRebateProv")!;
    expect(provRebate.st).toBe("capped");
    expect(provRebate.amount).toBeCloseTo(4000, 5);
  });

  it("marks a rebate ftbOnly when the buyer is not a first-time buyer", () => {
    const input = { price: 500000, dpPct: 20, amortYears: 25, ftb: false, ptype: "house" as const, elsewhere: false };
    const lines = buildLines(toronto, federal, input);
    const result = credits(toronto, federal, input, lines.gov);
    expect(result.atClosing.every((c) => c.st === "ftbOnly")).toBe(true);
  });

  it("phases out Vancouver's exempt-band PTT rebate above the partial threshold", () => {
    const vancouver = getJurisdiction("vancouver")!;
    const input = { price: 900000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false };
    const lines = buildLines(vancouver, federal, input);
    const result = credits(vancouver, federal, input, lines.gov);
    const pttRebate = result.atClosing.find((c) => c.key === "cr_pttExempt")!;
    expect(pttRebate.st).toBe("phasedOut");
    expect(pttRebate.amount).toBe(0);
  });
});

describe("closingTotal", () => {
  it("returns cash equal to down payment plus total closing costs", () => {
    const winnipeg = getJurisdiction("winnipeg")!;
    const result = closingTotal(winnipeg, federal, {
      price: 400000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house", elsewhere: false,
    });
    expect(result.cash).toBeCloseTo(result.fin.down + result.total, 5);
  });

  it("returns net cash at or below cash (credits never make it more expensive)", () => {
    const toronto = getJurisdiction("toronto")!;
    const result = closingTotal(toronto, federal, {
      price: 500000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house", elsewhere: false,
    });
    expect(result.net).toBeLessThanOrEqual(result.cash);
  });
});

import { affordability } from "./engine";

describe("affordability", () => {
  const winnipeg = getJurisdiction("winnipeg")!;

  const baseInput = {
    income1: 70000,
    income2: 50000,
    otherIncome: 0,
    haircut: 0,
    debts: 300,
    amortYears: 25,
    comfortCeiling: 2800,
    insuranceAnnual: 1400,
    utilities: 200,
    condoFee: 0,
    contractRate: 4.29,
    price: 450000,
    dpPct: 10,
    ftb: true,
    ptype: "house" as const,
    elsewhere: false,
  };

  it("returns a positive ceiling and comfort figure for a plausible household", () => {
    const result = affordability(winnipeg, federal, baseInput);
    expect(result.ceiling).toBeGreaterThan(0);
    expect(result.comfort).toBeGreaterThan(0);
  });

  it("increases the qualification ceiling as qualifying income rises", () => {
    const low = affordability(winnipeg, federal, { ...baseInput, income1: 50000, income2: 0 });
    const high = affordability(winnipeg, federal, { ...baseInput, income1: 90000, income2: 60000 });
    expect(high.ceiling).toBeGreaterThan(low.ceiling);
  });

  it("increases the comfort ceiling as the household's comfort budget rises", () => {
    const tight = affordability(winnipeg, federal, { ...baseInput, comfortCeiling: 2000 });
    const roomy = affordability(winnipeg, federal, { ...baseInput, comfortCeiling: 4000 });
    expect(roomy.comfort).toBeGreaterThan(tight.comfort);
  });

  it("fails approval when the target price exceeds the qualification ceiling", () => {
    const result = affordability(winnipeg, federal, { ...baseInput, income1: 30000, income2: 0, price: 900000 });
    expect(result.approvalPass).toBe(false);
  });

  it("passes the comfort check when total monthly cost is at or below the comfort ceiling", () => {
    const result = affordability(winnipeg, federal, { ...baseInput, price: 200000, dpPct: 20 });
    expect(result.comfortPass).toBe(result.monthly.total <= baseInput.comfortCeiling);
  });

  it("returns zero income-based figures when qualifying income is zero", () => {
    const result = affordability(winnipeg, federal, { ...baseInput, income1: 0, income2: 0, otherIncome: 0 });
    expect(result.ceiling).toBe(0);
    expect(result.gdsAtTarget).toBe(0);
    expect(result.tdsAtTarget).toBe(0);
  });

  it("builds the monthly total from its own components", () => {
    const result = affordability(winnipeg, federal, baseInput);
    const { pi, propTax, insurance, utilities, condoFee, maintenance, total } = result.monthly;
    expect(total).toBeCloseTo(pi + propTax + insurance + utilities + condoFee + maintenance, 5);
  });

  it("produces a different ceiling in a jurisdiction with materially different transfer-tax rules", () => {
    // The ceiling differs between Toronto and Winnipeg because their property tax rates differ
    // sharply: Toronto's j.propTax is 0.00752 vs Winnipeg's 0.0132 — nearly double. Since
    // ceiling's denominator includes propTax (0.8*fq + propTax/12), the lower Toronto rate
    // produces a higher ceiling for the same income. The cc.total (closing costs) also differs
    // because Toronto stacks provincial + municipal LTT (with a rebate cap) on top of an 8%
    // premium tax on CMHC premiums; Winnipeg has neither. Same household, same price — both
    // differences compound to make the jurisdictions diverge significantly.
    const toronto = getJurisdiction("toronto")!;
    const winnipegResult = affordability(winnipeg, federal, baseInput);
    const torontoResult = affordability(toronto, federal, baseInput);
    expect(torontoResult.ceiling).not.toBeCloseTo(winnipegResult.ceiling, 0);
    expect(torontoResult.cc.total).toBeGreaterThan(winnipegResult.cc.total);
  });
});
