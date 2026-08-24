import { describe, expect, it } from "vitest";
import { getJurisdiction } from "./index";

describe("Ontario 2026 figures", () => {
  const toronto = () => getJurisdiction("toronto")!;
  const ottawa = () => getJurisdiction("ottawa")!;

  it("charges the 2026 MLTT luxury rates above $3M", () => {
    const mltt = toronto().transfer.find((l) => l.key === "li_lttMuni")!;
    if (mltt.kind !== "brackets") throw new Error("expected a bracket table");
    // Bands at or below $3M are unchanged; the raised schedule starts above it.
    expect(mltt.brackets).toContainEqual([4000000, 0.044]);
    expect(mltt.brackets).toContainEqual([5000000, 0.0545]);
    expect(mltt.brackets).toContainEqual([10000000, 0.065]);
    expect(mltt.brackets).toContainEqual([20000000, 0.0755]);
    expect(mltt.brackets).toContainEqual([null, 0.086]);
  });

  it("leaves the sub-$3M MLTT bands untouched", () => {
    const mltt = toronto().transfer.find((l) => l.key === "li_lttMuni")!;
    if (mltt.kind !== "brackets") throw new Error("expected a bracket table");
    for (const band of [
      [55000, 0.005],
      [250000, 0.01],
      [400000, 0.015],
      [2000000, 0.02],
      [3000000, 0.025],
    ]) {
      expect(mltt.brackets).toContainEqual(band);
    }
  });

  it("keeps the provincial LTT schedule both cities share, which is already correct", () => {
    for (const j of [toronto(), ottawa()]) {
      const ltt = j.transfer.find((l) => l.key === "li_lttProv")!;
      if (ltt.kind !== "brackets") throw new Error("expected a bracket table");
      expect(ltt.brackets).toEqual([
        [55000, 0.005],
        [250000, 0.01],
        [400000, 0.015],
        [2000000, 0.02],
        [null, 0.025],
      ]);
    }
  });

  it("does not charge above Ontario's statutory status-certificate maximum", () => {
    // O. Reg. 48/01 s. 18(4) caps the fee at $100 INCLUDING all applicable taxes, so 110 is not
    // merely high — no condo corporation may lawfully charge it.
    expect(toronto().fees.statusCert).toBe(100);
    expect(ottawa().fees.statusCert).toBe(100);
  });

  it("reports Toronto and Ottawa prices as falling, which they are", () => {
    expect(toronto().yoy).toBeLessThan(0);
    expect(ottawa().yoy).toBeLessThan(0);
  });

  it("carries the July 2026 City-of-Toronto benchmarks, not the all-TRREB ones", () => {
    // All-TRREB detached is $1,221,800 and apartment $535,200 — a 19% gap on the house figure.
    // The scope choice moves the answer more than a month of price drift does.
    expect(toronto().bench).toEqual({ house: 1455200, condo: 551900 });
    expect(ottawa().bench).toEqual({ house: 725000, condo: 385500 });
  });

  it("attributes the market data to the board that publishes it", () => {
    expect(toronto().orgs.market).toBe("TRREB MLS® HPI");
    expect(ottawa().orgs.market).toBe("OREB MLS® HPI");
  });

  it("levies property tax on a frozen 2016 assessment base, not on market price", () => {
    // MPAC's province-wide reassessment has been postponed since COVID: 2026 taxes are levied on
    // fully phased-in January 1, 2016 current values. Applying the published rate straight to a
    // 2026 purchase price overstates the bill by a third.
    for (const j of [toronto(), ottawa()]) {
      expect(j.propTax.basis, j.id).toBe("frozenBaseYear");
      expect(j.propTax.assessmentRatio, j.id).toBeLessThan(1);
      expect(j.propTax.effective, j.id).toBeLessThan(j.propTax.publishedRate);
    }
  });

  it("uses the published 2026 residential rates", () => {
    // City of Toronto: 0.605295% city + 0.153% education + 0.009016% city building fund.
    expect(toronto().propTax.publishedRate).toBeCloseTo(0.00767311, 8);
    // Ottawa: 1.2271% municipal urban residential + the province's 0.153% education rate.
    expect(ottawa().propTax.publishedRate).toBeCloseTo(0.013801, 8);
  });

  it("carries provenance for every figure this task moved", () => {
    const paths = [
      "propTax.effective",
      "propTax.publishedRate",
      "propTax.assessmentRatio",
      "bench.house",
      "bench.condo",
      "rent",
      "yoy",
      "fees.statusCert",
      "taxTime.0.amount",
    ];
    for (const j of [toronto(), ottawa()]) {
      for (const path of paths) {
        expect(j.provenance[path], `${j.id}.${path}`).toBeDefined();
      }
    }
    expect(toronto().provenance["transfer.1.brackets"]).toBeDefined();
  });

  it("prices the federal home buyers' amount at the 2026 lowest federal rate", () => {
    // $10,000 claim (CRA line 31270) x the lowest federal rate, which is 14% for 2026 — not the
    // 15% that produced the $1,500 every third-party page still recites.
    expect(toronto().taxTime.find((c) => c.key === "cr_hba")?.amount).toBe(1400);
    expect(ottawa().taxTime.find((c) => c.key === "cr_hba")?.amount).toBe(1400);
  });
});
