import { describe, expect, it } from "vitest";
import { buildLines, credits } from "../engine";
import { federal } from "../federal";
import { getJurisdiction } from "./index";

const van = () => getJurisdiction("vancouver")!;

const base = {
  dpPct: 20,
  amortYears: 25,
  ftb: false,
  ptype: "house" as const,
  elsewhere: false,
  residency: "resident" as const,
};

/** The exemption row the engine emits for a purchase, or undefined if the row is absent. */
function rebate(key: string, o: Parameters<typeof buildLines>[2]) {
  const j = van();
  return credits(j, federal, o, buildLines(j, federal, o).gov).atClosing.find((c) => c.key === key);
}

describe("BC newly-built-home exemption", () => {
  it("exempts a non-first-time buyer of a new build below $1.1M", () => {
    // NOT first-time-buyer restricted — that is the whole point of the programme, and the
    // reason it could not be modelled before `Applicability` existed. Up to $19,000 of tax
    // the app previously told a Vancouver new-build buyer they owed.
    const o = { ...base, price: 1050000, ftb: false, ptype: "newbuild" as const };
    const r = rebate("cr_pttNewBuild", o);
    expect(r?.st).toBe("applied");
    expect(r?.amount).toBeGreaterThan(18000);
  });

  it("does not offer it on a resale purchase", () => {
    const o = { ...base, price: 1050000, ftb: false, ptype: "house" as const };
    expect(rebate("cr_pttNewBuild", o)).toBeUndefined();
  });

  it("never stacks the two BC exemptions", () => {
    const o = { ...base, price: 800000, ftb: true, ptype: "newbuild" as const };
    const j = van();
    const C = credits(j, federal, o, buildLines(j, federal, o).gov);
    const applied = C.atClosing.filter((c) => c.group === "bcPtt" && c.amount > 0);
    expect(applied).toHaveLength(1);
    // The larger of the two wins: the newly-built exemption forgives the whole tax on
    // $800,000 ($14,000), the first-time-buyer one only the tax on the first $500,000 ($8,000).
    expect(applied[0].key).toBe("cr_pttNewBuild");
    expect(applied[0].amount).toBeCloseTo(14000, 2);
    expect(C.atClosing.find((c) => c.key === "cr_pttExempt")?.st).toBe("superseded");
  });

  // gov.bc.ca publishes the phase-out as a table of exemption amounts, dollar by dollar. These
  // three rows are read straight off it, and they are what fixes `capBase` at $1,150,000: the
  // reduction is proportional to the tax on the ACTUAL fair market value, not to the tax on the
  // $1,100,000 threshold. A capBase of $1,100,000 would under-exempt by up to ~$420.
  it.each([
    [1100000, 20000],
    [1101000, 19619.6],
    [1125000, 10250],
  ])("matches the published exemption amount at $%d", (price, exemption) => {
    const o = { ...base, price, ptype: "newbuild" as const };
    expect(rebate("cr_pttNewBuild", o)?.amount).toBeCloseTo(exemption, 2);
  });

  it("is gone at the top of the phase-out band", () => {
    // One dollar below the ceiling the published table still gives $419.60; at the ceiling it
    // gives nothing.
    const inBand = { ...base, price: 1149000, ptype: "newbuild" as const };
    expect(rebate("cr_pttNewBuild", inBand)?.amount).toBeCloseTo(419.6, 2);
    const atCeiling = { ...base, price: 1150000, ptype: "newbuild" as const };
    expect(rebate("cr_pttNewBuild", atCeiling)?.amount).toBe(0);
  });

  it("supersedes neither exemption once both have expired", () => {
    // At $1,150,000 a first-time buyer of a new build gets nothing from either programme: the
    // first-time-buyer band ended at $860,000 and the newly-built one runs out exactly here.
    // Neither passed the other over, so neither may be labelled "superseded" — that label is
    // rendered as a sentence telling the buyer another rebate paid more, and here none did.
    const o = { ...base, price: 1150000, ftb: true, ptype: "newbuild" as const };
    const j = van();
    const C = credits(j, federal, o, buildLines(j, federal, o).gov);
    const bcPtt = C.atClosing.filter((c) => c.group === "bcPtt");
    expect(bcPtt).toHaveLength(2);
    expect(bcPtt.map((c) => c.amount)).toEqual([0, 0]);
    expect(bcPtt.map((c) => c.st)).not.toContain("superseded");
    expect(C.atClosing.find((c) => c.key === "cr_pttExempt")?.st).toBe("phasedOut");
  });
});

describe("BC first-time-buyer exemption", () => {
  // Confirmed against gov.bc.ca, effective 2024-04-01, and left exactly as shipped. Pinned here
  // so a later edit has to argue with the programme page rather than with nothing.
  it("keeps the verified 2024-04-01 thresholds", () => {
    const r = van().rebates.find((x) => x.key === "cr_pttExempt");
    expect(r).toMatchObject({ kind: "exemptBand", full: 835000, partial: 860000, capBase: 500000 });
  });
});

describe("BC property transfer tax structure", () => {
  it("levies the further 2% above $3M as its own line", () => {
    // In law the 5% is not a bracket: it is the general 3% plus a separate further 2% on the
    // residential portion above $3M. Same arithmetic for a wholly residential property, but the
    // flat bracket could not express a mixed-class one or name the two levies separately.
    const o = { ...base, price: 4000000 };
    const gov = buildLines(van(), federal, o).gov;
    expect(gov.find((l) => l.key === "li_pttFurther")?.amount).toBeCloseTo(20000, 2);
  });

  it("charges the same total as the flat 5% schedule it replaced", () => {
    // The split is a STRUCTURE fix, not a value fix. If this ever changes, the number moved.
    const o = { ...base, price: 4000000 };
    const gov = buildLines(van(), federal, o).gov;
    const ptt = gov
      .filter((l) => l.key === "li_ptt" || l.key === "li_pttFurther")
      .reduce((t, l) => t + l.amount, 0);
    expect(ptt).toBeCloseTo(118000, 2);
  });

  it("omits the further-2% line entirely below $3M, rather than showing it at zero", () => {
    // Not `amount === 0`: buildLines' documented convention is that a non-applicable line is
    // ABSENT, never a zero row. The line's zero-rated first band makes it compute $0 below the
    // threshold, so without `when: { overPrice }` the Closing Costs page carried a
    // "Further 2% tax — $0" row for every BC buyer under $3M.
    const o = { ...base, price: 2500000 };
    const gov = buildLines(van(), federal, o).gov;
    expect(gov.find((l) => l.key === "li_pttFurther")).toBeUndefined();
    expect(gov.find((l) => l.key === "li_ptt")?.amount).toBeCloseTo(53000, 2);
  });

  it("omits it at exactly $3M — the statute says 'over $3,000,000'", () => {
    const gov = buildLines(van(), federal, { ...base, price: 3000000 }).gov;
    expect(gov.find((l) => l.key === "li_pttFurther")).toBeUndefined();
  });

  it("includes it one dollar above the threshold", () => {
    const gov = buildLines(van(), federal, { ...base, price: 3000001 }).gov;
    expect(gov.find((l) => l.key === "li_pttFurther")?.amount).toBeCloseTo(0.02, 2);
  });
});

describe("Vancouver market and carrying-cost figures", () => {
  it("uses the City's own 2026 Class 1 total levy against market value", () => {
    // BC Assessment values at market (Assessment Act ss.18-19), so unlike Ontario there is no
    // ratio to unwind: the published mill rate applies to price almost directly.
    const { effective, publishedRate, assessmentRatio, basis } = van().propTax;
    expect(publishedRate).toBeCloseTo(0.00336394, 8);
    expect(assessmentRatio).toBe(1);
    expect(basis).toBe("market");
    expect(effective).toBeCloseTo(publishedRate * assessmentRatio, 10);
  });

  it("carries the July 2026 Metro Vancouver benchmarks", () => {
    expect(van().bench).toEqual({ house: 1822900, condo: 688000 });
  });

  it("carries a year-over-year change on the scale the market actually moved", () => {
    // The placeholder said -0.5% against an actual -6.2% — the sign was right and the scale was
    // out by an order of magnitude, which is the failure mode a sign check would have missed.
    expect(van().yoy).toBeCloseTo(-0.062, 6);
    expect(van().rent).toBe(2364);
  });
});

describe("Vancouver tax-time credits", () => {
  it("values the federal Home Buyers' Amount at the lowest federal rate", () => {
    // $10,000 claim x 14% = $1,400. The $1,500 it replaced was the credit at a 15% lowest rate.
    expect(van().taxTime.find((c) => c.key === "cr_hba")?.amount).toBe(1400);
  });
});
