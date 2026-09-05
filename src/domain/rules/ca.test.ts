import { describe, expect, it } from "vitest";
import { ca } from "./ca";
import { CATALOGUE_ENTRIES } from "@/test/catalogues";

describe("ca rules data", () => {
  it("has GDS stricter than TDS, as Canadian lending rules require", () => {
    expect(ca.gds).toBeLessThan(ca.tds);
  });

  it("has CMHC bands sorted by ascending LTV threshold with ascending premium rates", () => {
    const bands = ca.cmhc.bands;
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i][0]).toBeGreaterThan(bands[i - 1][0]);
      expect(bands[i][1]).toBeGreaterThanOrEqual(bands[i - 1][1]);
    }
  });

  it("has a positive stress-test floor and buffer", () => {
    expect(ca.stressTest.floor).toBeGreaterThan(0);
    expect(ca.stressTest.buffer).toBeGreaterThan(0);
  });

  it("has every marginal tax table sorted by ascending income cap, ending in an open (null) bracket", () => {
    for (const [prov, table] of Object.entries(ca.marginal)) {
      const caps = table.map(([cap]) => cap);
      expect(caps[caps.length - 1], `${prov} last bracket should be open-ended`).toBeNull();
      const closedCaps = caps.filter((c): c is number => c !== null);
      for (let i = 1; i < closedCaps.length; i++) {
        expect(closedCaps[i]).toBeGreaterThan(closedCaps[i - 1]);
      }
    }
  });

  it("includes a CA fallback marginal table for provinces without their own", () => {
    expect(ca.marginal.CA).toBeDefined();
  });

  it("carries a Canadian term mortgage that renews", () => {
    expect(ca.mortgage).toEqual({ kind: "term", termYears: [1, 3, 5, 10], renews: true });
  });
});

/**
 * The 2026 verification pass. Every assertion below names a figure that was read off the
 * issuing authority on 2026-08-24 (or, where no authority publishes one, off a named
 * aggregator on a stated date). A test here is the only thing that stops a future edit from
 * quietly reverting a sourced figure to the prototype's placeholder.
 */
describe("ca rules — verified 2026 figures", () => {
  it("uses the 2026 Home Buyers' Amount, computed at the 14% lowest ca rate", () => {
    // $10,000 claim (CRA line 31270) x 14% (lowest ca bracket, 2026 and later) = $1,400.
    // NOT $1,500 — that is the 2025 figure, when the lowest rate was 15%/14.5%.
    expect(ca.hba).toBe(1400);
  });

  it("uses a real insured/uninsured spread, not the 10bp placeholder", () => {
    expect(ca.rates.insured).toBeCloseTo(0.0394, 6);
    expect(ca.rates.uninsured).toBeCloseTo(0.0424, 6);
    expect(ca.rates.uninsured - ca.rates.insured).toBeGreaterThan(0.002);
  });

  it("uses the Bank of Canada's own rate series where one exists", () => {
    expect(ca.rates.prime).toBeCloseTo(0.0445, 6);
    expect(ca.rates.variable).toBeCloseTo(0.0361, 6);
  });

  it("uses OSFI's minimum qualifying rate: the greater of 5.25% or contract + 2%", () => {
    expect(ca.stressTest).toEqual({ floor: 5.25, buffer: 2 });
  });

  it("uses CMHC's published homeowner premium schedule band for band", () => {
    expect(ca.cmhc.bands).toEqual([
      [0.65, 0.006],
      [0.75, 0.017],
      [0.8, 0.024],
      [0.85, 0.028],
      [0.9, 0.031],
      [0.95, 0.04],
    ]);
    expect(ca.cmhc.longAmortSurcharge).toBeCloseTo(0.002, 6);
    expect(ca.cmhc.insuredCap).toBe(1_500_000);
  });

  it("uses CMHC's debt service ceilings and amortization caps", () => {
    expect(ca.gds).toBe(39);
    expect(ca.tds).toBe(44);
    expect(ca.maxAmortFtbInsured).toBe(30);
    expect(ca.maxAmortOther).toBe(25);
  });

  it("counts half a condominium fee in the lender's ratios, as CMHC's guidance states", () => {
    // "If applicable, 50% of the condominium fees must be included in the GDS and TDS
    // calculations." Quoted, not inferred -- this was a bare `* 0.5` at four call sites in
    // the engine with no provenance entry, against the FULL fee in the comfort budget on
    // the same screen. Both are correct; they answer different questions.
    expect(ca.condoFeeInclusion).toBe(0.5);
  });

  it("carries the minimum down payment schedule as data, ending where insurance does", () => {
    expect(ca.minDown.bands).toEqual([[500_000, 0.05], [null, 0.1]]);
    expect(ca.minDown.uninsuredRate).toBe(0.2);
    // The flat 20% starts exactly where mortgage insurance stops being available. Two
    // fields, one boundary -- if they ever disagree, one of them has been edited alone.
    expect(ca.cmhc.insuredCap).toBe(1_500_000);
  });

  it("keeps the non-shelter inflation figure ABOVE the general inflation it is not", () => {
    // Deliberately not equal to appreciation.inflation, and deliberately not changed by the
    // review that surfaced it: services have run ahead of headline CPI, and whether to align
    // the two is an owner's product call. What the review DID fix is that the figure is now
    // on the record with provenance, so /sources can disclose it -- as a module
    // constant in engine.ts it compounded for forty years where nothing could see it.
    expect(ca.nonShelterInflation).toBe(0.03);
    expect(ca.nonShelterInflation).toBeGreaterThan(ca.appreciation.inflation);
  });

  it("uses CRA's 2026 registered-plan figures", () => {
    expect(ca.rrspCap).toBe(33_810);
    expect(ca.fhsa).toEqual({ annual: 8_000, lifetime: 40_000 });
    expect(ca.hbp.max).toBe(60_000);
    expect(ca.hbp.repayYears).toBe(15);
    expect(ca.capGainsInclusion).toBe(0.5);
  });

  it("uses CRA's actual 89-day HBP contribution-deductibility window, not the industry's 90-day rounding", () => {
    // CRA, confirmed against canada.ca: "If you made contributions to your RRSPs during the
    // 89-day period before you withdrew the amount for your HBP withdrawal, your RRSP
    // contribution may not be deductible." See the provenance note on "hbp.ruleDays" for the
    // full quote and what the rule actually restricts (deductibility, not withdrawal).
    expect(ca.hbp.ruleDays).toBe(89);
  });

  it("uses the First-Time Home Buyers' GST rebate as legislated", () => {
    expect(ca.gstFthb).toEqual({
      rate: 0.05,
      fullTo: 1_000_000,
      zeroAt: 1_500_000,
      cap: 50_000,
    });
  });

  it("matches FP Canada's 2026 projection assumptions where it borrows one", () => {
    expect(ca.appreciation.inflation).toBeCloseTo(0.021, 6);
    expect(ca.appreciation.shelter).toBeCloseTo(0.031, 6);
    expect(ca.investReturn.cash).toBeCloseTo(0.024, 6);
  });

  it("carries the date of this verification pass", () => {
    expect(ca.verified).toBe("2026-08-24");
  });
});

describe("ca provenance — the 2026 pass", () => {
  // Enumerated, not inferred: a literal cannot be asked what it used to be, so the only way
  // to stop a figure shipping bare is to name it here.
  const REQUIRED = [
    "cmhc.bands",
    "cmhc.longAmortSurcharge",
    "cmhc.insuredCap",
    "minDown.bands",
    "minDown.uninsuredRate",
    "condoFeeInclusion",
    "nonShelterInflation",
    "stressTest.floor",
    "stressTest.buffer",
    "gds",
    "tds",
    "heatAllowance",
    "rates.insured",
    "rates.uninsured",
    "rates.variable",
    "rates.prime",
    "maxAmortFtbInsured",
    "maxAmortOther",
    "fhsa.annual",
    "fhsa.lifetime",
    "hbp.max",
    "hbp.repayYears",
    "hbp.graceYears",
    "hbp.ruleDays",
    "rrspCap",
    "capGainsInclusion",
    "marginal",
    "sellingCost",
    "maintenanceReserve",
    "appreciation.inflation",
    "appreciation.shelter",
    "appreciation.flat",
    "investReturn.cash",
    "investReturn.balanced",
    "investReturn.growth",
    "savingsReturn",
    "gstFthb.rate",
    "gstFthb.fullTo",
    "gstFthb.zeroAt",
    "gstFthb.cap",
    "hba",
    "contractRate",
  ];

  it.each(REQUIRED)("annotates %s", (path) => {
    expect(ca.provenance[path], `ca.${path} has no provenance`).toBeDefined();
  });

  it("names a source and a date for every figure it claims high or medium confidence in", () => {
    for (const [path, p] of Object.entries(ca.provenance)) {
      if (p?.conf !== "high" && p?.conf !== "medium") continue;
      expect(p.src, `ca.${path} claims ${p.conf} with no source`).toBeTruthy();
      expect(p.asOf, `ca.${path} claims ${p.conf} with no date`).toBeTruthy();
    }
  });

  it("keeps the contract rates at medium — no authority publishes a 5-year fixed rate", () => {
    for (const path of ["rates.insured", "rates.uninsured"]) {
      expect(ca.provenance[path]?.conf, path).toBe("medium");
      expect(ca.provenance[path]?.note, path).toBeTruthy();
    }
  });
});

/**
 * `Metadata.rrspHbp.description` hardcodes "wait {N} days" as prose, once per locale — there is
 * no interpolation binding it to `ca.hbp.ruleDays` the way the RRSP-HBP page's own copy
 * does (`RrspHbp.step3` etc. read `{d}` from `play.ruleDays`). This is what actually keeps the
 * two from disagreeing again: not the metadata string's shape, but this test, which fails the
 * day either one moves without the other.
 */
describe("Metadata.rrspHbp.description names ca.hbp.ruleDays", () => {
  it.each(CATALOGUE_ENTRIES)("in %s", (_locale, catalogue) => {
    const description = (catalogue as { Metadata: { rrspHbp: { description: string } } }).Metadata
      .rrspHbp.description;
    expect(description).toContain(String(ca.hbp.ruleDays));
  });
});
