import { describe, expect, it } from "vitest";
import { scenario } from "@/domain/engine";
import { ca } from "@/domain/rules/ca";
import { getJurisdiction } from "@/domain/jurisdictions";
import { recommend, SCENARIO_PERCENTS } from "./scenarios-view";

const toronto = getJurisdiction("toronto")!;
const base: Omit<Parameters<typeof scenario>[2], "dpPct"> = {
  price: 600000, amortYears: 25, ftb: true, ptype: "house" as const, elsewhere: false, residency: "resident",
  insuranceAnnual: 1500, utilities: 300, condoFee: 0, comfortCeiling: 3200,
  qualIncome: 160000, debts: 400, funds: 250000, save: 1000,
};
const columns = (over: Partial<typeof base> = {}) =>
  SCENARIO_PERCENTS.map((dpPct) => scenario(toronto, ca, { ...base, ...over, dpPct }));

describe("recommend", () => {
  it("says nothing about deposits when no column would be approved", () => {
    // The constraint is income against debt, and no down payment fixes that.
    // Recommending one would answer a question the reader does not have.
    expect(recommend(columns({ qualIncome: 20000 }))).toEqual({ kind: "noneQualify" });
  });

  it("withholds a verdict when funds were never given", () => {
    // Fundability is unknowable then, and guessing puts a verdict on screen the
    // reader never supplied the input for.
    expect(recommend(columns({ funds: null }))).toEqual({ kind: "unanswered" });
  });

  it("reports that none can be funded rather than recommending an unreachable one", () => {
    const result = recommend(columns({ funds: 1000 }));
    expect(result.kind).toBe("noneCash");
  });

  it("recommends 20% when it is reachable, because that is what removes the premium", () => {
    const result = recommend(columns());
    expect(result.kind).toBe("twenty");
    if (result.kind !== "twenty") return;
    expect(result.pct).toBe(20);
    expect(result.saving).toBeGreaterThan(0);
    expect(result.extraCash).toBeGreaterThan(0);
  });

  it("prices the move to 20% as a return per dollar of extra deposit", () => {
    // Computed from the columns, not from the result's own two fields -- that
    // version restated returnOnExtra's definition and would pass for any formula.
    const cols = columns();
    const five = cols[0];
    const twenty = cols.find((c) => c.dpPct === 20)!;
    const result = recommend(cols);
    if (result.kind !== "twenty") throw new Error("expected twenty");
    expect(result.returnOnExtra).toBeCloseTo(
      (five.costOfBorrowing - twenty.costOfBorrowing) / (twenty.net - five.net),
      6,
    );
    // NOT asserted to be above 1.0. At this scenario it is 0.91, which is why the
    // ported copy claiming 20% "typically returns more than 1:1" had to go: the
    // page printed a figure contradicting its own advice two rows below it.
    expect(result.returnOnExtra).toBeGreaterThan(0);
  });

  it("keeps fundability independent of approval", () => {
    // recommend() tests approval FIRST, deliberately. The bug that ordering hid:
    // a household no lender would approve returned "noneQualify" whether or not
    // funds were ever given, and the page painted its cash row green over a
    // table of em-dashes. The columns still have to carry the honest null.
    const cols = columns({ qualIncome: 20000, funds: null });
    expect(recommend(cols)).toEqual({ kind: "noneQualify" });
    expect(cols.every((c) => c.fundable === null)).toBe(true);
  });

  it("does not push past 20%, where each extra dollar earns only the mortgage rate", () => {
    const result = recommend(columns({ funds: 400000 }));
    expect(result.kind).toBe("twenty");
    if (result.kind === "twenty") expect(result.pct).toBe(20);
  });

  it("falls back to the lowest fundable column when 20% is out of reach", () => {
    // Enough to close at 5% but not at 20%.
    const cols = columns();
    const fiveNet = cols[0].net;
    const result = recommend(columns({ funds: fiveNet + 500 }));
    expect(result.kind).toBe("only");
    if (result.kind === "only") {
      expect(result.pct).toBe(5);
      expect(result.extraCash).toBeGreaterThan(0);
    }
  });
});

describe("returnOnExtra is reported, never relied on", () => {
  it("is below 1.00 at every price the product can model, on the shipped rates", () => {
    // This is why the recommendation's rationale had to be rewritten. The
    // premium saved does not outrun fifteen extra points of deposit over 25
    // undiscounted years.
    //
    // The lower bound moved 0.8 -> 0.7 when the 2026 verification pass replaced
    // the 10-basis-point insured/uninsured spread with the ~30bp one lenders
    // actually quote (3.94 / 4.24). A wider spread makes 20% down cost MORE
    // interest per dollar, so the ratio fell from 0.88-0.95 to 0.72-0.74 and the
    // "more than a dollar back" claim is further from true than before, not
    // nearer.
    //
    // If the upper bound ever fails, read it as an invitation, not a break: the
    // rates moved and the claim may be live again. But check the SPREAD before
    // restoring any copy -- at 6.0/6.5 the ratio is back under 1.0 at every
    // price, so a higher level alone does not do it.
    for (const price of [400000, 600000, 900000, 1200000, 1400000]) {
      const result = recommend(columns({ price, qualIncome: price / 2, funds: price }));
      if (result.kind !== "twenty") throw new Error(`expected twenty at ${price}`);
      expect(result.returnOnExtra, `at ${price}`).toBeLessThan(1);
      expect(result.returnOnExtra, `at ${price}`).toBeGreaterThan(0.7);
    }
  });

  it("still recommends 20%, on the ground that does survive", () => {
    // The premium goes to zero and the payment falls. Both are unconditional and
    // neither depends on the ratio.
    const cols = columns({ funds: 400000 });
    const five = cols[0];
    const twenty = cols.find((c) => c.dpPct === 20)!;
    expect(recommend(cols).kind).toBe("twenty");
    expect(five.premium).toBeGreaterThan(0);
    expect(twenty.premium).toBe(0);
    expect(twenty.monthly.total).toBeLessThan(five.monthly.total);
  });
});
