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
