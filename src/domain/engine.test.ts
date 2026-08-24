import { describe, expect, it } from "vitest";
import {
  affordability,
  applies,
  bracketTax,
  buildLines,
  closingTotal,
  credits,
  defaultContractRate,
  financing,
  minDown,
  money,
  payFactor,
  unmetBy,
  type ClosingInput,
} from "./engine";
import { federal } from "./federal";
import { getJurisdiction } from "./jurisdictions";
import type { Jurisdiction } from "./types";

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

describe("applies / unmetBy", () => {
  const o = {
    price: 500000, dpPct: 10, amortYears: 25,
    ftb: true, ptype: "house", elsewhere: false, residency: "resident",
  } as const satisfies ClosingInput;

  it("applies when there is no predicate at all", () => {
    expect(applies(undefined, o)).toBe(true);
    expect(unmetBy(undefined, o)).toEqual([]);
  });

  it("ignores keys the predicate does not mention", () => {
    expect(applies({ ptype: "house" }, o)).toBe(true);
  });

  it("fails on a key whose value differs", () => {
    expect(applies({ ptype: "newbuild" }, o)).toBe(false);
    expect(unmetBy({ ptype: "newbuild" }, o)).toEqual(["ptype"]);
  });

  it("reports every unmet key, not just the first", () => {
    expect(unmetBy({ ftb: false, ptype: "condo" }, o).sort()).toEqual(["ftb", "ptype"]);
  });

  it("matches a false predicate against a false input", () => {
    expect(applies({ elsewhere: false }, o)).toBe(true);
  });
});

describe("buildLines", () => {
  const winnipeg = getJurisdiction("winnipeg")!;
  const toronto = getJurisdiction("toronto")!;

  it("omits a non-applicable line item entirely rather than rendering it as zero", () => {
    // Winnipeg has no premiumTax, so no li_premTax line should ever appear.
    const lines = buildLines(winnipeg, federal, {
      price: 500000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house", elsewhere: false, residency: "resident" as const,
    });
    expect(lines.gov.some((l) => l.key === "li_premTax")).toBe(false);
  });

  it("includes a premium-tax line only when the jurisdiction has one and CMHC premium is charged", () => {
    const lines = buildLines(toronto, federal, {
      price: 500000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house", elsewhere: false, residency: "resident" as const,
    });
    expect(lines.gov.some((l) => l.key === "li_premTax")).toBe(true);
  });

  it("skips Toronto's municipal LTT line when elsewhere-in-Ontario is selected", () => {
    const lines = buildLines(toronto, federal, {
      price: 500000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house", elsewhere: true, residency: "resident" as const,
    });
    expect(lines.gov.some((l) => l.key === "li_lttMuni")).toBe(false);
  });

  // The counterpart to the Toronto skip above: `elsewhere` is an Ontario-only rule, carried on
  // Toronto's own line as `when: { elsewhere: false }`. Every other province's municipal line
  // must survive the toggle, which is what stops the skip being generalised back into buildLines.
  it("keeps a municipal line outside Ontario when elsewhere-in-Ontario is selected", () => {
    const halifax = getJurisdiction("halifax")!;
    const lines = buildLines(halifax, federal, {
      price: 500000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house", elsewhere: true, residency: "resident",
    });
    expect(lines.gov.some((l) => l.key === "li_deedMuni")).toBe(true);
  });

  it("only adds a condo status-certificate fee line for condo purchases", () => {
    const house = buildLines(toronto, federal, {
      price: 500000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house", elsewhere: false, residency: "resident" as const,
    });
    const condo = buildLines(toronto, federal, {
      price: 500000, dpPct: 20, amortYears: 25, ftb: true, ptype: "condo", elsewhere: false, residency: "resident" as const,
    });
    expect(house.pro.some((l) => l.key === "li_statusCert")).toBe(false);
    expect(condo.pro.some((l) => l.key === "li_statusCert")).toBe(true);
  });
});

/**
 * A plain resident first-time buyer at a mid-market price. Shared by the rebate suites below
 * so each one varies only the fact it is about.
 */
const base = {
  price: 500000, dpPct: 20, amortYears: 25,
  ftb: true, ptype: "house", elsewhere: false, residency: "resident",
} as const satisfies ClosingInput;

describe("credits", () => {
  const toronto = getJurisdiction("toronto")!;

  it("caps a rebate at the line item's rule cap when the raw tax exceeds it", () => {
    const input = { price: 2000000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false, residency: "resident" as const };
    const lines = buildLines(toronto, federal, input);
    const result = credits(toronto, federal, input, lines.gov);
    const provRebate = result.atClosing.find((c) => c.key === "cr_lttRebateProv")!;
    expect(provRebate.st).toBe("capped");
    expect(provRebate.amount).toBeCloseTo(4000, 5);
  });

  it("marks a rebate ftbOnly when the buyer is not a first-time buyer", () => {
    const input = { price: 500000, dpPct: 20, amortYears: 25, ftb: false, ptype: "house" as const, elsewhere: false, residency: "resident" as const };
    const lines = buildLines(toronto, federal, input);
    const result = credits(toronto, federal, input, lines.gov);
    // Toronto has 2 rebates (provincial + municipal) and elsewhere is false, so both transfer
    // lines exist and both rebates resolve to a row — this assertion would pass vacuously on an
    // empty array without the length check.
    expect(result.atClosing).toHaveLength(2);
    expect(result.atClosing.every((c) => c.st === "ftbOnly")).toBe(true);
  });

  it("phases out Vancouver's exempt-band PTT rebate above the partial threshold", () => {
    const vancouver = getJurisdiction("vancouver")!;
    const input = { price: 900000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false, residency: "resident" as const };
    const lines = buildLines(vancouver, federal, input);
    const result = credits(vancouver, federal, input, lines.gov);
    const pttRebate = result.atClosing.find((c) => c.key === "cr_pttExempt")!;
    expect(pttRebate.st).toBe("phasedOut");
    expect(pttRebate.amount).toBe(0);
  });

  // Vancouver's exemptBand rebate: full = 835000, partial = 860000, capBase = 500000. The full
  // rebate amount is the PTT on a $500,000 home under Vancouver's brackets ([200000, 0.01],
  // [2000000, 0.02], ...) = 200000*0.01 + 300000*0.02 = 8000.
  const FULL_REBATE = 8000;

  it("fully applies Vancouver's exempt-band PTT rebate at or below the full threshold", () => {
    const vancouver = getJurisdiction("vancouver")!;
    const input = { price: 800000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false, residency: "resident" as const };
    const lines = buildLines(vancouver, federal, input);
    const result = credits(vancouver, federal, input, lines.gov);
    const pttRebate = result.atClosing.find((c) => c.key === "cr_pttExempt")!;
    expect(pttRebate.st).toBe("applied");
    expect(pttRebate.amount).toBeCloseTo(FULL_REBATE, 5);
  });

  it("linearly interpolates Vancouver's exempt-band PTT rebate strictly between the full and partial thresholds", () => {
    const vancouver = getJurisdiction("vancouver")!;
    // 840000 is strictly between full (835000) and partial (860000).
    const input = { price: 840000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false, residency: "resident" as const };
    const lines = buildLines(vancouver, federal, input);
    const result = credits(vancouver, federal, input, lines.gov);
    const pttRebate = result.atClosing.find((c) => c.key === "cr_pttExempt")!;
    expect(pttRebate.st).toBe("capped");
    expect(pttRebate.amount).toBeGreaterThan(0);
    expect(pttRebate.amount).toBeLessThan(FULL_REBATE);
  });

  it("halves Vancouver's exempt-band rebate at the exact midpoint of the phase-out band (linearity check)", () => {
    const vancouver = getJurisdiction("vancouver")!;
    // Midpoint of [835000, 860000] is 847500.
    const input = { price: 847500, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false, residency: "resident" as const };
    const lines = buildLines(vancouver, federal, input);
    const result = credits(vancouver, federal, input, lines.gov);
    const pttRebate = result.atClosing.find((c) => c.key === "cr_pttExempt")!;
    expect(pttRebate.st).toBe("capped");
    expect(pttRebate.amount).toBeCloseTo(FULL_REBATE / 2, 1);
  });

  // The phantom-rebate regression. With elsewhere=true the municipal LTT line is skipped, so
  // gov becomes [li_lttProv, li_premTax] and a positional lookup of `on: 1` lands on the
  // premium-tax line — granting a municipal rebate that does not exist. Unreachable from the
  // Phase 1 UI (no `elsewhere` control), reachable the moment Closing Costs ships one.
  it("grants no municipal rebate when the municipal line is absent (buying elsewhere in Ontario)", () => {
    const input = { price: 500000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: true, residency: "resident" as const };
    const lines = buildLines(toronto, federal, input);
    const result = credits(toronto, federal, input, lines.gov);
    expect(lines.gov.map((l) => l.key)).toEqual(["li_lttProv", "li_premTax"]);
    expect(result.atClosing.some((c) => c.key === "cr_lttRebateMuni")).toBe(false);
  });

  it("counts only the provincial rebate at closing when buying elsewhere in Ontario", () => {
    const input = { price: 500000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: true, residency: "resident" as const };
    // Ontario LTT on $500,000 is $6,475, above the $4,000 cap, so the provincial rebate is
    // exactly the cap and nothing else may be added to it.
    expect(closingTotal(toronto, federal, input).creditsAtClosing).toBeCloseTo(4000, 5);
  });

  it("resolves each rebate to its own transfer line, not to whatever sits at that index", () => {
    const input = { price: 500000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false, residency: "resident" as const };
    const lines = buildLines(toronto, federal, input);
    const result = credits(toronto, federal, input, lines.gov);
    expect(result.atClosing.find((c) => c.key === "cr_lttRebateProv")!.target).toBe("li_lttProv");
    expect(result.atClosing.find((c) => c.key === "cr_lttRebateMuni")!.target).toBe("li_lttMuni");
  });

  // buildLines only skips a municipal-tier line under `elsewhere` when j.prov === "ON" (Toronto).
  // Halifax's only rebate targets its municipal line (li_deedMuni, tier: "municipal") with
  // kind: "none" — the row the UI uses to say "no such programme here". If the ON-only guard
  // were ever loosened to cover every province, Halifax's municipal line would vanish under
  // elsewhere: true and this rebate would silently disappear instead of rendering as unavailable.
  it("still emits Halifax's municipal-tier rebate row under elsewhere: true (not an Ontario-only line)", () => {
    const halifax = getJurisdiction("halifax")!;
    const input = { price: 500000, dpPct: 20, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: true, residency: "resident" as const };
    const lines = buildLines(halifax, federal, input);
    const result = credits(halifax, federal, input, lines.gov);
    expect(result.atClosing.some((c) => c.key === "cr_lttRebateProv")).toBe(true);
  });
});

describe("credits — Applicability", () => {
  it("emits an ftbOnly row when the buyer fails only the ftb test", () => {
    const toronto = getJurisdiction("toronto")!;
    const o = { ...base, ftb: false };
    const L = buildLines(toronto, federal, o);
    const C = credits(toronto, federal, o, L.gov);
    const prov = C.atClosing.find((c) => c.key === "cr_lttRebateProv");
    expect(prov?.st).toBe("ftbOnly");
    expect(prov?.amount).toBe(0);
  });

  it("drops a rebate entirely when it fails a non-ftb test", () => {
    // A rebate gated on ptype is absent for the wrong ptype, not a zero row — matching
    // buildLines' convention. Uses a synthetic jurisdiction so the test does not depend on
    // which real rebates happen to be gated today.
    const j: Jurisdiction = {
      ...getJurisdiction("calgary")!,
      rebates: [{
        key: "cr_test", kind: "cap", cap: 1000, on: "li_titleReg",
        timing: "closing", when: { ptype: "newbuild" },
      }],
    };
    const o = { ...base, ptype: "house" as const };
    const C = credits(j, federal, o, buildLines(j, federal, o).gov);
    expect(C.atClosing.find((c) => c.key === "cr_test")).toBeUndefined();
  });

  it("applies a ptype-gated rebate to a non-first-time buyer", () => {
    // The BC newly-built case: not first-time-buyer restricted. Before this task the
    // blanket !o.ftb short-circuit made it unreachable.
    const j: Jurisdiction = {
      ...getJurisdiction("calgary")!,
      rebates: [{
        key: "cr_test", kind: "cap", cap: 1000, on: "li_titleReg",
        timing: "closing", when: { ptype: "newbuild" },
      }],
    };
    const o = { ...base, ftb: false, ptype: "newbuild" as const };
    const C = credits(j, federal, o, buildLines(j, federal, o).gov);
    expect(C.atClosing.find((c) => c.key === "cr_test")?.st).toBe("applied");
  });

  it("omits a ptype-gated tax-time credit for the wrong property type", () => {
    const j: Jurisdiction = {
      ...getJurisdiction("halifax")!,
      taxTime: [{ key: "cr_test", amount: 3000, when: { ptype: "newbuild" } }],
    };
    const resale = credits(j, federal, { ...base, ptype: "house" }, buildLines(j, federal, base).gov);
    expect(resale.later.find((c) => c.key === "cr_test")).toBeUndefined();

    const o = { ...base, ptype: "newbuild" as const };
    const newbuild = credits(j, federal, o, buildLines(j, federal, o).gov);
    expect(newbuild.later.find((c) => c.key === "cr_test")?.amount).toBe(3000);
  });
});

describe("credits — timing", () => {
  const withTiming = (timing: "closing" | "taxTime"): Jurisdiction => ({
    ...getJurisdiction("toronto")!,
    rebates: [{ key: "cr_test", kind: "cap", cap: 1000, on: "li_lttProv", timing, when: { ftb: true } }],
  });

  it("puts a closing-timed rebate in atClosing and counts it against cash", () => {
    const j = withTiming("closing");
    const C = credits(j, federal, base, buildLines(j, federal, base).gov);
    expect(C.atClosing.find((c) => c.key === "cr_test")?.amount).toBe(1000);
    expect(C.later.find((c) => c.key === "cr_test")).toBeUndefined();
  });

  it("puts a taxTime-timed rebate in later, not atClosing", () => {
    const j = withTiming("taxTime");
    const C = credits(j, federal, base, buildLines(j, federal, base).gov);
    expect(C.atClosing.find((c) => c.key === "cr_test")).toBeUndefined();
    expect(C.later.find((c) => c.key === "cr_test")?.amount).toBe(1000);
  });

  it("does not reduce cash at closing for a taxTime rebate", () => {
    const j = withTiming("taxTime");
    const o = { ...base, price: 600000 };
    expect(closingTotal(j, federal, o).creditsAtClosing).toBe(0);
  });
});

describe("credits — mutually exclusive rebate groups", () => {
  const twoInAGroup: Jurisdiction = {
    ...getJurisdiction("vancouver")!,
    rebates: [
      { key: "cr_small", kind: "cap", cap: 1000, on: "li_ptt", timing: "closing", group: "bcPtt" },
      { key: "cr_big", kind: "cap", cap: 9000, on: "li_ptt", timing: "closing", group: "bcPtt" },
    ],
  };

  it("keeps only the largest rebate in a group", () => {
    const o = { ...base, price: 900000 };
    const C = credits(twoInAGroup, federal, o, buildLines(twoInAGroup, federal, o).gov);
    expect(C.atClosing.find((c) => c.key === "cr_big")?.amount).toBe(9000);
    expect(C.atClosing.find((c) => c.key === "cr_small")?.amount).toBe(0);
  });

  it("marks the losing rebate superseded rather than dropping it", () => {
    const o = { ...base, price: 900000 };
    const C = credits(twoInAGroup, federal, o, buildLines(twoInAGroup, federal, o).gov);
    expect(C.atClosing.find((c) => c.key === "cr_small")?.st).toBe("superseded");
  });

  it("leaves ungrouped rebates alone", () => {
    const toronto = getJurisdiction("toronto")!;
    const C = credits(toronto, federal, base, buildLines(toronto, federal, base).gov);
    const nonZero = C.atClosing.filter((c) => c.amount > 0);
    expect(nonZero.length).toBeGreaterThan(1);
  });
});

describe("closingTotal", () => {
  it("returns cash equal to down payment plus total closing costs", () => {
    const winnipeg = getJurisdiction("winnipeg")!;
    const result = closingTotal(winnipeg, federal, {
      price: 400000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house", elsewhere: false, residency: "resident" as const,
    });
    expect(result.cash).toBeCloseTo(result.fin.down + result.total, 5);
  });

  it("returns net cash at or below cash (credits never make it more expensive)", () => {
    const toronto = getJurisdiction("toronto")!;
    const result = closingTotal(toronto, federal, {
      price: 500000, dpPct: 10, amortYears: 25, ftb: true, ptype: "house", elsewhere: false, residency: "resident" as const,
    });
    expect(result.net).toBeLessThanOrEqual(result.cash);
  });
});

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
    elsewhere: false, residency: "resident" as const,
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
    // Asserted against a literal, not against the implementation's own
    // expression: `comfortPass === (monthly.total <= comfortCeiling)` restated
    // the formula and could not fail whatever the engine did.
    const cheap = affordability(winnipeg, federal, { ...baseInput, price: 200000, dpPct: 20 });
    expect(cheap.monthly.total).toBeLessThan(baseInput.comfortCeiling);
    expect(cheap.comfortPass).toBe(true);
  });

  it("fails the comfort check when the total blows past the ceiling", () => {
    const dear = affordability(winnipeg, federal, { ...baseInput, price: 1200000, dpPct: 20 });
    expect(dear.monthly.total).toBeGreaterThan(baseInput.comfortCeiling);
    expect(dear.comfortPass).toBe(false);
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
    // sharply: Toronto's j.propTax.effective is 0.00752 vs Winnipeg's 0.0132 — nearly double. Since
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

describe("defaultContractRate", () => {
  // contractRate is NOT an input in the reference — it is derived from the down
  // payment against the federal insured/uninsured spread. The port dropped this
  // and hardcoded 4.29, which left federal.rates.insured/.uninsured unread by
  // any screen.
  it("uses the insured rate below 20% down", () => {
    expect(defaultContractRate(federal, 10)).toBeCloseTo(federal.rates.insured * 100, 10);
    expect(defaultContractRate(federal, 19.99)).toBeCloseTo(federal.rates.insured * 100, 10);
  });
  it("uses the uninsured rate at 20% down and above", () => {
    expect(defaultContractRate(federal, 20)).toBeCloseTo(federal.rates.uninsured * 100, 10);
    expect(defaultContractRate(federal, 25)).toBeCloseTo(federal.rates.uninsured * 100, 10);
  });
});

describe("affordability cash and debt-cost outputs", () => {
  const winnipeg = getJurisdiction("winnipeg")!;
  const base = {
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
    elsewhere: false, residency: "resident" as const,
  };

  it("reports cashGap as null when funds are unknown", () => {
    // "Not told" is not "told zero": a 0 here would fabricate a shortfall equal
    // to the entire cash requirement and drive the verdict from it.
    const r = affordability(winnipeg, federal, { ...base, funds: null, save: null });
    expect(r.cashGap).toBeNull();
    expect(r.monthsToClose).toBeNull();
  });

  it("treats an omitted funds figure the same as an explicit null", () => {
    expect(affordability(winnipeg, federal, base).cashGap).toBeNull();
  });

  it("reports cashGap as funds minus net cash at closing", () => {
    const r = affordability(winnipeg, federal, { ...base, funds: 50000, save: 1200 });
    expect(r.cashGap).toBeCloseTo(50000 - r.cc.net, 6);
  });

  it("reports months to close, rounded up", () => {
    const needed = affordability(winnipeg, federal, base).cc.net;
    const r = affordability(winnipeg, federal, { ...base, funds: needed - 2500, save: 1000 });
    expect(r.monthsToClose).toBe(3);
  });

  it("reports zero months when the funds already cover it", () => {
    const needed = affordability(winnipeg, federal, base).cc.net;
    const r = affordability(winnipeg, federal, { ...base, funds: needed + 1, save: 1000 });
    expect(r.monthsToClose).toBe(0);
  });

  it("reports months as null when nothing is being saved", () => {
    const r = affordability(winnipeg, federal, { ...base, funds: 1000, save: 0 });
    expect(r.monthsToClose).toBeNull();
  });

  it("prices debt as the ceiling it actually costs", () => {
    // The most behaviour-changing number on the page: what monthly obligations
    // remove from the lender's ceiling. Asserted against the ceiling the same
    // household reaches with NO debt -- an independent derivation, rather than
    // restating `debts * capacityPerDollar` back at the implementation.
    const free = affordability(winnipeg, federal, { ...base, debts: 0 });
    const owing = affordability(winnipeg, federal, { ...base, debts: 550 });
    expect(owing.debtCapacity).toBeCloseTo(free.ceiling - owing.ceiling, 4);
  });

  it("prices $100 of monthly obligation the same way", () => {
    const free = affordability(winnipeg, federal, { ...base, debts: 0 });
    const owing = affordability(winnipeg, federal, { ...base, debts: 100 });
    expect(free.capacityPer100).toBeCloseTo(free.ceiling - owing.ceiling, 4);
  });

  it("prices debt at zero when there is none", () => {
    expect(affordability(winnipeg, federal, { ...base, debts: 0 }).debtCapacity).toBe(0);
  });

  it("prices debt at zero while housing cost, not debt, is the constraint", () => {
    // A household whose GDS limit binds well before its TDS limit loses nothing
    // to a small obligation, and the screen must not claim otherwise. The
    // reference's `debts * capacityPerDollar` claims a five-figure loss here.
    const gdsBound = { ...base, income1: 300000, income2: 0, debts: 50 };
    const r = affordability(winnipeg, federal, gdsBound);
    expect(r.tdsBinds).toBe(false);
    expect(r.debtCapacity).toBe(0);
  });

  it("matches the marginal rate once total debt service is the constraint", () => {
    const heavy = { ...base, debts: 2000 };
    const r = affordability(winnipeg, federal, heavy);
    expect(r.tdsBinds).toBe(true);
    expect(r.capacityPer100).toBeCloseTo(100 * r.capacityPerDollar, 4);
  });
});

describe("credits — fullExempt ceilings", () => {
  const pe = () => getJurisdiction("pe")!;

  const withCeiling = (ceiling: number | null): Jurisdiction => ({
    ...pe(),
    rebates: [{
      key: "cr_pttExempt", kind: "fullExempt", ceiling,
      on: "li_lttProv", timing: "closing", when: { ftb: true },
    }],
  });

  const rebateAt = (j: Jurisdiction, price: number) => {
    const o = { ...base, price };
    return credits(j, federal, o, buildLines(j, federal, o).gov)
      .atClosing.find((c) => c.key === "cr_pttExempt");
  };

  it("applies in full at the ceiling", () => {
    const r = rebateAt(withCeiling(200000), 200000);
    expect(r?.st).toBe("applied");
    expect(r?.amount).toBeCloseTo(2000, 2); // 1% of 200,000
  });

  it("grants nothing one dollar above the ceiling — a cliff, not a taper", () => {
    const r = rebateAt(withCeiling(200000), 200001);
    expect(r?.st).toBe("overCeiling");
    expect(r?.amount).toBe(0);
  });

  it("applies at any price when the ceiling is null", () => {
    const r = rebateAt(withCeiling(null), 3000000);
    expect(r?.st).toBe("applied");
    expect(r?.amount).toBeCloseTo(30000, 2);
  });

  // Real Property Transfer Tax Act R.S.P.E.I. 1988 Cap. R-5.1, current to 2026-05-29, s.5(2):
  // the exemption turns on being a first-time buyer who files a declaration and intends to
  // occupy the property as a principal residence. No dollar threshold appears in the Act. The
  // prescribed-maximum regulation (General Regulations s.3) was REVOKED by EC428/16 in 2016.
  // Third-party calculators still recite the repealed $200,000 cap; the statute wins.
  it("records PEI's exemption as genuinely uncapped, explicitly", () => {
    const ceilings = pe().rebates.map((r) => (r.kind === "fullExempt" ? r.ceiling : "not-fullExempt"));
    expect(ceilings).toEqual([null]);
  });

  it("still exempts a PEI first-time buyer at PEI's own benchmark house price", () => {
    const o = { ...base, price: 388400 };
    const L = buildLines(pe(), federal, o);
    expect(L.gov.find((l) => l.key === "li_lttProv")?.amount).toBeCloseTo(3884, 2);
    expect(closingTotal(pe(), federal, o).creditsAtClosing).toBeCloseTo(3884, 2);
  });
});

describe("credits — tieredCap", () => {
  // Quebec's crédit d'impôt remboursable pour l'accès à la propriété, per the Ministère des
  // Finances technical bulletin: 100% of the first $5,000 of transfer duties, 25% of the next
  // $3,500 (an extra $875), maximum $5,875. The published Admissibilité section names no price
  // ceiling and no reduction — the curve is FLAT above the price where the cap is reached.
  const qcRebate = {
    key: "cr_qcAccess", kind: "tieredCap" as const,
    tiers: [[5000, 1], [null, 0.25]] as const,
    cap: 5875,
    on: "li_dutiesMuni", timing: "taxTime" as const, when: { ftb: true },
  };
  const qc = (): Jurisdiction => ({ ...getJurisdiction("montreal")!, rebates: [qcRebate] });

  const dutyAt = (j: Jurisdiction, price: number) =>
    buildLines(j, federal, { ...base, price }).gov.find((l) => l.key === "li_dutiesMuni")!.amount;

  const creditAt = (j: Jurisdiction, price: number) => {
    const o = { ...base, price };
    return credits(j, federal, o, buildLines(j, federal, o).gov)
      .later.find((c) => c.key === "cr_qcAccess")?.amount;
  };

  it("refunds all of a duty below the first tier ceiling", () => {
    const j = qc();
    const duty = dutyAt(j, 300000);
    expect(duty).toBeLessThan(5000);
    expect(creditAt(j, 300000)).toBeCloseTo(duty, 2);
  });

  it("refunds 100% of the first 5,000 plus 25% of the excess", () => {
    const j = qc();
    const duty = dutyAt(j, 500000);
    expect(duty).toBeGreaterThan(5000);
    const expected = 5000 + (duty - 5000) * 0.25;
    expect(expected).toBeLessThan(5875);
    expect(creditAt(j, 500000)).toBeCloseTo(expected, 2);
  });

  it("never exceeds the cap", () => {
    const j = qc();
    expect(dutyAt(j, 700000)).toBeGreaterThan(8500);
    expect(creditAt(j, 700000)).toBeCloseTo(5875, 2);
  });

  // The correction to the design: there is no linear phase-out. A million-dollar purchase and a
  // five-million-dollar one both receive the full $5,875, because the schedule runs on the DUTY
  // and stops at a cap, never taking anything back as the price climbs.
  it("keeps the full credit above the price where the cap is reached — no phase-out", () => {
    const j = qc();
    expect(creditAt(j, 750000)).toBeCloseTo(5875, 2);
    expect(creditAt(j, 1000000)).toBeCloseTo(5875, 2);
    expect(creditAt(j, 5000000)).toBeCloseTo(5875, 2);
  });

  // The bulletin's own worked example: a Laval buyer at $616,000 pays $9,091 of duties and
  // receives the full $5,875 (100% of 5,000 + 25% of 4,091 = 6,022.75, capped at 5,875).
  // Modelled with a fixed duty line so the example turns on the credit, not on which Quebec
  // municipality's threshold table is loaded.
  const laval = (): Jurisdiction => ({
    ...getJurisdiction("montreal")!,
    transfer: [{ key: "li_dutiesMuni", ex: "ex_lttMuni", tier: "municipal", kind: "fixed", amount: 9091 }],
    rebates: [qcRebate],
  });

  it("reproduces the bulletin's Laval example", () => {
    const j = laval();
    expect(dutyAt(j, 616000)).toBe(9091);
    expect(creditAt(j, 616000)).toBeCloseTo(5875, 2);
  });

  it("arrives at tax time, not at the closing table", () => {
    const j = laval();
    const o = { ...base, price: 616000 };
    const C = credits(j, federal, o, buildLines(j, federal, o).gov);
    expect(C.atClosing.find((c) => c.key === "cr_qcAccess")).toBeUndefined();
    expect(closingTotal(j, federal, o).creditsAtClosing).toBe(0);
  });

  it("marks the row capped when the cap binds and applied when it does not", () => {
    const closingTimed = (price: number) => {
      const j: Jurisdiction = {
        ...getJurisdiction("montreal")!,
        rebates: [{ ...qcRebate, timing: "closing" as const }],
      };
      const o = { ...base, price };
      return credits(j, federal, o, buildLines(j, federal, o).gov)
        .atClosing.find((c) => c.key === "cr_qcAccess");
    };
    expect(closingTimed(500000)?.st).toBe("applied");
    expect(closingTimed(700000)?.st).toBe("capped");
    expect(closingTimed(700000)?.cap).toBe(5875);
  });
});

describe("buildLines — perValue max", () => {
  const capped = (max?: number): Jurisdiction => ({
    ...getJurisdiction("nl")!,
    transfer: [{
      key: "li_titleReg", ex: "ex_titleReg", tier: "provincial", kind: "perValue",
      base: 100, per: 0.4, unit: 100, on: "price", exempt: 500, max,
    }],
  });

  it("caps the fee at max once the computed amount exceeds it", () => {
    const o = { ...base, price: 3000000 };
    expect(buildLines(capped(5000), federal, o).gov[0].amount).toBe(5000);
  });

  it("leaves the fee untouched below the cap", () => {
    const o = { ...base, price: 400000 };
    const uncapped = buildLines(capped(undefined), federal, o).gov[0].amount;
    expect(buildLines(capped(5000), federal, o).gov[0].amount).toBe(uncapped);
    expect(uncapped).toBeLessThan(5000);
  });

  it("still rounds each part-unit up, as the statute requires", () => {
    // "forty cents for each additional one hundred dollars OR PART OF ONE" — a $650 price is
    // $150 above the $500 exemption, which is two part-units, not 1.5.
    const o = { ...base, price: 650 };
    expect(buildLines(capped(5000), federal, o).gov[0].amount).toBeCloseTo(100 + 0.4 * 2, 6);
  });
});

describe("buildLines — stepped", () => {
  const sk = () => getJurisdiction("saskatoon")!;
  const mortReg = (o: ClosingInput) =>
    buildLines(sk(), federal, o).gov.find((l) => l.key === "li_mortReg")!.amount;

  it("charges a flat amount within a band, not a marginal rate", () => {
    // ISC Registration of Mortgage: $250,000–$500,000 is a flat $275.
    const a = mortReg({ ...base, price: 300000, dpPct: 20 }); // loan 240,000 -> $200 band
    const b = mortReg({ ...base, price: 400000, dpPct: 20 }); // loan 320,000 -> $275 band
    expect(a).toBe(200);
    expect(b).toBe(275);
  });

  it("uses the top open-ended step above the last ceiling", () => {
    expect(mortReg({ ...base, price: 2000000, dpPct: 20 })).toBe(1000);
  });

  it("steps on the loan, not the price", () => {
    // Same price, different down payment -> different loan -> different band.
    const heavyDown = mortReg({ ...base, price: 400000, dpPct: 50 }); // loan 200,000 -> $200
    const lightDown = mortReg({ ...base, price: 400000, dpPct: 20 }); // loan 320,000 -> $275
    expect(heavyDown).toBe(200);
    expect(lightDown).toBe(275);
  });

  it("is a step table, not a marginal one — the whole value pays one band's amount", () => {
    expect(sk().transfer.find((l) => l.key === "li_mortReg")!.kind).toBe("stepped");
    // A band edge is a jump, not an accumulation: at a loan of exactly $500,000 the whole fee
    // is $275; four dollars more and the whole fee is $525 — never $275 plus a marginal slice.
    expect(mortReg({ ...base, price: 625000, dpPct: 20 })).toBe(275); // loan 500,000
    expect(mortReg({ ...base, price: 625005, dpPct: 20 })).toBe(525); // loan 500,004
  });
});

describe("buildLines — NS non-resident deed transfer tax", () => {
  const halifax = () => getJurisdiction("halifax")!;
  const pdtt = (o: ClosingInput) =>
    buildLines(halifax(), federal, o).gov.find((l) => l.key === "li_deedProvNonRes");

  it("charges nothing to a resident buyer", () => {
    expect(pdtt({ ...base, residency: "resident" })).toBeUndefined();
  });

  it("charges 10% to a non-resident buyer", () => {
    const o = { ...base, price: 585000, residency: "nonResident" as const };
    expect(pdtt(o)?.amount).toBeCloseTo(58500, 2);
  });

  it("stacks on top of the municipal deed transfer tax", () => {
    const o = { ...base, price: 585000, residency: "nonResident" as const };
    const gov = buildLines(halifax(), federal, o).gov;
    expect(gov.find((l) => l.key === "li_deedMuni")?.amount).toBeCloseTo(8775, 2);
    expect(gov.find((l) => l.key === "li_deedProvNonRes")?.amount).toBeCloseTo(58500, 2);
  });
});
