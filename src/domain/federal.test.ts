import { describe, expect, it } from "vitest";
import { federal } from "./federal";

describe("federal rules data", () => {
  it("has GDS stricter than TDS, as Canadian lending rules require", () => {
    expect(federal.gds).toBeLessThan(federal.tds);
  });

  it("has CMHC bands sorted by ascending LTV threshold with ascending premium rates", () => {
    const bands = federal.cmhc.bands;
    for (let i = 1; i < bands.length; i++) {
      expect(bands[i][0]).toBeGreaterThan(bands[i - 1][0]);
      expect(bands[i][1]).toBeGreaterThanOrEqual(bands[i - 1][1]);
    }
  });

  it("has a positive stress-test floor and buffer", () => {
    expect(federal.stressTest.floor).toBeGreaterThan(0);
    expect(federal.stressTest.buffer).toBeGreaterThan(0);
  });

  it("has every marginal tax table sorted by ascending income cap, ending in an open (null) bracket", () => {
    for (const [prov, table] of Object.entries(federal.marginal)) {
      const caps = table.map(([cap]) => cap);
      expect(caps[caps.length - 1], `${prov} last bracket should be open-ended`).toBeNull();
      const closedCaps = caps.filter((c): c is number => c !== null);
      for (let i = 1; i < closedCaps.length; i++) {
        expect(closedCaps[i]).toBeGreaterThan(closedCaps[i - 1]);
      }
    }
  });

  it("includes a CA fallback marginal table for provinces without their own", () => {
    expect(federal.marginal.CA).toBeDefined();
  });
});

/**
 * The 2026 verification pass. Every assertion below names a figure that was read off the
 * issuing authority on 2026-08-24 (or, where no authority publishes one, off a named
 * aggregator on a stated date). A test here is the only thing that stops a future edit from
 * quietly reverting a sourced figure to the prototype's placeholder.
 */
describe("federal rules — verified 2026 figures", () => {
  it("uses the 2026 Home Buyers' Amount, computed at the 14% lowest federal rate", () => {
    // $10,000 claim (CRA line 31270) x 14% (lowest federal bracket, 2026 and later) = $1,400.
    // NOT $1,500 — that is the 2025 figure, when the lowest rate was 15%/14.5%.
    expect(federal.hba).toBe(1400);
  });

  it("uses a real insured/uninsured spread, not the 10bp placeholder", () => {
    expect(federal.rates.insured).toBeCloseTo(0.0394, 6);
    expect(federal.rates.uninsured).toBeCloseTo(0.0424, 6);
    expect(federal.rates.uninsured - federal.rates.insured).toBeGreaterThan(0.002);
  });

  it("uses the Bank of Canada's own rate series where one exists", () => {
    expect(federal.rates.prime).toBeCloseTo(0.0445, 6);
    expect(federal.rates.variable).toBeCloseTo(0.0361, 6);
  });

  it("uses OSFI's minimum qualifying rate: the greater of 5.25% or contract + 2%", () => {
    expect(federal.stressTest).toEqual({ floor: 5.25, buffer: 2 });
  });

  it("uses CMHC's published homeowner premium schedule band for band", () => {
    expect(federal.cmhc.bands).toEqual([
      [0.65, 0.006],
      [0.75, 0.017],
      [0.8, 0.024],
      [0.85, 0.028],
      [0.9, 0.031],
      [0.95, 0.04],
    ]);
    expect(federal.cmhc.longAmortSurcharge).toBeCloseTo(0.002, 6);
    expect(federal.cmhc.insuredCap).toBe(1_500_000);
  });

  it("uses CMHC's debt service ceilings and amortization caps", () => {
    expect(federal.gds).toBe(39);
    expect(federal.tds).toBe(44);
    expect(federal.maxAmortFtbInsured).toBe(30);
    expect(federal.maxAmortOther).toBe(25);
  });

  it("counts half a condominium fee in the lender's ratios, as CMHC's guidance states", () => {
    // "If applicable, 50% of the condominium fees must be included in the GDS and TDS
    // calculations." Quoted, not inferred -- this was a bare `* 0.5` at four call sites in
    // the engine with no provenance entry, against the FULL fee in the comfort budget on
    // the same screen. Both are correct; they answer different questions.
    expect(federal.condoFeeInclusion).toBe(0.5);
  });

  it("carries the minimum down payment schedule as data, ending where insurance does", () => {
    expect(federal.minDown.bands).toEqual([[500_000, 0.05], [null, 0.1]]);
    expect(federal.minDown.uninsuredRate).toBe(0.2);
    // The flat 20% starts exactly where mortgage insurance stops being available. Two
    // fields, one boundary -- if they ever disagree, one of them has been edited alone.
    expect(federal.cmhc.insuredCap).toBe(1_500_000);
  });

  it("keeps the non-shelter inflation figure ABOVE the general inflation it is not", () => {
    // Deliberately not equal to appreciation.inflation, and deliberately not changed by the
    // review that surfaced it: services have run ahead of headline CPI, and whether to align
    // the two is an owner's product call. What the review DID fix is that the figure is now
    // on the federal record with provenance, so /sources can disclose it -- as a module
    // constant in engine.ts it compounded for forty years where nothing could see it.
    expect(federal.nonShelterInflation).toBe(0.03);
    expect(federal.nonShelterInflation).toBeGreaterThan(federal.appreciation.inflation);
  });

  it("uses CRA's 2026 registered-plan figures", () => {
    expect(federal.rrspCap).toBe(33_810);
    expect(federal.fhsa).toEqual({ annual: 8_000, lifetime: 40_000 });
    expect(federal.hbp.max).toBe(60_000);
    expect(federal.hbp.repayYears).toBe(15);
    expect(federal.capGainsInclusion).toBe(0.5);
  });

  it("uses the First-Time Home Buyers' GST rebate as legislated", () => {
    expect(federal.gstFthb).toEqual({
      rate: 0.05,
      fullTo: 1_000_000,
      zeroAt: 1_500_000,
      cap: 50_000,
    });
  });

  it("matches FP Canada's 2026 projection assumptions where it borrows one", () => {
    expect(federal.appreciation.inflation).toBeCloseTo(0.021, 6);
    expect(federal.appreciation.shelter).toBeCloseTo(0.031, 6);
    expect(federal.investReturn.cash).toBeCloseTo(0.024, 6);
  });

  it("carries the date of this verification pass", () => {
    expect(federal.verified).toBe("2026-08-24");
  });
});

describe("federal provenance — the 2026 pass", () => {
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
    expect(federal.provenance[path], `federal.${path} has no provenance`).toBeDefined();
  });

  it("names a source and a date for every figure it claims high or medium confidence in", () => {
    for (const [path, p] of Object.entries(federal.provenance)) {
      if (p?.conf !== "high" && p?.conf !== "medium") continue;
      expect(p.src, `federal.${path} claims ${p.conf} with no source`).toBeTruthy();
      expect(p.asOf, `federal.${path} claims ${p.conf} with no date`).toBeTruthy();
    }
  });

  it("keeps the contract rates at medium — no authority publishes a 5-year fixed rate", () => {
    for (const path of ["rates.insured", "rates.uninsured"]) {
      expect(federal.provenance[path]?.conf, path).toBe("medium");
      expect(federal.provenance[path]?.note, path).toBeTruthy();
    }
  });
});
