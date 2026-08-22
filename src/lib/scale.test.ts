import { describe, expect, it } from "vitest";
import { gapBand, gaugeBar, impactWidth, markerAlign, splitWidth } from "./scale";

describe("gapBand", () => {
  it("puts the band between comfort and ceiling when the lender approves higher", () => {
    const b = gapBand(400000, 500000, 450000);
    expect(b.inverted).toBe(false);
    expect(b.bandLeft).toBeCloseTo(b.comfortPct, 5);
    expect(b.bandWidth).toBeGreaterThan(0);
  });

  it("marks the inverted case rather than clamping it to zero", () => {
    // "You would be comfortable carrying more than a lender will approve" is a
    // different fact from "lenders approve into danger", not a negative number.
    const b = gapBand(500000, 400000, 450000);
    expect(b.inverted).toBe(true);
    expect(b.bandWidth).toBeGreaterThan(0);
  });

  it("scales to whichever of the three figures is largest", () => {
    // A target far above both ceilings must stay on the bar.
    const b = gapBand(300000, 400000, 900000);
    expect(b.targetPct).toBeLessThanOrEqual(100);
    expect(b.targetPct).toBeGreaterThan(b.ceilingPct);
  });

  it("clamps every percentage into 0..100", () => {
    for (const b of [gapBand(0, 0, 0), gapBand(-5, 10, 1e9)]) {
      for (const v of [b.comfortPct, b.ceilingPct, b.targetPct, b.bandLeft, b.bandWidth]) {
        expect(v).toBeGreaterThanOrEqual(0);
        expect(v).toBeLessThanOrEqual(100);
      }
    }
  });

  it("reports a hairline band as not worth drawing", () => {
    expect(gapBand(400000, 400100, 400000).hasBand).toBe(false);
    expect(gapBand(400000, 500000, 450000).hasBand).toBe(true);
  });
});

describe("gaugeBar", () => {
  it("scales against a 60% axis, not against the limit", () => {
    expect(gaugeBar(30, 39).width).toBeCloseTo(50, 5);
    expect(gaugeBar(30, 39).limitPct).toBeCloseTo(65, 5);
  });
  it("passes comfortably below nine tenths of the limit", () => {
    expect(gaugeBar(30, 39).state).toBe("pass");
  });
  it("cautions in the last tenth before the limit", () => {
    expect(gaugeBar(38, 39).state).toBe("caution");
  });
  it("blocks above the limit", () => {
    expect(gaugeBar(41, 39).state).toBe("blocked");
  });
  it("clamps a ratio beyond the axis", () => {
    expect(gaugeBar(200, 39).width).toBe(100);
  });
});

describe("impactWidth", () => {
  it("expresses the debt cost as a share of the un-debted ceiling", () => {
    expect(impactWidth(50000, 450000)).toBeCloseTo(10, 5);
  });
  it("is zero when there is no debt", () => {
    expect(impactWidth(0, 450000)).toBe(0);
  });
  it("does not divide by zero", () => {
    expect(Number.isFinite(impactWidth(0, 0))).toBe(true);
  });
});

describe("splitWidth", () => {
  it("splits the cash bar at the down payment's share", () => {
    expect(splitWidth(45000, 60000)).toBeCloseTo(75, 5);
  });
  it("falls back to an even split when there is no cash to divide", () => {
    expect(splitWidth(0, 0)).toBe(50);
  });
});

describe("markerAlign", () => {
  it("pulls a marker in at the ends so its label stays on the bar", () => {
    expect(markerAlign(2)).toBe("start");
    expect(markerAlign(50)).toBe("center");
    expect(markerAlign(95)).toBe("end");
  });
});
