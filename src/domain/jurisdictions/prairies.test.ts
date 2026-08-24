import { describe, expect, it } from "vitest";
import { buildLines } from "../engine";
import { federal } from "../federal";
import { getJurisdiction } from "./index";

const wpg = () => getJurisdiction("winnipeg")!;
const sk = () => getJurisdiction("saskatoon")!;
const yyc = () => getJurisdiction("calgary")!;

const base = {
  dpPct: 20,
  amortYears: 25,
  ftb: true,
  ptype: "house" as const,
  elsewhere: false,
  residency: "resident" as const,
};

describe("Prairies 2026 figures", () => {
  it("applies Saskatchewan's 80% Percentage of Value to the property tax rate", () => {
    // The single largest recurring-cost error found: the placeholder was the un-discounted
    // sum of city, library and education rates, overstating annual property tax by 23%.
    expect(sk().propTax.assessmentRatio).toBe(0.8);
    expect(sk().propTax.effective).toBeCloseTo(0.0104668, 6);
  });

  it("charges Saskatchewan's real title transfer rate", () => {
    const line = sk().transfer.find((l) => l.key === "li_titleReg")!;
    if (line.kind !== "rateMin") throw new Error("expected a rateMin line");
    expect(line.rate).toBe(0.004);
    expect(line.floor).toBe(6300);
  });

  it("charges Winnipeg a mortgage registration fee", () => {
    // Saskatoon and Calgary both carry one; Winnipeg did not, producing systematically wrong
    // cross-city comparisons.
    expect(wpg().transfer.find((l) => l.key === "li_mortReg")).toBeDefined();
    const gov = buildLines(wpg(), federal, { ...base, price: 454264 }).gov;
    expect(gov.find((l) => l.key === "li_mortReg")?.amount).toBe(137);
  });

  it("keeps Manitoba's marginal table monotonic below $400,000", () => {
    // The placeholder had bracket 2 at a LOWER rate than bracket 1, which is impossible for a
    // progressive schedule. Latent today (marginal is unread) and silently wrong the moment
    // marginalRate() is ported.
    //
    // The ceiling is deliberate: Manitoba's rate genuinely FALLS above $400,000, because the
    // basic-personal-amount clawback surcharge applying from $200,001 ends there. Asserting
    // monotonicity over the whole table would be asserting a falsehood about Manitoba.
    const table = wpg().marginal!;
    const below = table.filter(([cap]) => cap != null && cap <= 400000).map(([, r]) => r);
    for (let i = 1; i < below.length; i++) {
      expect(below[i], `bracket ${i} is below bracket ${i - 1}`).toBeGreaterThanOrEqual(below[i - 1]);
    }
  });
});

describe("prairie property tax derivations", () => {
  // Three provinces, three different things a published mill rate is levied against. The point
  // of keeping the derivation rather than only its product is that a reviewer can see them
  // differ; harmonising the ratios would hide a statutory difference, not fix an error.
  it.each([
    ["winnipeg", 0.029366, 0.45, "portioned"],
    ["saskatoon", 0.0130835, 0.8, "percentOfValue"],
    ["calgary", 0.0066499, 1, "market"],
  ])("derives %s's effective rate from its published rate", (id, published, ratio, basis) => {
    const { effective, publishedRate, assessmentRatio } = getJurisdiction(id)!.propTax;
    expect(publishedRate).toBeCloseTo(published as number, 8);
    expect(assessmentRatio).toBe(ratio);
    expect(getJurisdiction(id)!.propTax.basis).toBe(basis);
    expect(effective).toBeCloseTo(publishedRate * assessmentRatio, 10);
  });

  it("does not pull Alberta's ratio toward its neighbours'", () => {
    // Alberta assesses at market value (valuation date 2025-07-01); Manitoba portions to 45%
    // and Saskatchewan to 80%. Same region, three statutes, and the spread is the finding.
    expect(yyc().propTax.assessmentRatio).toBe(1);
    expect(wpg().propTax.assessmentRatio).toBeLessThan(1);
    expect(sk().propTax.assessmentRatio).toBeLessThan(1);
  });
});

describe("what metric each prairie benchmark actually is", () => {
  // `bench` holds averages, medians and MLS HPI benchmarks across the dataset, and they are
  // not interchangeable — an average is dragged by sales mix, a benchmark holds quality
  // constant, a median is the middle sale. Choosing ONE metric everywhere is a product
  // decision above this milestone. What this milestone can do is make each record say which
  // one it is holding, and these tests are what stop that disclosure rotting silently.
  it("records that Winnipeg's figures are AVERAGES, not MLS HPI benchmarks", () => {
    for (const path of ["bench.house", "bench.condo"] as const) {
      const p = wpg().provenance[path]!;
      expect(p.src, path).toMatch(/average/i);
      expect(p.note, path).toMatch(/METRIC:/);
      expect(p.note, path).toMatch(/no MLS® HPI benchmark exists for Winnipeg/i);
    }
  });

  it("records that Saskatoon's is a COMPOSITE benchmark, not a detached one", () => {
    const p = sk().provenance["bench.house"]!;
    expect(p.src).toMatch(/composite/i);
    expect(p.note).toMatch(/METRIC:/);
    // Composite is a weaker match to what the field means elsewhere, and the confidence says so.
    expect(p.conf).toBe("medium");
  });

  it("records that Calgary's are type-level MLS HPI benchmarks", () => {
    for (const path of ["bench.house", "bench.condo"] as const) {
      const p = yyc().provenance[path]!;
      expect(p.src, path).toMatch(/MLS® HPI benchmark/i);
      expect(p.note, path).toMatch(/METRIC:/);
    }
  });

  it("leaves Saskatoon's apartment benchmark null because nobody publishes one", () => {
    expect(sk().bench.condo).toBeNull();
    expect(sk().provenance["bench.condo"]?.conf).toBe("none");
  });
});

describe("prairie market direction", () => {
  it("points Calgary's year-over-year change the way the market actually moved", () => {
    // A SIGN FLIP, not a stale number: the app told Calgary buyers prices were rising in a
    // falling market. CREB's July 2026 total residential benchmark of $569,200 is -2% y/y.
    expect(yyc().yoy).toBeLessThan(0);
    expect(yyc().yoy).toBeCloseTo(-0.02, 6);
    expect(yyc().bench).toEqual({ house: 743900, condo: 297600 });
  });

  it("keeps Winnipeg's benchmarks exactly as the board published them", () => {
    // The only benchmark figures in the dataset that were already correct, to the dollar.
    expect(wpg().bench).toEqual({ house: 454264, condo: 290522 });
    expect(wpg().yoy).toBeCloseTo(0.02, 6);
  });

  it("carries CMHC's October 2025 two-bedroom rents", () => {
    expect(wpg().rent).toBe(1570);
    expect(sk().rent).toBe(1559);
    expect(yyc().rent).toBe(1908);
  });
});

describe("prairie tax-time credits", () => {
  it("values the federal Home Buyers' Amount at the lowest federal rate everywhere", () => {
    // $10,000 claim x 14% = $1,400. The $1,500 it replaced was the credit at a 15% lowest rate.
    for (const j of [wpg(), sk(), yyc()]) {
      expect(j.taxTime.find((c) => c.key === "cr_hba")?.amount, j.id).toBe(1400);
    }
  });

  it("uses Saskatchewan's 2025 increase to the provincial first-time-buyer credit", () => {
    // 10.5% of a claim base the province raised from $10,000 to $15,000 on 2025-01-01. The
    // prototype's $1,155 decomposed into neither: not $1,050 (the pre-2025 credit) and not
    // $1,575 (the current one).
    expect(sk().taxTime.find((c) => c.key === "cr_provCredit")?.amount).toBe(1575);
  });

  it("gives Alberta and Manitoba no provincial first-time-buyer credit", () => {
    // Neither province levies one, and neither levies a land transfer tax rebate either —
    // Manitoba charges the tax with no first-time-buyer relief at all, Alberta charges land
    // titles registration instead of a transfer tax.
    for (const j of [wpg(), yyc()]) {
      expect(j.taxTime.map((c) => c.key), j.id).toEqual(["cr_hba"]);
    }
  });
});

describe("prairie premium tax", () => {
  it("taxes the mortgage insurance premium in Saskatchewan only", () => {
    // CMHC states that only Ontario, Quebec and Saskatchewan tax the premium, and that the
    // tax cannot be added to the loan.
    expect(sk().premiumTax?.rate).toBe(0.06);
    expect(sk().premiumTax?.label).toContain("6%");
    expect(wpg().premiumTax).toBeNull();
    expect(yyc().premiumTax).toBeNull();
  });
});

describe("figures deliberately left alone", () => {
  it("keeps Winnipeg's suspect utility setup fee, flagged rather than invented away", () => {
    // 3000 against Saskatoon's 550 and Calgary's 600 for the same field. Almost certainly a
    // prototype transcription error — and still not something to replace, because no source
    // supports any particular substitute. The disclosure is the deliverable, so it is tested.
    expect(wpg().fees.setup).toBe(3000);
    const p = wpg().provenance["fees.setup"]!;
    expect(p.conf).toBe("assumption");
    expect(p.note).toMatch(/SUSPECTED TRANSCRIPTION ERROR/);
  });

  it("keeps Manitoba's confirmed land transfer tax schedule", () => {
    const line = wpg().transfer.find((l) => l.key === "li_lttProv")!;
    if (line.kind !== "brackets") throw new Error("expected a brackets line");
    expect(line.brackets).toEqual([
      [30000, 0], [90000, 0.005], [150000, 0.01], [200000, 0.015], [null, 0.02],
    ]);
    // Confirmed against Manitoba Finance and left unchanged — but with a diarised expiry:
    // Budget 2026 announced land transfer tax changes taking effect in 2027.
    expect(wpg().provenance["transfer.0.brackets"]?.note).toMatch(/2027/);
  });

  it("keeps Alberta's per-value levies, which are in the Act and not the tariff regulation", () => {
    const gov = buildLines(yyc(), federal, { ...base, price: 622000 }).gov;
    // "or portion thereof" means round UP: 50 + 5 x ceil(622000/5000) = 50 + 5 x 125 = 675.
    expect(gov.find((l) => l.key === "li_titleReg")?.amount).toBe(675);
    expect(yyc().provenance["transfer.0.base"]?.src).toMatch(/64\.1\(2\)/);
  });
});
