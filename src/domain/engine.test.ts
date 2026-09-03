import { describe, expect, it } from "vitest";
import {
  affordability,
  applies,
  bracketTax,
  buildLines,
  closingTotal,
  credits,
  defaultContractRate,
  financedFraction,
  financing,
  maxAmortYears,
  minDown,
  money,
  payFactor,
  scenario,
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
    expect(minDown(federal, 400000)).toBeCloseTo(20000, 5);
  });

  it("requires 5% on the first $500,000 plus 10% above it, between $500,000 and $1,500,000", () => {
    expect(minDown(federal, 600000)).toBeCloseTo(25000 + 10000, 5);
  });

  it("requires a flat 20% at or above $1,500,000", () => {
    expect(minDown(federal, 1500000)).toBeCloseTo(300000, 5);
    expect(minDown(federal, 2000000)).toBeCloseTo(400000, 5);
  });

  it("reads its tiers off federal.minDown rather than literals in the function", () => {
    // The point of the move: a page component captioned the rule with its own copy of
    // 500000, and nothing could keep the two in step. Feeding a different table has to
    // change the answer, or the literals are still in here somewhere.
    const shifted = { ...federal, minDown: { bands: [[400000, 0.05], [null, 0.1]] as const, uninsuredRate: 0.2 } };
    expect(minDown(shifted, 500000)).toBeCloseTo(20000 + 10000, 5);
  });

  it("steps to the flat rate exactly where mortgage insurance stops being available", () => {
    // Not a coincidence and not two independent constants: 20% is required at the insured
    // cap BECAUSE no insurer writes the loan there.
    const at = federal.cmhc.insuredCap;
    expect(minDown(federal, at)).toBeCloseTo(at * federal.minDown.uninsuredRate, 5);
    expect(minDown(federal, at - 1)).toBeLessThan(minDown(federal, at));
  });
});

describe("maxAmortYears", () => {
  const base = { dpPct: 10, price: 600000, ftb: false, ptype: "house" as const };

  it("holds an insured repeat buyer of a resale home to the shorter maximum", () => {
    expect(maxAmortYears(federal, base)).toBe(federal.maxAmortOther);
  });

  it("allows 30 years to a first-time buyer", () => {
    expect(maxAmortYears(federal, { ...base, ftb: true })).toBe(federal.maxAmortFtbInsured);
  });

  it("allows 30 years on a new build even to a repeat buyer", () => {
    // CMHC Home Start is first-time buyer OR new build. Dropping the second half would deny
    // a 30-year amortization to someone entitled to it.
    expect(maxAmortYears(federal, { ...base, ptype: "newbuild" })).toBe(federal.maxAmortFtbInsured);
  });

  it("allows 30 years at 20% down, where no insured maximum binds", () => {
    expect(maxAmortYears(federal, { ...base, dpPct: 20 })).toBe(federal.maxAmortFtbInsured);
  });

  it("allows 30 years at or above the insured cap, where insurance is unavailable", () => {
    expect(maxAmortYears(federal, { ...base, price: federal.cmhc.insuredCap })).toBe(
      federal.maxAmortFtbInsured,
    );
  });

  it("only ever returns the shorter maximum on a loan that is actually insured", () => {
    // maxAmortOther is conf "medium" and its own note scopes it to INSURED loans, so the
    // copy around it must not say "in Canada". This pins that the 25 is unreachable for an
    // uninsured borrower, which is what makes the scoped sentence true.
    for (const price of [300000, 900000, 1_499_999]) {
      for (const dpPct of [5, 10, 19]) {
        expect(maxAmortYears(federal, { dpPct, price, ftb: false, ptype: "house" })).toBe(
          federal.maxAmortOther,
        );
      }
    }
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

  it("treats overPrice as a STRICTLY-above bound", () => {
    // Exclusive because the statutes needing it are written that way: BC levies its further 2%
    // on residential value "over $3,000,000", so the charge does not exist at exactly $3M.
    expect(applies({ overPrice: 500000 }, o)).toBe(false);
    expect(unmetBy({ overPrice: 500000 }, o)).toEqual(["overPrice"]);
    expect(applies({ overPrice: 499999 }, o)).toBe(true);
    expect(applies({ overPrice: 500001 }, o)).toBe(false);
  });

  it("reports overPrice alongside the other unmet keys, not instead of them", () => {
    expect(unmetBy({ ftb: false, overPrice: 900000 }, o).sort()).toEqual(["ftb", "overPrice"]);
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

  it("supersedes nothing when every member of the group is worth zero", () => {
    // Both bands are long past their phase-out, so neither programme beat the other — they
    // both expired. `reduce` still names a winner among equals, and marking the rest
    // "superseded" told the buyer a rebate was passed over for a better one that does not
    // exist. Each row must keep the status that explains its own zero.
    const bothExpired: Jurisdiction = {
      ...getJurisdiction("vancouver")!,
      rebates: [
        { key: "cr_a", kind: "exemptBand", full: 100000, partial: 200000, capBase: 100000, on: "li_ptt", timing: "closing", group: "bcPtt" },
        { key: "cr_b", kind: "exemptBand", full: 150000, partial: 250000, capBase: 150000, on: "li_ptt", timing: "closing", group: "bcPtt" },
      ],
    };
    const o = { ...base, price: 900000 };
    const C = credits(bothExpired, federal, o, buildLines(bothExpired, federal, o).gov);
    expect(C.atClosing.map((c) => c.amount)).toEqual([0, 0]);
    expect(C.atClosing.map((c) => c.st)).toEqual(["phasedOut", "phasedOut"]);
  });

  it("leaves ungrouped rebates alone", () => {
    const toronto = getJurisdiction("toronto")!;
    const C = credits(toronto, federal, base, buildLines(toronto, federal, base).gov);
    const nonZero = C.atClosing.filter((c) => c.amount > 0);
    expect(nonZero.length).toBeGreaterThan(1);
  });

  it("keeps an exact-tie rebate visible, zeroed and marked tied, rather than dropping it", () => {
    // Both members of the group genuinely tie: same cap, same target line, so the same raw
    // amount is capped to the same figure. Dropping the loser used to tell the buyer only one
    // programme applied; the fix keeps the row so the buyer can see both they qualified for.
    const tiedGroup: Jurisdiction = {
      ...getJurisdiction("vancouver")!,
      rebates: [
        { key: "cr_a", kind: "cap", cap: 5000, on: "li_ptt", timing: "closing", group: "bcPtt" },
        { key: "cr_b", kind: "cap", cap: 5000, on: "li_ptt", timing: "closing", group: "bcPtt" },
      ],
    };
    const o = { ...base, price: 900000 };
    const C = credits(tiedGroup, federal, o, buildLines(tiedGroup, federal, o).gov);
    const a = C.atClosing.find((c) => c.key === "cr_a")!;
    const b = C.atClosing.find((c) => c.key === "cr_b")!;
    expect(a).toBeDefined();
    expect(b).toBeDefined();
    expect(a.amount).toBeGreaterThan(0);
    expect(b.amount).toBe(0);
    expect(b.st).toBe("tied");
    // Not double-counted: the group's relief is worth exactly what one member pays.
    expect(a.amount + b.amount).toBe(a.amount);
  });

  it("ties BC's first-time-buyer and newly-built PTT exemptions at $500,000, as documented in credits()", () => {
    // Both fully exempt the tax on a first-time buyer's new build at or under $500,000: the
    // first-time-buyer exemption is computed on the first $500,000 of the same tax, so there
    // is nothing above it left to differ.
    const vancouver = getJurisdiction("vancouver")!;
    const o = { ...base, price: 500000, ptype: "newbuild" as const };
    const C = credits(vancouver, federal, o, buildLines(vancouver, federal, o).gov);
    const rows = C.atClosing.filter((c) => c.group === "bcPtt");
    expect(rows).toHaveLength(2);
    expect(rows.filter((c) => c.amount > 0)).toHaveLength(1);
    expect(rows.some((c) => c.st === "tied")).toBe(true);
  });

  it("does not relabel a zero-amount ftbOnly row when a sibling in the group pays", () => {
    // A non-first-time buyer of a $600,000 Vancouver new build: cr_pttNewBuild applies in
    // full (no ftb test), cr_pttExempt fails ONLY the ftb test and is emitted at $0 with
    // st "ftbOnly". `best.amount > 0` here — cr_pttNewBuild pays — so the old code walked
    // into the per-row relabelling loop and overwrote cr_pttExempt's "ftbOnly" with
    // "superseded", which renders as "You qualify for this" against a programme the buyer
    // failed on its own terms.
    const vancouver = getJurisdiction("vancouver")!;
    const o = { ...base, price: 600000, ftb: false, ptype: "newbuild" as const };
    const C = credits(vancouver, federal, o, buildLines(vancouver, federal, o).gov);
    const exempt = C.atClosing.find((c) => c.key === "cr_pttExempt")!;
    const newBuild = C.atClosing.find((c) => c.key === "cr_pttNewBuild")!;
    expect(exempt.st).toBe("ftbOnly");
    expect(exempt.amount).toBe(0);
    expect(newBuild.st).toBe("applied");
    expect(newBuild.amount).toBeGreaterThan(0);
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
    // ISC Land Title Fees Table (effective 2026-04-15), Registration of Mortgage, by "Interest
    // Valued At": "$0 to $249,999.99" is $200.00 and "$250,000 to $500,000" is a flat $275.00.
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

  it("puts the $500,000 edge INSIDE the $275 band, as ISC's schedule writes it", () => {
    // $500,000 is not an edge case invented by the model: it is a $625,000 purchase at 20%
    // down. The schedule reads "$250,000 to $500,000 — $275.00" and "$500,000.01 to $750,000
    // — $525.00", so the round dollar belongs to the LOWER band and the jump happens at the
    // cent. Only the first band ("$0 to $249,999.99") is written exclusively, which is why
    // one ceiling here carries .99 and the rest do not — the mixed convention is the
    // document's, not a slip in this record. Yukon's tariff is written "less than $X"
    // throughout and its ceilings are .99 throughout; the two must not be made to match.
    expect(mortReg({ ...base, price: 625000, dpPct: 20 })).toBe(275); // loan 500,000.00
    expect(mortReg({ ...base, price: 625000.05, dpPct: 20 })).toBe(525); // loan 500,000.04
    expect(mortReg({ ...base, price: 937500, dpPct: 20 })).toBe(525); // loan 750,000.00
    expect(mortReg({ ...base, price: 1250000, dpPct: 20 })).toBe(775); // loan 1,000,000.00
    // ...and the one ceiling that IS exclusive behaves that way.
    expect(mortReg({ ...base, price: 312499.9875, dpPct: 20 })).toBe(200); // loan 249,999.99
    expect(mortReg({ ...base, price: 312500, dpPct: 20 })).toBe(275); // loan 250,000.00
  });

  it("sends a value in the schedule's one-cent gap to the HIGHER band", () => {
    // ISC leaves a cent unnamed between "$0 to $249,999.99" and "$250,000 to $500,000".
    // `buildLines` takes the first step whose ceiling the value does not exceed, so half a
    // cent above $249,999.99 fails that band and falls through to $275 — the higher fee, not
    // the lower one. Unreachable on a real loan, and pinned only because the provenance note
    // describes this behaviour verbatim on /sources and once described it backwards.
    expect(mortReg({ ...base, price: 312499.99375, dpPct: 20 })).toBe(275); // loan 249,999.995
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

describe("affordability — a bigger down payment must buy a bigger house", () => {
  /**
   * The invariant that was missing, and its absence is why the bug shipped: nothing
   * pinned either ceiling against the down payment, so a change that inverted the
   * relationship left 1381 tests green.
   *
   * Both ceilings used a hardcoded `0.8` — a flat 20%-down assumption — while
   * `defaultContractRate` correctly moved the rate with the down payment (insured below
   * 20%, uninsured at or above it). A 5% buyer therefore got the cheaper insured rate
   * applied to an 80% mortgage, carrying neither the extra debt nor the CMHC premium, and
   * the page told them that putting LESS down let them afford MORE. In Winnipeg over 30
   * years it reported $398,313 at 5% against $389,015 at 25%.
   *
   * Asserted as a direction rather than against figures, so it survives a rate, premium
   * or property-tax revision — the thing that must never come back is the sign.
   */
  const winnipeg = getJurisdiction("winnipeg")!;
  const rung = (dpPct: number) => {
    const o = {
      price: 454264, dpPct, amortYears: 30, ftb: true, ptype: "newbuild" as const,
      elsewhere: false, residency: "resident" as const,
      contractRate: defaultContractRate(federal, dpPct),
      income1: 100000, income2: 30000, otherIncome: 0, haircut: 0, debts: 10,
      comfortCeiling: 2700, insuranceAnnual: 1500, utilities: 300, condoFee: 0,
    };
    return affordability(winnipeg, federal, o);
  };

  const LADDER = [5, 10, 15, 20, 25, 35] as const;

  it("raises the comfort price at every step up the down payment ladder", () => {
    const prices = LADDER.map((dp) => rung(dp).comfort);
    for (let i = 1; i < prices.length; i++) {
      expect(prices[i], `${LADDER[i]}% must beat ${LADDER[i - 1]}%`).toBeGreaterThan(prices[i - 1]);
    }
  });

  it("raises the lender ceiling at every step too", () => {
    const ceilings = LADDER.map((dp) => rung(dp).ceiling);
    for (let i = 1; i < ceilings.length; i++) {
      expect(ceilings[i], `${LADDER[i]}% must beat ${LADDER[i - 1]}%`).toBeGreaterThan(ceilings[i - 1]);
    }
  });

  it("crosses the 20% rate boundary without the ranking flipping", () => {
    // The exact place it broke: 19% takes the insured rate and a premium, 20% takes the
    // uninsured rate and none. A cheaper rate on a bigger loan must still lose.
    expect(rung(20).comfort).toBeGreaterThan(rung(19).comfort);
    expect(rung(20).ceiling).toBeGreaterThan(rung(19).ceiling);
  });

  it("counts the CMHC premium as debt below 20% and not at or above it", () => {
    expect(financedFraction(federal, 5, 25)).toBeGreaterThan(0.95);
    expect(financedFraction(federal, 20, 25)).toBe(0.8);
    expect(financedFraction(federal, 25, 25)).toBe(0.75);
  });

  it("charges the long-amortization surcharge on a 30-year insured loan", () => {
    expect(financedFraction(federal, 5, 30)).toBeGreaterThan(financedFraction(federal, 5, 25));
  });
});

describe("the lender's condo-fee convention is a rule, not a literal", () => {
  const j = getJurisdiction("toronto")!;
  const base = {
    income1: 100000, income2: 0, otherIncome: 0, haircut: 0, debts: 0,
    amortYears: 25, comfortCeiling: 3000, insuranceAnnual: 1500, utilities: 300,
    condoFee: 600, contractRate: 4.24, price: 700000, dpPct: 20, ftb: true,
    ptype: "condo" as const, elsewhere: false, residency: "resident" as const,
  };

  it("counts the federal share of the fee in GDS at the target price", () => {
    // Half in the lender's ratios, the whole fee in the household's budget: two correct
    // answers to two different questions, on the same screen, which is exactly why the
    // share is now a named rule with a CMHC citation rather than a `* 0.5` in the maths.
    const withFee = affordability(j, federal, base);
    const without = affordability(j, federal, { ...base, condoFee: 0 });
    const gdsDelta = ((withFee.gdsAtTarget - without.gdsAtTarget) / 100) * (base.income1 / 12);
    expect(gdsDelta).toBeCloseTo(base.condoFee * federal.condoFeeInclusion, 6);
  });

  it("moves the lender ceiling when the published share changes", () => {
    const whole = { ...federal, condoFeeInclusion: 1 };
    expect(affordability(j, whole, base).ceiling).toBeLessThan(
      affordability(j, federal, base).ceiling,
    );
  });

  it("still charges the household the WHOLE fee in the monthly total", () => {
    expect(affordability(j, federal, base).monthly.condoFee).toBe(base.condoFee);
  });
});

describe("affordability and scenario finance the same mortgage", () => {
  /**
   * The two screens answer different questions — one solves for a price, the other prices a
   * fixed one — but they must not disagree about what a down payment buys. C1's defect was
   * exactly a divergence of this kind: the ceiling was solved on a flat 80% LTV while the
   * GDS gauge one row below used the real loan, so the verdict dot and the bar beneath it
   * contradicted each other in the default state.
   */
  const j = getJurisdiction("toronto")!;
  const LADDER = [5, 10, 15, 20, 25, 35] as const;
  const price = 800000;

  it("gives financedFraction the same answer financing() reaches with a real price", () => {
    for (const dpPct of LADDER) {
      const fin = financing(federal, { price, dpPct, amortYears: 25 });
      expect(financedFraction(federal, dpPct, 25), `${dpPct}%`).toBeCloseTo(fin.loan / price, 9);
    }
  });

  it("shrinks the scenario mortgage at every step up the ladder", () => {
    const loans = LADDER.map(
      (dpPct) =>
        scenario(j, federal, {
          price, dpPct, amortYears: 25, ftb: true, ptype: "house" as const,
          elsewhere: false, residency: "resident" as const,
          insuranceAnnual: 1500, utilities: 300, condoFee: 0, comfortCeiling: 3200,
          qualIncome: 150000, debts: 0, funds: null, save: null,
        }).totalMortgage,
    );
    for (let i = 1; i < loans.length; i++) {
      expect(loans[i], `${LADDER[i]}% must borrow less than ${LADDER[i - 1]}%`).toBeLessThan(
        loans[i - 1],
      );
    }
  });
});

describe("the GST rebate no longer refunds a tax this app never charges", () => {
  const j = getJurisdiction("calgary")!;
  const o: ClosingInput = {
    price: 700000, dpPct: 20, amortYears: 25, ftb: true,
    ptype: "newbuild", elsewhere: false, residency: "resident",
  };

  it("pays no cr_gstFthb into the later credits", () => {
    const lines = buildLines(j, federal, o);
    const c = credits(j, federal, o, lines.gov);
    expect(c.later.some((l) => l.key === "cr_gstFthb")).toBe(false);
  });

  it("reports it as a named omission instead, so the page can say so in words", () => {
    const lines = buildLines(j, federal, o);
    const c = credits(j, federal, o, lines.gov);
    expect(c.omitted.map((x) => x.key)).toContain("cr_gstFthb");
    expect(c.omitted.find((x) => x.key === "cr_gstFthb")!.ex).toBe("ex_gstFthb");
  });

  it("says nothing about a purchase the programme does not reach", () => {
    const resale = { ...o, ptype: "house" as const };
    const lines = buildLines(j, federal, resale);
    expect(credits(j, federal, resale, lines.gov).omitted).toHaveLength(0);
    const repeat = { ...o, ftb: false };
    const lines2 = buildLines(j, federal, repeat);
    expect(credits(j, federal, repeat, lines2.gov).omitted).toHaveLength(0);
  });

  it("stops at the phase-out, because above it the programme does not apply", () => {
    // The page renders this list under "Applies here, and not priced". Above
    // `gstFthb.zeroAt` the rebate is nil, so the eyebrow asserted applicability over
    // a paragraph saying the opposite — and it did so on DEFAULT settings in the two
    // most expensive markets, where `benchmarkPrice()` resolves a new build to the
    // resale house benchmark: Vancouver $1,822,900 and Toronto $1,455,200 against a
    // $1,500,000 cut-off. The superseded money implementation had this test as
    // `amt > 0`; reporting an omission changed what travels, not whether it applies.
    const above = { ...o, price: federal.gstFthb.zeroAt };
    expect(credits(j, federal, above, buildLines(j, federal, above).gov).omitted).toHaveLength(0);
    const below = { ...o, price: federal.gstFthb.zeroAt - 1 };
    expect(credits(j, federal, below, buildLines(j, federal, below).gov).omitted).toHaveLength(1);
  });

  it("is reachable at the Vancouver benchmark only below that price", () => {
    const vancouver = getJurisdiction("vancouver")!;
    expect(vancouver.bench.house!).toBeGreaterThan(federal.gstFthb.zeroAt);
    const benchmark = { ...o, price: vancouver.bench.house! };
    expect(
      credits(vancouver, federal, benchmark, buildLines(vancouver, federal, benchmark).gov).omitted,
    ).toHaveLength(0);
  });
});

describe("Montreal's condo status certificate", () => {
  const montreal = getJurisdiction("montreal")!;
  const condo: ClosingInput = {
    price: 500000, dpPct: 20, amortYears: 25, ftb: true,
    ptype: "condo", elsewhere: false, residency: "resident",
  };

  it("carries no statusCert figure at all, rather than a falsy zero", () => {
    expect(montreal.fees.statusCert).toBeUndefined();
  });

  it("emits no dead provenance entry for a fee the record does not carry", () => {
    expect(montreal.provenance["fees.statusCert"]).toBeUndefined();
  });

  it("would render a genuine zero rather than dropping the line", () => {
    // The half that makes the gate a fix and not a swap: `!= null` means a record that
    // really does charge nothing shows a $0 line instead of vanishing.
    const zeroed = { ...montreal, fees: { ...montreal.fees, statusCert: 0 } };
    const lines = buildLines(zeroed, federal, condo);
    expect(lines.pro.find((l) => l.key === "li_statusCert")?.amount).toBe(0);
  });
});
