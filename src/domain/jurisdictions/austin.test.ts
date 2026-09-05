import { describe, expect, it } from "vitest";
import { austin } from "./austin";
import { TX_TITLE_INSURANCE_BRACKETS } from "./houston";
import { bracketTax, buildLines, closingTotal, credits, propertyTaxAnnual, rentComparable } from "../engine";
import { us } from "../rules/us";

describe("austin — Texas title insurance schedule (same state schedule as Houston)", () => {
  it("reproduces the research dossier's $2,015 example on a $350,000 policy", () => {
    // (350,000 - 100,000) x 0.00494 + 780 = 1,235 + 780 = 2,015 — the SAME Texas-wide TDI
    // schedule Houston's own test reproduces (dossier B3, Phase 0 verdict: inherited, not
    // re-researched for Austin).
    const { total } = bracketTax(350000, TX_TITLE_INSURANCE_BRACKETS);
    expect(total).toBeCloseTo(2015, 2);
  });

  it("charges the buyer only the flat $100 simultaneous-issue lender's policy, not the full schedule", () => {
    // Texas custom: the SELLER pays the owner's policy. fees.titleIns is what the BUYER
    // actually pays at closing — carried forward from Houston's record unchanged (Phase 0).
    expect(austin.fees.titleIns).toBe(100);
  });
});

describe("austin — no transfer tax, empty government charges group", () => {
  it("carries an empty transfer array", () => {
    expect(austin.transfer).toEqual([]);
  });

  it("buildLines() degrades to an empty gov group with no crash and no phantom row", () => {
    const lines = buildLines(austin, us, {
      price: 577000,
      dpPct: 10,
      amortYears: 30,
      ftb: true,
      ptype: "house",
      elsewhere: false,
      residency: "resident",
    });
    expect(lines.gov).toEqual([]);
  });

  it("credits() reports no rebates, with an explanation for why", () => {
    const input = {
      price: 577000,
      dpPct: 10,
      amortYears: 30,
      ftb: true,
      ptype: "house" as const,
      elsewhere: false,
      residency: "resident" as const,
    };
    const lines = buildLines(austin, us, input);
    const c = credits(austin, us, input, lines.gov);
    expect(c.atClosing).toEqual([]);
    expect(c.later).toEqual([]);
    expect(c.omitted).toEqual([{ key: "cr_noRebateUs", ex: "ex_noRebateUs" }]);
  });

  it("closingTotal() runs cleanly end to end with no government charges", () => {
    const result = closingTotal(austin, us, {
      price: 577000,
      dpPct: 10,
      amortYears: 30,
      ftb: true,
      ptype: "house",
      elsewhere: false,
      residency: "resident",
    });
    expect(result.total).toBeGreaterThan(0);
    expect(Number.isFinite(result.net)).toBe(true);
  });
});

describe("austin — property tax after all five confirmed homestead exemptions", () => {
  it("matches an independently hand-derived figure at the City of Austin median ($577,000)", () => {
    // Every one of the five taxing entities' local-option exemption is confirmed at `high`
    // (dossier C10, TCAD's own 2026 Exemption Listing Report) — unlike Houston, where four of
    // five entities' exemption status could not be confirmed at all. Computed BY HAND below,
    // independent of propertyTaxAnnual()'s own formula, so this test cannot pass merely because
    // the implementation agrees with itself:
    //
    //   AISD:           (577,000 - 140,000) x 0.009252   = 437,000 x 0.009252   = 4,043.124
    //   City of Austin: (577,000 x (1 - 0.20)) x 0.00524017 = 461,600 x 0.00524017 = 2,418.862472
    //   Travis County:  (577,000 x (1 - 0.20)) x 0.00375845 = 461,600 x 0.00375845 = 1,734.900520
    //   Central Health: (577,000 x (1 - 0.20)) x 0.00118023 = 461,600 x 0.00118023 =   544.794168
    //   ACC:            (577,000 x (1 - 0.01)) x 0.001034   = 571,230 x 0.001034   =   590.651820
    //
    //   Sum (unrounded, matching how propertyTaxAnnual() actually adds floats, with no
    //   intermediate per-line rounding): 4,043.124 + 2,418.862472 + 1,734.900520 + 544.794168
    //   + 590.651820 = 9,332.332980, i.e. $9,332.33 to the cent.
    //
    //   (The research dossier's own C4 table states $9,332.34 — one cent higher — because it
    //   summed each line ALREADY ROUNDED to the cent (...12 + ...87 + ...90 + ...80 + ...65 =
    //   9,332.34) rather than the unrounded float total. Both are "correct" under different
    //   rounding conventions; propertyTaxAnnual() does not round per line, so $9,332.33 —
    //   not the dossier's $9,332.34 — is the figure this engine actually produces, and the one
    //   this test holds it to.)
    expect(propertyTaxAnnual(austin, 577000)).toBeCloseTo(9332.33, 2);
  });

  it("the five exemptions' appliesToRate values exactly cover the combined rate", () => {
    // Unlike Houston (one confirmed entity of five, a real unexempted remainder), every one of
    // Austin's five entities is confirmed — so summing every exemption's own slice reproduces
    // the FULL combined nominal rate with nothing left over.
    const covered = austin.propTax.exemptions!.reduce((sum, ex) => sum + ex.appliesToRate, 0);
    expect(covered).toBeCloseTo(austin.propTax.effective, 10);
  });

  it("charges less than the full nominal rate at the benchmark price", () => {
    const price = austin.bench.house!;
    const full = price * austin.propTax.effective;
    const actual = propertyTaxAnnual(austin, price);
    expect(actual).toBeLessThan(full);
  });

  it("never produces a negative tax, even at a price below several exemption amounts", () => {
    const tiny = propertyTaxAnnual(austin, 50000);
    expect(tiny).toBeGreaterThanOrEqual(0);
  });

  it("stays linear in price above every exemption's own $5,000 statutory floor", () => {
    // ACC's 1% exemption is the tightest floor in this record: pct x price stops exceeding the
    // $5,000 floor below a $500,000 price. Below every exemption's own floor threshold the
    // formula is only PIECEWISE linear (see propertyTaxAnnual()'s own doc comment) — so this
    // invariant is checked only at and above that floor, unlike Houston's equivalent test, which
    // is linear everywhere because its single flat exemption has no floor at all.
    const a = propertyTaxAnnual(austin, 500000);
    const b = propertyTaxAnnual(austin, 900000);
    const midpoint = propertyTaxAnnual(austin, 700000);
    expect(midpoint).toBeCloseTo((a + b) / 2, 6);
  });
});

describe("austin — country and region", () => {
  it("prices under the US rules, state Texas", () => {
    expect(austin.country).toBe("us");
    if (austin.country === "us") expect(austin.state).toBe("TX");
  });

  it("closes through a title company, not a lawyer or notary", () => {
    expect(austin.pro).toBe("titleCompany");
  });
});

describe("austin — rent basis (HUD FMR, not a CMHC apartment average)", () => {
  it("treats the FMR as comparable to a condo, not a detached house", () => {
    expect(rentComparable(austin, "condo")).toBe(true);
    expect(rentComparable(austin, "house")).toBe(false);
  });
});
