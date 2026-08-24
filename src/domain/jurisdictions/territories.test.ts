import { describe, expect, it } from "vitest";
import { buildLines } from "../engine";
import { federal } from "../federal";
import { getJurisdiction } from "./index";

const yt = () => getJurisdiction("yt")!;
const nt = () => getJurisdiction("nt")!;
const nu = () => getJurisdiction("nu")!;
const terr = () => [yt(), nt(), nu()];

const base = {
  dpPct: 20,
  amortYears: 25,
  ftb: true,
  ptype: "house" as const,
  elsewhere: false,
  residency: "resident" as const,
};

/** A government line's amount, or undefined if the line is absent. */
function gov(j: ReturnType<typeof yt>, key: string, o: Parameters<typeof buildLines>[2]) {
  return buildLines(j, federal, o).gov.find((l) => l.key === key)?.amount;
}

describe("territorial market data", () => {
  it("publishes no benchmark price, because nobody does", () => {
    // No CREA member board publishes an MLS® HPI for any territory, the NWT Bureau of
    // Statistics publishes no price series at all, and gov.nu.ca blocks automated access.
    // All six figures the prototype carried were inventions.
    for (const j of terr()) {
      expect(j.bench.house, `${j.id}.bench.house`).toBeNull();
      expect(j.bench.condo, `${j.id}.bench.condo`).toBeNull();
      expect(j.provenance["bench.house"]?.conf, `${j.id}.bench.house`).toBe("none");
      expect(j.provenance["bench.condo"]?.conf, `${j.id}.bench.condo`).toBe("none");
    }
  });

  it("names the city each record actually describes", () => {
    expect(yt().city).toBe("whitehorse");
    expect(nt().city).toBe("yellowknife");
    expect(nu().city).toBe("iqaluit");
  });

  it("still carries no city-level market data, so the rent field stays absent", () => {
    // `city` names what the figures describe; `cityData` claims a verified city-level market
    // series exists. Only the first is true here, and the noCityData disclosure depends on it.
    for (const j of terr()) {
      expect(j.cityData, `${j.id}.cityData`).toBe(false);
      expect(j.rent, `${j.id}.rent`).toBeUndefined();
    }
  });

  it("claims the 2026 federal Home Buyers' Amount at the 14% rate, not the old 15%", () => {
    for (const j of terr()) {
      expect(j.taxTime.find((c) => c.key === "cr_hba")?.amount, `${j.id}`).toBe(1400);
    }
  });
});

describe("Yukon land titles tariff (Land Titles Act, 2015)", () => {
  it("charges a stepped transfer fee by declared value, not a flat $650", () => {
    // $50 / $150 / $350 / $550 / $750 by band.
    const at = (price: number) => gov(yt(), "li_titleReg", { ...base, price });
    expect(at(80000)).toBe(50);
    expect(at(300000)).toBe(150);
    expect(at(620000)).toBe(350);
    expect(at(4000000)).toBe(550);
    expect(at(12000000)).toBe(750);
  });

  it("puts a band edge on the greater-or-equal side, as the schedule writes it", () => {
    // "less than $100,000" is $50; "$100,000 or greater and less than $500,000" is $150. At
    // exactly $500,000 the whole fee is $350 — the reason the step ceilings carry a .99.
    const at = (price: number) => gov(yt(), "li_titleReg", { ...base, price });
    expect(at(99999)).toBe(50);
    expect(at(100000)).toBe(150);
    expect(at(499999)).toBe(150);
    expect(at(500000)).toBe(350);
  });

  it("charges the assurance fund fee the prototype omitted entirely", () => {
    // "$20 for the 1st $10,000, plus $10 for each $10,000 or portion thereof."
    const at = (price: number) => gov(yt(), "li_assuranceFund", { ...base, price });
    expect(at(10000)).toBe(20);
    expect(at(620000)).toBe(20 + 10 * 61);
  });

  it("rounds the assurance fund's last part-band UP, because 'or portion thereof' says so", () => {
    const at = (price: number) => gov(yt(), "li_assuranceFund", { ...base, price });
    expect(at(10001)).toBe(30);
    expect(at(20000)).toBe(30);
    expect(at(20001)).toBe(40);
  });

  it("discloses that the assurance fund is modelled on the full price, an upper bound", () => {
    // The schedule charges it on additional declared value SINCE THE LAST TRANSFER, which is
    // not an input this model has. Charging it on the whole price is exact on a first title and
    // an overstatement on a resale — a modelling choice, so it must say so.
    const p = yt().provenance["transfer.1.on"];
    expect(p?.conf).toBe("assumption");
    expect(p?.note).toMatch(/since the last transfer/i);
  });

  it("steps the mortgage registration fee on the loan, not the price", () => {
    // Same price, different down payment: $496,000 secured is the $100 band, $620,000 would be
    // the $200 band, and only the loan decides.
    expect(gov(yt(), "li_mortReg", { ...base, price: 620000, dpPct: 20 })).toBe(100);
    expect(gov(yt(), "li_mortReg", { ...base, price: 620000, dpPct: 5 })).toBe(200);
    expect(gov(yt(), "li_mortReg", { ...base, price: 80000, dpPct: 20 })).toBe(50);
  });

  it("understates nothing now: $1,080 on a $620,000 Whitehorse purchase, against $750 modelled before", () => {
    // The verification brief said norma OVERSTATED Yukon by ~$420, from the pre-2015 tariff.
    // Under the current schedule the three lines are $350 + $630 + $100, and the prototype's
    // flat $650 + $100 was $330 short.
    const o = { ...base, price: 620000, dpPct: 20 };
    const lines = buildLines(yt(), federal, o).gov;
    const total = lines.reduce((sum, l) => sum + l.amount, 0);
    expect(total).toBeCloseTo(1080, 2);
    expect(total).toBeGreaterThan(750);
  });

  it("levies Whitehorse property tax on the assessment roll, not on the purchase price", () => {
    // The Government of Yukon values improvements at depreciated replacement cost and
    // reassesses every two years, so the 1.097% residential rate cannot be applied to a sale
    // price. Two reported 2026 bills on ~$641,000 homes were $1,625 and $3,744.
    const p = yt().propTax;
    expect(p.publishedRate).toBeCloseTo(0.01097, 8);
    expect(p.basis).toBe("frozenBaseYear");
    expect(p.assessmentRatio).toBeLessThan(1);
    expect(p.effective).toBeCloseTo(p.publishedRate * p.assessmentRatio, 10);
    expect(p.effective).toBeLessThan(p.publishedRate);
    // A $620,000 Whitehorse house lands inside the range of the two real reported bills.
    expect(p.effective * 620000).toBeGreaterThan(1625);
    expect(p.effective * 620000).toBeLessThan(3744);
  });
});

describe("NWT land titles tariff (schedule updated 2025-09-01)", () => {
  it("charges $2.00 per $1,000, not the superseded $1.50 third parties still publish", () => {
    const title = nt().transfer.find((l) => l.key === "li_titleReg")!;
    if (title.kind !== "perValue") throw new Error("expected a perValue line");
    expect(title.per).toBe(2.0);
    expect(gov(nt(), "li_titleReg", { ...base, price: 470000 })).toBe(940);
  });

  it("rounds a part-$1,000 UP, because the schedule says 'or part thereof'", () => {
    expect(gov(nt(), "li_titleReg", { ...base, price: 470500 })).toBe(942);
    expect(gov(nt(), "li_titleReg", { ...base, price: 470001 })).toBe(942);
  });

  it("applies the $100 and $80 prescribed minimums the brief did not mention", () => {
    // $40,000 of value is $80 at $2.00 per $1,000, below the $100 floor; a $32,000 mortgage is
    // $48 at $1.50 per $1,000, below the $80 floor.
    const o = { ...base, price: 40000, dpPct: 20 };
    expect(gov(nt(), "li_titleReg", o)).toBe(100);
    expect(gov(nt(), "li_mortReg", o)).toBe(80);
  });

  it("charges $1.50 per $1,000 of the amount secured", () => {
    const mort = nt().transfer.find((l) => l.key === "li_mortReg")!;
    if (mort.kind !== "perValue") throw new Error("expected a perValue line");
    expect(mort.per).toBe(1.5);
    expect(gov(nt(), "li_mortReg", { ...base, price: 500000, dpPct: 20 })).toBe(600);
  });

  it("matches the statute exactly at the $1M tier boundary and diverges above it, on purpose", () => {
    // The tariff steps to $2,000 plus $1.50 per $1,000 of the excess above $1,000,000. No
    // single line kind expresses that, and a second line would render a $0 row at every
    // realistic territorial price, so the first tier continues and the divergence is recorded
    // here rather than left to be discovered.
    expect(gov(nt(), "li_titleReg", { ...base, price: 1000000 })).toBe(2000);
    expect(gov(nt(), "li_titleReg", { ...base, price: 2000000 })).toBe(4000); // statute: $3,500
    expect(nt().provenance["transfer.0.per"]?.note).toMatch(/KNOWN LIMITATION/);
  });

  it("does not pretend a Yellowknife property tax rate was found", () => {
    // The 9.86 municipal mill rate predates the 2025 General Assessment (base year 2024,
    // Yellowknife's first reassessment since 2018) and excludes the education levy. Moving the
    // effective rate onto it would replace one unverified number with two.
    const p = nt().propTax;
    expect(p.effective).toBe(0.0112);
    expect(p.publishedRate).toBe(p.effective);
    expect(nt().provenance["propTax.effective"]?.conf).toBe("assumption");
    expect(nt().provenance["propTax.basis"]?.note).toMatch(/two thirds|2024 base-year/i);
  });
});

describe("Nunavut land titles tariff (R-062-93 as inherited, still in force)", () => {
  it("is not the NWT's twin: it kept the pre-1999 rates the NWT revised in 2025", () => {
    const nuTitle = nu().transfer.find((l) => l.key === "li_titleReg")!;
    const ntTitle = nt().transfer.find((l) => l.key === "li_titleReg")!;
    if (nuTitle.kind !== "perValue" || ntTitle.kind !== "perValue") throw new Error("expected perValue lines");
    expect(nuTitle.per).toBe(1.5);
    expect(ntTitle.per).toBe(2.0);
    expect(gov(nu(), "li_titleReg", { ...base, price: 620000 })).toBe(930);
    expect(gov(nu(), "li_mortReg", { ...base, price: 620000, dpPct: 20 })).toBe(496);
  });

  it("uses the minimums the regulation itself states, resolving the $60-or-$100 dispute", () => {
    // Schedule item 1(a): "$1.50 for each $1000 of value with a minimum fee of $60".
    // Schedule item 2: "$1 for each $1000 ... with a minimum fee of $40".
    const o = { ...base, price: 20000, dpPct: 20 };
    expect(gov(nu(), "li_titleReg", o)).toBe(60);
    expect(gov(nu(), "li_mortReg", o)).toBe(40);
  });

  it("charges no separate assurance fund line, unlike Yukon", () => {
    // Nunavut funds its assurance fund by transferring 10% of these fees into it, not by
    // billing the buyer a fourth line.
    const keys = buildLines(nu(), federal, { ...base, price: 620000 }).gov.map((l) => l.key);
    expect(keys).not.toContain("li_assuranceFund");
    expect(buildLines(yt(), federal, { ...base, price: 620000 }).gov.map((l) => l.key)).toContain(
      "li_assuranceFund",
    );
  });

  it("does not pretend an Iqaluit property tax rate was found", () => {
    // The Government of Nunavut's taxation area excludes Iqaluit; the City sets its own rates
    // across five classes and publishes them nowhere machine-readable.
    expect(nu().propTax.effective).toBe(0.009);
    const p = nu().provenance["propTax.effective"];
    expect(p?.conf).toBe("assumption");
    expect(p?.note).toMatch(/excludes the city of iqaluit/i);
  });

  it("flags the moving cost as wrong in spirit, not merely uncited", () => {
    // Sealift, booked months ahead and priced per cubic metre. This is the one fee figure the
    // research called out as confidently wrong rather than simply unsourced.
    expect(nu().provenance["fees.moving"]?.note).toMatch(/sealift/i);
  });
});
