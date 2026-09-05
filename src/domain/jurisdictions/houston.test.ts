import { describe, expect, it } from "vitest";
import { houston, TX_TITLE_INSURANCE_BRACKETS } from "./houston";
import { bracketTax, buildLines, closingTotal, credits, propertyTaxAnnual } from "../engine";
import { us } from "../rules/us";

describe("houston — Texas title insurance schedule", () => {
  it("reproduces the research dossier's $2,015 example on a $350,000 policy", () => {
    // (350,000 - 100,000) x 0.00494 + 780 = 1,235 + 780 = 2,015 (dossier B3).
    const { total } = bracketTax(350000, TX_TITLE_INSURANCE_BRACKETS);
    expect(total).toBeCloseTo(2015, 2);
  });

  it("charges the buyer only the flat $100 simultaneous-issue lender's policy, not the full schedule", () => {
    // Texas/Harris County custom: the SELLER pays the owner's policy. fees.titleIns is what the
    // BUYER actually pays at closing.
    expect(houston.fees.titleIns).toBe(100);
  });
});

describe("houston — no transfer tax, empty government charges group", () => {
  it("carries an empty transfer array", () => {
    expect(houston.transfer).toEqual([]);
  });

  it("buildLines() degrades to an empty gov group with no crash and no phantom row", () => {
    const lines = buildLines(houston, us, {
      price: 350000,
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
    const lines = buildLines(houston, us, {
      price: 350000,
      dpPct: 10,
      amortYears: 30,
      ftb: true,
      ptype: "house",
      elsewhere: false,
      residency: "resident",
    });
    const c = credits(houston, us, {
      price: 350000,
      dpPct: 10,
      amortYears: 30,
      ftb: true,
      ptype: "house",
      elsewhere: false,
      residency: "resident",
    }, lines.gov);
    expect(c.atClosing).toEqual([]);
    expect(c.later).toEqual([]);
    expect(c.omitted).toEqual([{ key: "cr_noRebateUs", ex: "ex_noRebateUs" }]);
  });

  it("closingTotal() runs cleanly end to end with no government charges", () => {
    const result = closingTotal(houston, us, {
      price: 350000,
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

describe("houston — property tax after the HISD-portion homestead exemption", () => {
  it("charges less than the full nominal rate at the HAR median price", () => {
    const price = houston.bench.house!;
    const full = price * houston.propTax.effective;
    const actual = propertyTaxAnnual(houston, price);
    expect(actual).toBeLessThan(full);
  });

  it("matches an independently hand-derived figure at the HAR median ($340,000)", () => {
    // HISD portion (0.8783%) on (340,000 - 140,000) = $1,756.60, plus the remainder of the
    // combined rate (2.120422% - 0.8783% = 1.242122%) on the full $340,000 = $4,223.21.
    // 1,756.60 + 4,223.21 = $5,979.81 — computed by hand, independent of propertyTaxAnnual()'s
    // own formula, so this test cannot pass merely because the implementation agrees with itself.
    expect(propertyTaxAnnual(houston, 340000)).toBeCloseTo(5979.81, 2);
  });

  it("never produces a negative tax, even below the exemption amount", () => {
    const tiny = propertyTaxAnnual(houston, 50000);
    expect(tiny).toBeGreaterThanOrEqual(0);
  });

  it("stays linear in price (the derivation the affordability ceiling solve relies on)", () => {
    const a = propertyTaxAnnual(houston, 300000);
    const b = propertyTaxAnnual(houston, 600000);
    const midpoint = propertyTaxAnnual(houston, 450000);
    expect(midpoint).toBeCloseTo((a + b) / 2, 6);
  });
});

describe("houston — country and region", () => {
  it("prices under the US rules, state Texas", () => {
    expect(houston.country).toBe("us");
    if (houston.country === "us") expect(houston.state).toBe("TX");
  });

  it("closes through a title company, not a lawyer or notary", () => {
    expect(houston.pro).toBe("titleCompany");
  });
});
