import { describe, expect, it } from "vitest";
import { seattle } from "./seattle";
import {
  amortization,
  buildLines,
  closingTotal,
  credits,
  propertyTaxAnnual,
  rentComparable,
} from "../engine";
import { us } from "../rules/us";

const INPUT = {
  price: 920000,
  dpPct: 10,
  amortYears: 30,
  ftb: true,
  ptype: "house" as const,
  elsewhere: false,
  residency: "resident" as const,
};

describe("seattle — property tax, no exemption", () => {
  it("matches a hand-computed figure at the NWMLS single-family median ($920,000)", () => {
    // 2026 levy code 0010: 9.90845 per $1,000 = 0.00990845 as a FRACTION (9.90845 / 1,000).
    // Washington has no general homestead exemption, so the whole price is taxable:
    //   920,000 x 0.00990845 = 9,908.45 x 0.92 = 9,115.774 (dossier B3: $9,115.77).
    expect(propertyTaxAnnual(seattle, 920000)).toBeCloseTo(9115.77, 2);
  });

  it("states the levy as a fraction (per $1,000 / 1,000), not per $100", () => {
    // Off-by-ten guard: 9.90845 per $1,000 is 0.990845%, i.e. a fraction near 0.0099.
    expect(seattle.propTax.effective).toBeCloseTo(9.90845 / 1000, 12);
    expect(seattle.propTax.effective).toBeGreaterThan(0.009);
    expect(seattle.propTax.effective).toBeLessThan(0.011);
  });

  it("carries no exemption, and the seven levy components cross-foot to the total", () => {
    expect(seattle.propTax.exemptions).toBeUndefined();
    // 3.80478 + 3.01677 + 2.15308 + 0.25098 + 0.09419 + 0.15866 + 0.42999 = 9.90845
    const parts = [3.80478, 3.01677, 2.15308, 0.25098, 0.09419, 0.15866, 0.42999];
    expect(parts.reduce((a, b) => a + b, 0)).toBeCloseTo(9.90845, 5);
    expect(seattle.propTax.basis).toBe("market");
    expect(seattle.propTax.assessmentRatio).toBe(1);
  });
});

describe("seattle — REET is the seller's, so the buyer's bill carries it at $0", () => {
  it("has one explained $0 transfer line and no mortgage-recording tax", () => {
    const lines = buildLines(seattle, us, INPUT);
    // Government group: the $0 REET row plus the King County recording fee (627).
    expect(lines.gov).toEqual([
      { key: "li_reet", ex: "ex_reetSeller", amount: 0, parts: null, tier: "provincial", exact: true },
      { key: "li_recording", amount: 627 },
    ]);
  });

  it("charges the buyer only the lender's policy and half the escrow fee, and no survey", () => {
    expect(seattle.fees.titleIns).toBe(1070);
    expect(seattle.fees.lawyer).toBe(1400);
    expect(seattle.fees.survey).toBeUndefined();
    const lines = buildLines(seattle, us, INPUT);
    expect(lines.pro.map((l) => l.key)).not.toContain("li_survey");
  });

  it("recording is a hand-computed 3-page deed plus 18-page deed of trust", () => {
    // Deed: 303.50 + 2 x 1.00 = 305.50. Deed of trust: 304.50 + 17 x 1.00 = 321.50.
    // Combined 627.00.
    expect(305.5 + 321.5).toBe(627);
    expect(seattle.fees.recording).toBe(627);
  });

  it("closing total at $920,000, 10% down equals the hand-summed bill", () => {
    // government: 0 (REET) + 627 = 627
    // professional: 1,400 + 1,070 + 450 + 600 = 3,520
    // adjustments: tax adjustment 9,115.774 / 4 = 2,278.9435; moving 1,500; setup 250;
    //   prepaid escrow (2 months): (9,115.774 / 12 + 1,600 / 12) x 2
    //   = (759.64783 + 133.33333) x 2 = 892.98117 x 2 = 1,785.96233
    //   sum = 2,278.9435 + 1,500 + 250 + 1,785.96233 = 5,814.90583
    // total = 627 + 3,520 + 5,814.90583 = 9,961.90583
    // cash = down 92,000 + 9,961.90583 = 101,961.90583
    const r = closingTotal(seattle, us, INPUT);
    expect(r.total).toBeCloseTo(9961.91, 2);
    expect(r.cash).toBeCloseTo(101961.91, 2);
  });

  it("credits() reports no rebates", () => {
    const lines = buildLines(seattle, us, INPUT);
    const c = credits(seattle, us, INPUT, lines.gov);
    expect(c.atClosing).toEqual([]);
    expect(c.later).toEqual([]);
  });
});

describe("seattle — principal and interest at the benchmark", () => {
  it("first monthly payment matches the hand-computed annuity", () => {
    // Loan 828,000 (920,000 less 10%). r = 6.66% / 12 = 0.00555, n = 360.
    // (1.00555)^360 = e^(360 x ln 1.00555) = e^1.992476 = 7.33367.
    // P = 828,000 x 0.00555 x 7.33367 / (7.33367 - 1) = 4,595.4 x 1.157884 = 5,320.9.
    const r = amortization(us, {
      price: 920000,
      dpPct: 10,
      amortYears: 30,
      contractRate: 6.66,
      renewalRate: 6.66,
      termYears: 5,
    });
    expect(r.firstPayment).toBeCloseTo(5320.94, 0);
  });
});

describe("seattle — country, region, rent basis", () => {
  it("prices under the US rules, state Washington, closing through a title company", () => {
    expect(seattle.country).toBe("us");
    if (seattle.country === "us") expect(seattle.state).toBe("WA");
    expect(seattle.pro).toBe("titleCompany");
  });

  it("carries HUD's metro-wide 2BR FMR as an FMR, comparable to a condo", () => {
    expect(seattle.rent).toBe(2501);
    expect(seattle.rentBasis).toBe("fmr2br");
    expect(rentComparable(seattle, "condo")).toBe(true);
  });

  it("states benchmarks as medians and yoy as a fraction", () => {
    expect(seattle.bench).toEqual({ house: 920000, condo: 535000 });
    // (920,000 - 1,000,000) / 1,000,000 = -0.08
    expect(seattle.yoy).toBeCloseTo((920000 - 1000000) / 1000000, 10);
    expect(seattle.provenance["bench.house"]?.note).toMatch(/MEDIAN/);
  });

  it("grades what the dossier grades: assumption for insurance and recording, medium for title", () => {
    expect(seattle.provenance.insurance?.conf).toBe("assumption");
    expect(seattle.provenance["fees.recording"]?.conf).toBe("assumption");
    expect(seattle.provenance["fees.titleIns"]?.conf).toBe("medium");
    expect(seattle.provenance["fees.lawyer"]?.conf).toBe("medium");
  });
});
