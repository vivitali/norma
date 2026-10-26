import { describe, expect, it } from "vitest";
import { FL_TITLE_INSURANCE_BRACKETS, tampa } from "./tampa";
import { bracketTax, buildLines, propertyTaxAnnual, rentComparable, saleTaxOn } from "../engine";
import { us } from "../rules/us";

const INPUT = {
  price: 419900,
  dpPct: 10,
  amortYears: 30,
  ftb: true,
  ptype: "house" as const,
  elsewhere: false,
  residency: "resident" as const,
};

describe("tampa — property tax after the two-slice homestead exemption", () => {
  it("matches a hand-computed figure at the Hillsborough median ($419,900)", () => {
    // School slice 6.3400 mills = 0.00634, exemption $25,000:
    //   (419,900 - 25,000) x 0.00634 = 394,900 x 0.00634 = 2,503.666
    // Non-school slice 13.5028 mills = 0.0135028, exemption $25,000 + $26,411 = $51,411:
    //   (419,900 - 51,411) x 0.0135028 = 368,489 x 0.0135028 = 4,975.6333
    // Total 7,479.2993.
    expect(propertyTaxAnnual(tampa, 419900)).toBeCloseTo(7479.3, 2);
  });

  it("states the levy as a fraction (per $1,000 / 1,000) and the slices cross-foot to it", () => {
    expect(tampa.propTax.effective).toBeCloseTo(19.8428 / 1000, 12);
    const ex = tampa.propTax.exemptions!;
    expect(ex).toHaveLength(2);
    // 6.3400 + 13.5028 = 19.8428 mills
    expect(ex[0].appliesToRate + ex[1].appliesToRate).toBeCloseTo(tampa.propTax.effective, 12);
    expect(ex[0].appliesToRate).toBeCloseTo(6.34 / 1000, 12);
    expect(ex[1].appliesToRate).toBeCloseTo(13.5028 / 1000, 12);
  });

  it("the non-school exemption is $25,000 plus the 2026 indexed $26,411", () => {
    const ex = tampa.propTax.exemptions!;
    expect(ex[0]).toMatchObject({ kind: "flatAmount", amount: 25000 });
    expect(25000 + 26411).toBe(51411);
    expect(ex[1]).toMatchObject({ kind: "flatAmount", amount: 51411 });
  });
});

describe("tampa — Florida's mortgage taxes are the buyer's, the deed's stamps are the seller's", () => {
  it("carries a $0 deed-stamp line and the two loan taxes", () => {
    // Loan = 419,900 x 0.9 = 377,910.
    // Doc stamps on the note: ceil(377,910 / 100) = ceil(3,779.1) = 3,780 x $0.35 = 1,323.00.
    // Intangible tax: 377,910 x 0.002 = 755.82.
    const lines = buildLines(tampa, us, INPUT);
    const byKey = Object.fromEntries(lines.gov.map((l) => [l.key, l.amount]));
    expect(byKey.li_docStampsDeed).toBe(0);
    expect(byKey.li_docStampsNote).toBeCloseTo(1323.0, 2);
    expect(byKey.li_intangibleTax).toBeCloseTo(755.82, 2);
  });

  it("adds no rounding when the loan is an exact multiple of $100", () => {
    // Loan = 500,000 x 0.9 = 450,000: 4,500 units of $100, no fraction to round up.
    // Doc stamps: 4,500 x $0.35 = 1,575.00. Intangible tax: 450,000 x 0.002 = 900.00.
    const lines = buildLines(tampa, us, { ...INPUT, price: 500000 });
    const byKey = Object.fromEntries(lines.gov.map((l) => [l.key, l.amount]));
    expect(byKey.li_docStampsNote).toBeCloseTo(1575.0, 2);
    expect(byKey.li_intangibleTax).toBeCloseTo(900.0, 2);
  });

  it("recording is a hand-computed 3-page deed plus 18-page mortgage", () => {
    // Deed: 10.00 + 2 x 8.50 = 27.00. Mortgage: 10.00 + 17 x 8.50 = 154.50. Combined 181.50.
    expect(27 + 154.5).toBe(181.5);
    expect(tampa.fees.recording).toBe(181.5);
  });
});

describe("tampa — title insurance", () => {
  it("owner's premium matches the dossier's worked examples", () => {
    // $400,000: 100 x 5.75 + 300 x 5.00 = 575 + 1,500 = 2,075.
    expect(bracketTax(400000, FL_TITLE_INSURANCE_BRACKETS).total).toBeCloseTo(2075, 6);
    // $450,000: 575 + 350 x 5.00 = 575 + 1,750 = 2,325.
    expect(bracketTax(450000, FL_TITLE_INSURANCE_BRACKETS).total).toBeCloseTo(2325, 6);
  });

  it("the buyer's flat lender-side figure is $25 + $220 + $25", () => {
    // Owner's at 419,900: 575 + 319.9 x 5.00 = 2,174.50. Form 9: 10% x (2,174.50 + 25) = 219.95.
    expect(bracketTax(419900, FL_TITLE_INSURANCE_BRACKETS).total).toBeCloseTo(2174.5, 6);
    expect(25 + Math.round(0.1 * (2174.5 + 25)) + 25).toBe(270);
    expect(tampa.fees.titleIns).toBe(270);
  });
});

describe("tampa — the seller's deed stamps, netted off the sale in Rent vs Buy", () => {
  it("is $0.70 per $100: 419,900 x 0.007 = 2,939.30", () => {
    expect(saleTaxOn(tampa, 419900)).toBeCloseTo(2939.3, 6);
  });
});

describe("tampa — country, region, benchmarks, grades", () => {
  it("prices under the US rules, state Florida, closing through a title company", () => {
    expect(tampa.country).toBe("us");
    if (tampa.country === "us") expect(tampa.state).toBe("FL");
    expect(tampa.pro).toBe("titleCompany");
  });

  it("carries HUD's metro-wide 2BR FMR and county medians, yoy as a fraction", () => {
    expect(tampa.rent).toBe(1917);
    expect(tampa.rentBasis).toBe("fmr2br");
    expect(rentComparable(tampa, "condo")).toBe(true);
    expect(tampa.bench).toEqual({ house: 419900, condo: 279000 });
    // (419,900 - 423,450) / 423,450 = -0.00838 ~ the published -0.8%
    expect(tampa.yoy).toBeCloseTo((419900 - 423450) / 423450, 3);
    expect(tampa.provenance["bench.house"]?.note).toMatch(/MEDIAN/);
  });

  it("grades what the dossier grades", () => {
    const g = (k: string) => tampa.provenance[k]?.conf;
    expect(g("transfer.0")).toBe("medium");
    expect(g("transfer.1")).toBe("high");
    expect(g("transfer.2")).toBe("high");
    expect(g("saleTax.0")).toBe("high");
    expect(g("propTax.effective")).toBe("high");
    expect(g("insurance")).toBe("medium");
    for (const k of ["lawyer", "titleIns", "inspect", "appraisal", "survey", "recording", "moving", "setup"]) {
      expect(g(`fees.${k}`), k).toBe("assumption");
    }
  });

  it("quotes the same figures its fields hold", () => {
    const n = (k: string) => tampa.provenance[k]?.note ?? "";
    expect(n("fees.lawyer")).toContain("$550");
    expect(n("fees.titleIns")).toContain("$270");
    expect(n("fees.recording")).toContain("$181.50");
    expect(n("insurance")).toContain("$2,918");
    expect(n("propTax.effective")).toContain("19.8428");
    expect(n("propTax.effective")).toContain("0.0198428");
    expect(n("propTax.exemptions")).toContain("$51,411");
    expect(n("bench.house")).toContain("$419,900");
    expect(n("bench.condo")).toContain("$279,000");
    expect(n("rent")).toContain("$1,917");
    expect(n("yoy")).toContain("-0.008");
  });
});
