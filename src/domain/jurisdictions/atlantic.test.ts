import { describe, expect, it } from "vitest";
import { buildLines, credits } from "../engine";
import { federal } from "../federal";
import { getJurisdiction } from "./index";

const halifax = () => getJurisdiction("halifax")!;
const nb = () => getJurisdiction("nb")!;
const nl = () => getJurisdiction("nl")!;
const pe = () => getJurisdiction("pe")!;

const ATLANTIC = () => [halifax(), nb(), nl(), pe()];

const base = {
  dpPct: 20,
  amortYears: 25,
  ftb: false,
  ptype: "house" as const,
  elsewhere: false,
  residency: "resident" as const,
};

/** The government line the engine emits for a purchase, or undefined if the row is absent. */
function govLine(id: string, key: string, o: Parameters<typeof buildLines>[2]) {
  const j = getJurisdiction(id)!;
  return buildLines(j, federal, o).gov.find((l) => l.key === key);
}

describe("Newfoundland and Labrador's Registry of Deeds tariff", () => {
  it("charges the tariff twice — once on the deed and once on the mortgage", () => {
    // "$100.00 plus forty cents for each additional one hundred dollars or part of one" is
    // levied on the conveyance (para 2(1)(a)) AND again on the mortgage (para 2(1)(b)),
    // computed on the amount secured. The model carried only the deed side.
    const perValue = nl().transfer.filter((l) => l.kind === "perValue");
    expect(perValue).toHaveLength(2);
    const mort = nl().transfer.find((l) => l.key === "li_mortReg")!;
    if (mort.kind !== "perValue") throw new Error("expected a perValue line");
    expect(mort.on).toBe("loan");
    expect(mort.base).toBe(100);
    expect(mort.per).toBe(0.4);
    expect(mort.unit).toBe(100);
    expect(mort.exempt).toBe(500);
  });

  it("rounds the part-unit UP, as the statute's 'or part of one' requires", () => {
    // $362,100 of value: (362100 - 500) / 100 = 3616 exactly, so pick a price one dollar
    // higher and watch the fraction of a unit still cost a full forty cents.
    const o = { ...base, price: 362101 };
    expect(govLine("nl", "li_titleReg", o)!.amount).toBeCloseTo(100 + 0.4 * 3617, 6);
  });

  it("adds roughly $1,257 of mortgage-side fee at the province benchmark", () => {
    // The understatement the second line fixes: an 80%-financed purchase at the NL
    // single-family benchmark. Loan = 362,100 x 0.8 = 289,680, and 100 + 0.4 x 2,892 = 1,256.80.
    // The $1,170 the verification report quotes was the same sum at the old $335,000
    // placeholder benchmark; the figure moves with the benchmark, the finding does not.
    const o = { ...base, price: 362100, dpPct: 20 };
    const mort = govLine("nl", "li_mortReg", o)!;
    expect(mort.amount).toBeCloseTo(100 + 0.4 * Math.ceil((289680 - 500) / 100), 6);
    expect(mort.amount).toBeCloseTo(1256.8, 6);
  });

  it("caps the MORTGAGE registration fee at $5,000, which binds above $1,225,500 of loan", () => {
    // s.2(2) caps "the registration of a mortgage, charge, floating charge, or specific or
    // floating mortgage or charge of chattels" at $5,000. At a loan of exactly $1,225,500 the
    // uncapped tariff is 100 + 0.4 x 12,250 = $5,000, so that is where the cap starts to bind.
    const atCap = { ...base, price: 1225500 / 0.8, dpPct: 20 };
    expect(govLine("nl", "li_mortReg", atCap)!.amount).toBeCloseTo(5000, 6);

    const wellOver = { ...base, price: 3000000, dpPct: 20 };
    expect(govLine("nl", "li_mortReg", wellOver)!.amount).toBe(5000);
  });

  it("does NOT cap the deed registration fee, because the statute does not", () => {
    // The $5,000 maximum in s.2(2) names mortgages and charges only; a conveyance under
    // para 2(1)(a) is not in that list. Third-party calculators recite the cap as if it
    // applied to the whole tariff. At $3,000,000 the deed fee is 100 + 0.4 x 29,995.
    const deed = nl().transfer.find((l) => l.key === "li_titleReg")!;
    if (deed.kind !== "perValue") throw new Error("expected a perValue line");
    expect(deed.max).toBeUndefined();
    const o = { ...base, price: 3000000, dpPct: 20 };
    expect(govLine("nl", "li_titleReg", o)!.amount).toBeCloseTo(100 + 0.4 * 29995, 6);
  });

  it("attributes the tariff to the department that actually prescribes it", () => {
    expect(nl().orgs.transfer).toContain("Registry of Deeds");
    expect(nl().orgs.transfer).toContain("Government Services");
    // There is no NL rebate, and the levy is a registration fee under Government Services,
    // not a Department of Finance tax — so there is no rebate authority to name.
    expect(nl().orgs.rebate).toBeUndefined();
  });
});

describe("Nova Scotia's new-build HST rebate", () => {
  const nsCredit = (o: Parameters<typeof buildLines>[2]) => {
    const j = halifax();
    return credits(j, federal, o, buildLines(j, federal, o).gov).later.find(
      (c) => c.key === "cr_nsNewBuildHst",
    );
  };

  it("pays a first-time buyer of a newly built home $3,000", () => {
    // 18.75% of the provincial portion of the HST, to a maximum of $3,000. The provincial
    // portion is 10% of the price, so the cap is reached at $160,000 — every realistic new
    // build is at the cap, which is why a flat $3,000 is exact rather than approximate.
    const o = { ...base, price: 500000, ftb: true, ptype: "newbuild" as const };
    expect(nsCredit(o)?.amount).toBe(3000);
  });

  it("does not pay it on a resale purchase", () => {
    // The programme is new construction only; it is not the deed transfer rebate that Nova
    // Scotia does not have, and the two are easy to confuse.
    for (const ptype of ["house", "condo"] as const) {
      expect(nsCredit({ ...base, price: 500000, ftb: true, ptype })).toBeUndefined();
    }
  });

  it("does not pay it to a repeat buyer", () => {
    const o = { ...base, price: 500000, ftb: false, ptype: "newbuild" as const };
    expect(nsCredit(o)).toBeUndefined();
  });

  it("still offers no deed transfer rebate, because Nova Scotia has none", () => {
    const rebate = halifax().rebates.find((r) => r.key === "cr_lttRebateProv")!;
    expect(rebate.kind).toBe("none");
  });
});

describe("Atlantic market figures", () => {
  it("keeps Halifax a CITY record, on the Halifax-Dartmouth benchmark", () => {
    // The trap: NSAR's type-level MLS® HPI is NOVA SCOTIA province-wide (composite $429,100,
    // single-family $425,200, apartment $435,100). Dropping the provincial aggregate into a
    // record whose city is "halifax" would silently re-scope it and cut the benchmark by 27%.
    expect(halifax().city).toBe("halifax");
    expect(halifax().cityData).toBe(true);
    expect(halifax().bench.house).toBe(557300);
    expect(halifax().bench.house).not.toBe(429100);
  });

  it("stops telling Halifax buyers prices are rising 3.4% in a flat market", () => {
    expect(halifax().yoy).toBe(0);
  });

  it("offers no Halifax condo benchmark, because none is published at that geography", () => {
    // Only a Nova Scotia apartment benchmark ($435,100) and a Halifax-Dartmouth apartment
    // AVERAGE sold price ($440,747) exist. Neither is this record's quantity.
    expect(halifax().bench.condo).toBeNull();
    expect(halifax().provenance["bench.condo"]?.conf).toBe("none");
  });

  it("offers PEI no condo benchmark, because none is published", () => {
    // PEIREA publishes a single combined composite/single-family series — its July 2026
    // release carries no apartment or townhouse line at all.
    expect(pe().bench.condo).toBeNull();
    expect(pe().provenance["bench.condo"]?.conf).toBe("none");
  });

  it("carries the July 2026 province-wide benchmarks for NB, NL and PEI", () => {
    expect(nb().bench).toEqual({ house: 345500, condo: 277100 });
    expect(nl().bench).toEqual({ house: 362100, condo: 275300 });
    expect(pe().bench).toEqual({ house: 388400, condo: null });
  });
});

describe("Atlantic property tax", () => {
  it("names the one municipality each province-wide record is modelled on", () => {
    for (const [j, city] of [
      [nb(), "Fredericton"],
      [nl(), "St. John"],
      [pe(), "Charlottetown"],
    ] as const) {
      const note = `${j.provenance["propTax.effective"]?.note ?? ""}${j.provenance["propTax.publishedRate"]?.src ?? ""}`;
      expect(note, `${j.id} does not say which municipality it models`).toContain(city);
    }
  });

  it("levies St. John's mill rate on a frozen January 2024 assessment base", () => {
    // St. John's assesses on a base date, not on current market value: the 2026-2027
    // assessment notices are valued as of January 1, 2024. Applying 9.1 mils straight to a
    // 2026 purchase price overstates the bill by about 30%.
    expect(nl().propTax.basis).toBe("frozenBaseYear");
    expect(nl().propTax.publishedRate).toBeCloseTo(0.0091, 8);
    expect(nl().propTax.assessmentRatio).toBeLessThan(1);
    expect(nl().propTax.effective).toBeLessThan(nl().propTax.publishedRate);
  });

  it("charges Charlottetown's full resident rate, not the provincial share alone", () => {
    // Provincial $1.70 less the $0.70 residents' provincial tax credit, plus Charlottetown's
    // $0.67 municipal resident rate = the $1.67 "Resident of PEI Tax Rate" the province itself
    // publishes. The old 0.0105 was a third of the real bill short.
    expect(pe().propTax.effective).toBeCloseTo(0.0167, 8);
  });

  it("uses HRM's own total residential rate, which reconciles to its published average bill", () => {
    // 0.798 municipal (urban general 0.687 + local transit 0.095 + climate 0.016) plus 0.337
    // of provincial and Halifax Water rates = 1.135 per $100. HRM's budget puts the average
    // single-family assessment at $357,500 and the average total bill at $4,058, and
    // 357,500 x 0.01135 = $4,058.
    expect(halifax().propTax.effective).toBeCloseTo(0.01135, 8);
    expect(357500 * halifax().propTax.effective).toBeCloseTo(4058, 0);
  });

  it("carries Fredericton's inside rate for New Brunswick", () => {
    expect(nb().propTax.effective).toBeCloseTo(0.013086, 8);
  });
});

describe("Atlantic tax-time credits and premium tax", () => {
  it("prices the federal home buyers' amount at the 2026 lowest federal rate", () => {
    // $10,000 claim x 14%, not the 15% that produced the $1,500 every third-party page recites.
    for (const j of ATLANTIC()) {
      expect(j.taxTime.find((c) => c.key === "cr_hba")?.amount, j.id).toBe(1400);
    }
  });

  it("levies no provincial tax on the mortgage insurance premium anywhere in Atlantic Canada", () => {
    // Only Ontario, Quebec and Saskatchewan tax the premium. Confirmed, not assumed — a null
    // here is a finding, and it carries provenance saying so.
    for (const j of ATLANTIC()) {
      expect(j.premiumTax, j.id).toBeNull();
      expect(j.provenance["premiumTax"], `${j.id} premiumTax`).toBeDefined();
    }
  });
});

describe("Atlantic provenance", () => {
  it("annotates every figure this task moved", () => {
    const paths = [
      "propTax.effective",
      "propTax.publishedRate",
      "propTax.assessmentRatio",
      "bench.house",
      "bench.condo",
      "taxTime.0.amount",
      "premiumTax",
    ];
    for (const j of ATLANTIC()) {
      for (const path of paths) {
        expect(j.provenance[path], `${j.id}.${path}`).toBeDefined();
      }
    }
    for (const path of ["rent", "yoy", "taxTime.1.amount"]) {
      expect(halifax().provenance[path], `halifax.${path}`).toBeDefined();
    }
    expect(nl().provenance["transfer.1.max"], "nl.transfer.1.max").toBeDefined();
    expect(nl().provenance["transfer.1.on"], "nl.transfer.1.on").toBeDefined();
    expect(pe().provenance["rebates.0.ceiling"], "pe.rebates.0.ceiling").toBeDefined();
  });

  it("writes the geography and the metric into every market figure's source", () => {
    // The dataset mixes MLS® HPI benchmarks, medians and board averages, and mixes city with
    // province. Undefined scope moves the answer more than staleness does, so each market
    // figure has to say which quantity it is.
    for (const j of ATLANTIC()) {
      for (const path of ["bench.house", "bench.condo"]) {
        const p = j.provenance[path]!;
        if (p.conf === "none") {
          expect(p.note, `${j.id}.${path}`).toBeTruthy();
          continue;
        }
        expect(`${p.src ?? ""} ${p.note ?? ""}`, `${j.id}.${path}`).toMatch(
          /benchmark|average|median/i,
        );
        expect(p.asOf, `${j.id}.${path}`).toBe("2026-07");
      }
    }
  });
});
