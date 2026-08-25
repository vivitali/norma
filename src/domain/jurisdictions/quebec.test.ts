import { describe, expect, it } from "vitest";
import { bracketTax, buildLines, closingTotal, credits, type ClosingInput } from "../engine";
import { federal } from "../federal";
import { getJurisdiction } from "./index";

const mtl = () => getJurisdiction("montreal")!;

const base: ClosingInput = {
  price: 600000,
  dpPct: 20,
  amortYears: 25,
  ftb: true,
  ptype: "house",
  elsewhere: false,
  residency: "resident",
};

const dutyLine = () => {
  const line = mtl().transfer.find((l) => l.key === "li_dutiesMuni")!;
  if (line.kind !== "brackets") throw new Error("expected a bracket table");
  return line;
};

describe("Quebec 2026 transfer duties", () => {
  it("uses the 2026 thresholds published by the Ville de Montréal", () => {
    expect(dutyLine().brackets.map(([cap]) => cap)).toEqual([
      62900, 315000, 552300, 1104700, 2136500, 3113000, null,
    ]);
  });

  it("keeps the seven rates the prototype already had right", () => {
    expect(dutyLine().brackets.map(([, rate]) => rate)).toEqual([
      0.005, 0.01, 0.015, 0.02, 0.025, 0.035, 0.04,
    ]);
  });

  // The City's own worked example, verbatim: a $700,000 base gives
  // 314.50 + 2,521.00 + 3,559.50 + 2,954.00 = $9,349.00. If the table is ever re-indexed
  // without re-reading the source, this is the assertion that notices.
  it("reproduces the City's own $700,000 worked example", () => {
    expect(bracketTax(700000, dutyLine().brackets).total).toBeCloseTo(9349, 2);
  });

  it("charges the duty marginally, not as a step", () => {
    // One dollar over the first threshold adds half a cent, not a whole new band.
    const at = bracketTax(62900, dutyLine().brackets).total;
    const over = bracketTax(62901, dutyLine().brackets).total;
    expect(at).toBeCloseTo(314.5, 2);
    expect(over - at).toBeCloseTo(0.01, 4);
  });
});

describe("Quebec's refundable access-to-property credit", () => {
  const creditFor = (o: ClosingInput) =>
    credits(mtl(), federal, o, buildLines(mtl(), federal, o).gov);

  /** The bulletin's examples are stated in DUTIES, so feed the duty directly. */
  const onDuty = (duty: number, o: ClosingInput = base) =>
    credits(mtl(), federal, o, [{ key: "li_dutiesMuni", amount: duty }]).later.find(
      (c) => c.key === "cr_qcAccess",
    )?.amount ?? 0;

  it("is claimed on the return, not at closing", () => {
    const C = creditFor(base);
    expect(C.atClosing.find((c) => c.key === "cr_qcAccess")).toBeUndefined();
    expect(C.later.find((c) => c.key === "cr_qcAccess")?.amount).toBeGreaterThan(5000);
  });

  // Refundable and claimed at tax time means it is NOT money the buyer brings to the table.
  // A credit routed to `later` must leave `net` untouched — that is the whole point of `timing`.
  it("does not reduce the cash needed at closing", () => {
    const t = closingTotal(mtl(), federal, base);
    expect(t.creditsAtClosing).toBe(0);
    expect(t.net).toBe(t.cash);
    expect(t.later).toBeGreaterThan(5000);
  });

  it("refunds 100% of the first $5,000 of duties", () => {
    expect(onDuty(3000)).toBeCloseTo(3000, 2);
    expect(onDuty(5000)).toBeCloseTo(5000, 2);
  });

  it("adds 25% of the duties above $5,000", () => {
    expect(onDuty(6000)).toBeCloseTo(5250, 2);
  });

  // Ministère des Finances, "Crédit d'impôt remboursable pour l'accès à la propriété —
  // document explicatif": a Laval buyer at $616,000 pays $9,091 of duties and receives the
  // full $5,875, which the bulletin itself calls 65% of the duties paid.
  it("matches the ministry's Laval worked example", () => {
    const amount = onDuty(9091);
    expect(amount).toBeCloseTo(5875, 2);
    expect(amount / 9091).toBeCloseTo(0.65, 2);
  });

  it("caps at $5,875 and stops there", () => {
    expect(onDuty(8500)).toBeCloseTo(5875, 2);
    expect(onDuty(20000)).toBeCloseTo(5875, 2);
  });

  // There is NO phase-out. The bulletin's "Admissibilité" section names no price ceiling and
  // no reduction; the $750,000 on the ministry's chart is where the CAP is reached, not where
  // the credit starts falling. A taper is the single most likely wrong "fix" to this record.
  it("stays flat above $750,000 — it does not taper", () => {
    const at750k = creditFor({ ...base, price: 750000 });
    const at1m = creditFor({ ...base, price: 1000000 });
    const at5m = creditFor({ ...base, price: 5000000 });
    for (const C of [at750k, at1m, at5m]) {
      expect(C.later.find((c) => c.key === "cr_qcAccess")?.amount).toBeCloseTo(5875, 2);
    }
  });

  it("is a first-time-buyer credit", () => {
    const C = creditFor({ ...base, ftb: false });
    expect(C.later.find((c) => c.key === "cr_qcAccess")).toBeUndefined();
  });

  it("is no longer modelled as an absent programme", () => {
    expect(mtl().rebates.some((r) => r.kind === "none")).toBe(false);
  });
});

describe("Quebec tax-time credits", () => {
  const later = (o: ClosingInput) =>
    credits(mtl(), federal, o, buildLines(mtl(), federal, o).gov).later;

  // $10,000 x the 2026 lowest federal rate of 14%. The ministry bulletin shows the federal
  // credit as $1,169 for a Quebec resident, which is 1,400 x 0.835 after the 16.5% Quebec
  // abatement — norma does not model the abatement, so the gross $1,400 is what belongs here.
  it("carries the federal Home Buyers' Amount at $1,400, not $1,500", () => {
    expect(mtl().taxTime.find((c) => c.key === "cr_hba")?.amount).toBe(1400);
  });

  it("keeps Quebec's own first-home credit at $1,400", () => {
    expect(mtl().taxTime.find((c) => c.key === "cr_provCredit")?.amount).toBe(1400);
  });

  it("stacks all three: the refundable credit plus both non-refundable ones", () => {
    // The bulletin's TABLEAU 1 maximum is 5,875 + 1,400 + 1,169 = 8,444. norma reports the
    // federal credit gross of the abatement, so its total is 5,875 + 1,400 + 1,400.
    const rows = later(base);
    const keys = rows.map((c) => c.key);
    expect(keys).toContain("cr_qcAccess");
    expect(keys).toContain("cr_hba");
    expect(keys).toContain("cr_provCredit");
  });
});

describe("Quebec premium tax", () => {
  it("taxes the mortgage insurance premium at 9% for 2026", () => {
    expect(mtl().premiumTax?.rate).toBe(0.09);
  });

  it("keeps the prose label in step with the rate", () => {
    expect(mtl().premiumTax?.label).toContain("9%");
  });

  it("charges the tax in cash, on the premium, and never at 20% down", () => {
    const insured = buildLines(mtl(), federal, { ...base, dpPct: 5 }).gov;
    const line = insured.find((l) => l.key === "li_premTax")!;
    expect(line.cashOnly).toBe(true);
    expect(buildLines(mtl(), federal, base).gov.find((l) => l.key === "li_premTax")).toBeUndefined();
  });
});

describe("Montreal property tax", () => {
  const p = () => mtl().propTax;

  it("derives the effective rate from the published rate and the assessment ratio", () => {
    expect(p().effective).toBeCloseTo(p().publishedRate * p().assessmentRatio, 10);
  });

  // Ville de Montréal, "Taux de taxation 2026": every borough's all-in residential rate lands
  // between $0.6229 (Ville-Marie) and $0.7403 (Anjou) per $100, before the province-wide
  // school tax of $0.07899. A rate outside that band is not a Montreal rate.
  it("sits inside the published borough band plus the school tax", () => {
    expect(p().publishedRate).toBeGreaterThan(0.006229);
    expect(p().publishedRate).toBeLessThan(0.007403 + 0.0007899);
  });

  it("treats the roll as market value, because the 2026 facteur comparatif is 1.00", () => {
    expect(p().basis).toBe("market");
    expect(p().assessmentRatio).toBe(1);
  });
});

describe("Montreal market figures", () => {
  it("carries the QPAREB/APCIQ July 2026 Montreal CMA medians", () => {
    expect(mtl().bench.house).toBe(650000);
    expect(mtl().bench.condo).toBe(431500);
  });

  it("carries the CMHC Montréal CMA two-bedroom rent", () => {
    expect(mtl().rent).toBe(1346);
  });

  // Montreal is the one market of the eight that is rising. The sign is load-bearing:
  // a negative yoy here would flip Rent vs Buy's verdict for the whole province.
  it("is a rising market", () => {
    expect(mtl().yoy).toBe(0.04);
    expect(mtl().yoy!).toBeGreaterThan(0);
  });

  // QPAREB publishes MEDIANS; Toronto/Vancouver/Calgary/Ottawa carry MLS HPI benchmarks and
  // Winnipeg carries board averages. `bench` holds all three metrics across the dataset, which
  // is a real product problem. The metric must therefore be legible on the record itself.
  it("names the metric and the geography in provenance, since bench mixes three metrics", () => {
    for (const key of ["bench.house", "bench.condo"] as const) {
      const src = mtl().provenance[key]?.src ?? "";
      expect(src.toLowerCase(), key).toContain("median");
      expect(src.toLowerCase(), key).toContain("cma");
    }
  });
});

describe("Montreal provenance", () => {
  const required = [
    "transfer.0.brackets",
    "rebates.0.cap",
    "rebates.0.tiers",
    "premiumTax.rate",
    "propTax.effective",
    "propTax.publishedRate",
    "propTax.assessmentRatio",
    "bench.house",
    "bench.condo",
    "rent",
    "yoy",
    "taxTime.0.amount",
    "taxTime.1.amount",
  ];

  it("annotates every figure this task changed or checked", () => {
    for (const path of required) {
      expect(mtl().provenance[path], path).toBeDefined();
    }
  });

  it("records the transfer table's expiry, since the thresholds are indexed annually", () => {
    expect(mtl().provenance["transfer.0.brackets"]?.asOf).toBe("2026-01-01");
    expect(mtl().provenance["transfer.0.brackets"]?.conf).toBe("high");
  });
});
