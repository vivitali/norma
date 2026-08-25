import { describe, expect, it } from "vitest";
import { defaultContractRate, minDown } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { getJurisdiction, jurisdictions } from "@/domain/jurisdictions";
import { TOOL_DEFAULTS } from "./shared-inputs";
import {
  anySourceGiven,
  benchmarkPrice,
  DEFAULT_COMFORT_CEILING,
  DEFAULT_RENT,
  isPersonalised,
  resolveInputs,
} from "./resolve-inputs";

const winnipeg = getJurisdiction("winnipeg")!;
const vancouver = getJurisdiction("vancouver")!;
const untouched = TOOL_DEFAULTS;

describe("resolveInputs", () => {
  it("derives price from the city benchmark for the chosen property type", () => {
    // A Winnipeg user and a Vancouver user must not both start at $450,000.
    expect(resolveInputs(untouched, winnipeg, federal).price).toBe(winnipeg.bench.house);
    expect(resolveInputs(untouched, vancouver, federal).price).toBe(vancouver.bench.house);
    expect(winnipeg.bench.house).not.toBe(vancouver.bench.house);
  });

  it("follows the property type", () => {
    const condo = { ...untouched, ptype: "condo" as const };
    expect(resolveInputs(condo, winnipeg, federal).price).toBe(winnipeg.bench.condo);
  });

  it("keeps an edited price across a jurisdiction change", () => {
    const edited = { ...untouched, price: 512345 };
    expect(resolveInputs(edited, winnipeg, federal).price).toBe(512345);
    expect(resolveInputs(edited, vancouver, federal).price).toBe(512345);
  });

  it("derives the contract rate from the down payment", () => {
    expect(resolveInputs({ ...untouched, dpPct: 10 }, winnipeg, federal).contractRate).toBeCloseTo(
      federal.rates.insured * 100,
      10,
    );
    expect(resolveInputs({ ...untouched, dpPct: 20 }, winnipeg, federal).contractRate).toBeCloseTo(
      federal.rates.uninsured * 100,
      10,
    );
  });

  it("keeps an overridden contract rate across the 20% boundary", () => {
    const over = { ...untouched, contractRate: 5.75 };
    expect(resolveInputs({ ...over, dpPct: 10 }, winnipeg, federal).contractRate).toBe(5.75);
    expect(resolveInputs({ ...over, dpPct: 20 }, winnipeg, federal).contractRate).toBe(5.75);
  });

  it("sums the four named debts", () => {
    const r = resolveInputs(
      { ...untouched, car: 550, student: 200, cc: 75, otherDebt: 0 },
      winnipeg,
      federal,
    );
    expect(r.debts).toBe(825);
  });

  it("treats untouched debts as zero, not as an assumed payment", () => {
    expect(resolveInputs(untouched, winnipeg, federal).debts).toBe(0);
  });

  it("treats an absent second applicant as absent, not as one earning nothing", () => {
    // The accepted ruling: a co-buyer is not assumed. Defaulting income2 to a
    // real figure roughly doubles every new visitor's headline number from a
    // fact they never gave.
    expect(resolveInputs(untouched, winnipeg, federal).income2).toBe(0);
    expect(resolveInputs({ ...untouched, income2: 45000 }, winnipeg, federal).income2).toBe(45000);
  });

  it("derives condoFee to 0 even for a condo", () => {
    // We have no strata-fee data. Inventing one would be a rule with no source;
    // the comfort check asks for it inline instead.
    const condo = { ...untouched, ptype: "condo" as const };
    expect(resolveInputs(condo, winnipeg, federal).condoFee).toBe(0);
  });

  it("leaves funds and save null — there is nothing honest to assume", () => {
    const r = resolveInputs(untouched, winnipeg, federal);
    expect(r.funds).toBeNull();
    expect(r.save).toBeNull();
  });

  it("passes an answered funds figure through", () => {
    expect(resolveInputs({ ...untouched, funds: 50000 }, winnipeg, federal).funds).toBe(50000);
  });

  it("resolves the comfort ceiling to the named constant", () => {
    expect(resolveInputs(untouched, winnipeg, federal).comfortCeiling).toBe(DEFAULT_COMFORT_CEILING);
  });

  it("resolves a blanked field back to its derived default", () => {
    // Blanking is how a user says "go back to what you had". Empty commits null
    // from NumberField, and null re-derives here.
    const edited = { ...untouched, price: 999999 };
    expect(resolveInputs({ ...edited, price: null }, winnipeg, federal).price).toBe(
      winnipeg.bench.house,
    );
  });

  it("produces no nulls except the unknowns and the one absent-by-meaning field", () => {
    const r = resolveInputs(untouched, winnipeg, federal);
    const nulls = Object.entries(r)
      .filter(([, v]) => v === null)
      .map(([k]) => k);
    // funds and save are UNKNOWNS: nothing honest to assume. renewalRate is a
    // third thing again -- null there means "no renewal shock modelled", which
    // is a modelling choice, not a missing answer, and resolving it to a number
    // would silently assert a rate the reader never predicted.
    expect(nulls.sort()).toEqual(["funds", "renewalRate", "save"]);
  });

  it("resolves every down-payment source to a number, and remembers that none was given", () => {
    // The two facts drive different screens. Zero is right for the arithmetic;
    // reporting a shortfall on a first visit and blaming the reader is not.
    const r = resolveInputs(untouched, winnipeg, federal);
    expect([r.fhsa, r.cashSav, r.rrsp, r.tfsa, r.gift, r.nonreg]).toEqual([0, 0, 0, 0, 0, 0]);
    expect(anySourceGiven(untouched)).toBe(false);
    expect(anySourceGiven({ ...untouched, tfsa: 12000 })).toBe(true);
  });

  it("takes taxable income from the household income already given", () => {
    const r = resolveInputs({ ...untouched, income1: 80000, income2: 40000 }, winnipeg, federal);
    expect(r.taxIncome).toBe(120000);
  });

  it("takes benchmark rent from the jurisdiction, not a universal constant", () => {
    const r = resolveInputs(untouched, winnipeg, federal);
    expect(r.rent).toBe(winnipeg.rent ?? DEFAULT_RENT);
  });

  it("says whether there is a price to model at all", () => {
    // The zero behind an unpublished benchmark is arithmetic, and a screen must be able
    // to tell it from a house that costs nothing. Without this the pages had only
    // `price`, and `$0 <= your ceiling` is "within reach".
    expect(resolveInputs(untouched, winnipeg, federal).priceKnown).toBe(true);
    const territory = getJurisdiction("yt")!;
    expect(benchmarkPrice(territory, "house")).toBeNull();
    const unpriced = resolveInputs(untouched, territory, federal);
    expect(unpriced.priceKnown).toBe(false);
    expect(unpriced.price).toBe(0);
    // The reader's own price is a price, wherever they are.
    expect(resolveInputs({ ...untouched, price: 640000 }, territory, federal).priceKnown).toBe(true);
  });

  it("does not count a typed zero as a price", () => {
    // Zero is REACHABLE: the schema is `{ kind: "number", nullable: true, min: 0 }` and
    // NumberField clamps to the minimum and commits, so it is one keystroke away on every
    // page. `stored.price !== null` admitted it, which put back every defect the unpublished
    // -benchmark work removed — a $0 payment on Amortization, the fixed lawyer and moving
    // fees printed as "cash needed at closing", "$0 is within reach" on Affordability — in a
    // priced city, where nothing else on the page suggests anything is missing.
    //
    // It falls through to the benchmark, like the blank field it means, rather than being
    // treated as an unpriced market: the ask is worded "Nobody publishes a benchmark price
    // for {place}", and in Winnipeg somebody does.
    const zeroed = resolveInputs({ ...untouched, price: 0 }, winnipeg, federal);
    expect(zeroed.price).toBe(winnipeg.bench.house);
    expect(zeroed.priceKnown).toBe(true);
    // Where nothing is published there is nothing to fall through to, and the zero stays a
    // zero that no screen may print an answer from.
    const territory = getJurisdiction("yt")!;
    const nowhere = resolveInputs({ ...untouched, price: 0 }, territory, federal);
    expect(nowhere.price).toBe(0);
    expect(nowhere.priceKnown).toBe(false);
  });

  it("keeps price and priceKnown from ever disagreeing", () => {
    // The invariant the fix above rests on, asserted directly rather than left implied:
    // every consumer branches on `priceKnown` and then prints `price`, so a true flag over a
    // zero is the $0 headline with a permission slip.
    for (const j of jurisdictions) {
      for (const ptype of ["house", "condo", "newbuild"] as const) {
        for (const price of [null, 0, 640000]) {
          const r = resolveInputs({ ...untouched, ptype, price }, j, federal);
          expect(r.priceKnown, `${j.id}/${ptype}/${price}`).toBe(r.price > 0);
        }
      }
    }
  });

  it("says whether the rent being compared against is anybody's real rent", () => {
    // Six records carry no rent — CMHC suppresses every Yukon cell and does not survey
    // Nunavut. DEFAULT_RENT keeps the arithmetic defined, but it is a national
    // placeholder, and attributing it to the place that published nothing is exactly the
    // invented figure this product exists not to ship.
    expect(resolveInputs(untouched, winnipeg, federal).rentKnown).toBe(true);
    const territory = getJurisdiction("nu")!;
    expect(territory.rent ?? null).toBeNull();
    const unrented = resolveInputs(untouched, territory, federal);
    expect(unrented.rentKnown).toBe(false);
    expect(unrented.rent).toBe(DEFAULT_RENT);
    expect(resolveInputs({ ...untouched, rent: 2300 }, territory, federal).rentKnown).toBe(true);
  });

  it("does not count a typed zero as a rent either", () => {
    // The identical hole, in the identical shape: `rent` is nullable with `min: 0`, so a
    // reader can commit 0, and `stored.rent !== null` called it a rent. Rent vs Buy would
    // then print a verdict resting on living somewhere for nothing — and it would pick the
    // renting side every time, which is the one verdict on the page nobody should be able to
    // buy with a keystroke.
    // Same resolution as the price: the zero falls through to the figure published for
    // here, which is a real rent, so the comparison is the one the untouched page makes.
    const zeroed = resolveInputs({ ...untouched, rent: 0 }, winnipeg, federal);
    expect(zeroed.rent).toBe(winnipeg.rent);
    expect(zeroed.rentKnown).toBe(true);
    // And where CMHC published nothing there is nothing to fall through to: the zero does
    // not become a rent, the placeholder stands only so the arithmetic is defined, and the
    // page asks instead of printing a verdict.
    const territory = getJurisdiction("nu")!;
    const nowhere = resolveInputs({ ...untouched, rent: 0 }, territory, federal);
    expect(nowhere.rentKnown).toBe(false);
    expect(nowhere.rent).toBe(DEFAULT_RENT);
  });

  it("keeps the down-payment floor off a price it does not have", () => {
    // minDown() of nothing is nothing, so a raise would be announced against a $0
    // deposit on a $0 house. The page asks for a price instead.
    const unpriced = resolveInputs({ ...untouched, dpPct: 5 }, getJurisdiction("nt")!, federal);
    expect(unpriced.belowMinimum).toBe(false);
    expect(unpriced.dpPct).toBe(5);
  });

  it("converts rent inflation from the stored percentage to the fraction the engine takes", () => {
    const r = resolveInputs({ ...untouched, rentInflation: 3 }, winnipeg, federal);
    expect(r.rentInflation).toBeCloseTo(0.03, 10);
  });
});

describe("isPersonalised", () => {
  it("is false on an untouched form", () => {
    expect(isPersonalised(untouched)).toBe(false);
  });
  it("is true once income is given", () => {
    expect(isPersonalised({ ...untouched, income1: 92000 })).toBe(true);
  });
  it("is true once a second applicant is added", () => {
    expect(isPersonalised({ ...untouched, income2: 45000 })).toBe(true);
  });
  it("is true once any of the four debts is given", () => {
    for (const key of ["car", "student", "cc", "otherDebt"] as const) {
      expect(isPersonalised({ ...untouched, [key]: 100 })).toBe(true);
    }
  });
  it("is true once funds are given", () => {
    expect(isPersonalised({ ...untouched, funds: 30000 })).toBe(true);
  });
  it("is true once the monthly ceiling is stated", () => {
    // The user's own limit, and the single input driving the headline figure.
    expect(isPersonalised({ ...untouched, comfortCeiling: 3100 })).toBe(true);
  });
  it("is false for a price change alone", () => {
    // Price is the target being tested, not the household's situation.
    expect(isPersonalised({ ...untouched, price: 600000 })).toBe(false);
  });
});

describe("isPersonalised — every page's own inputs count", () => {
  // The predicate was written for Affordability and drives the typical/yours
  // badge on all nine pages. A reader who filled in six account balances on Down
  // Payment, or a contribution and a withdrawal on RRSP-HBP, was still told the
  // answer above them was "typical".
  const CASES: [string, Partial<typeof untouched>][] = [
    ["a down-payment source", { tfsa: 30000 }],
    ["every down-payment source", { fhsa: 1, cashSav: 1, rrsp: 1, tfsa: 1, gift: 1, nonreg: 1 }],
    ["an HBP contribution", { hbpContribution: 40000 }],
    ["an HBP withdrawal", { hbpWithdraw: 40000 }],
    ["taxable income", { taxIncome: 120000 }],
    ["the rent being compared against", { rent: 2400 }],
    ["a monthly saving rate", { save: 800 }],
  ];
  for (const [what, patch] of CASES) {
    it(`is true once the reader gives ${what}`, () => {
      expect(isPersonalised({ ...untouched, ...patch })).toBe(true);
    });
  }

  it("stays false for the question being asked, not the household asking it", () => {
    // dpPct, amortization, property type and the rent-vs-buy assumptions all have
    // non-null defaults. Counting them would pin the badge to "yours" forever.
    expect(
      isPersonalised({ ...untouched, dpPct: 25, amortYears: 25, ptype: "condo", holding: 25 }),
    ).toBe(false);
  });
});

describe("the legal minimum down payment", () => {
  it("raises a request below the floor, and says it did", () => {
    // 5% is legal below $500,000 and not above it. A page that amortized 5% on a
    // $1.6M house would be quoting a mortgage no lender in Canada may write.
    const r = resolveInputs({ ...untouched, price: 1600000, dpPct: 5 }, winnipeg, federal);
    expect(r.belowMinimum).toBe(true);
    expect(r.dpPctRequested).toBe(5);
    expect(r.dpPct).toBeGreaterThan(5);
    expect((r.price * r.dpPct) / 100).toBeCloseTo(minDown(1600000), 4);
  });

  it("leaves a legal request exactly alone", () => {
    const r = resolveInputs({ ...untouched, price: 400000, dpPct: 5 }, winnipeg, federal);
    expect(r.belowMinimum).toBe(false);
    expect(r.dpPct).toBe(5);
  });

  it("prices the contract rate off the MODELLED percentage, not the requested one", () => {
    // Being raised to 20% removes the insurance premium, which is exactly when
    // the rate offered changes. Deriving it from the request would quote an
    // insured rate on an uninsured mortgage.
    const raised = resolveInputs({ ...untouched, price: 3000000, dpPct: 5 }, winnipeg, federal);
    expect(raised.dpPct).toBeCloseTo(20, 6);
    expect(raised.contractRate).toBeCloseTo(defaultContractRate(federal, 20), 10);
  });
});

describe("the blended tier — where the floor is not a round number", () => {
  // Between $500,000 and $1,500,000 the minimum is 5% on the first 500k and 10%
  // above it, so the floor lands on values like 7.88%. This band is what makes
  // binding a four-option control to the FLOORED percentage dangerous: no option
  // matches, SegmentedGroup gives no button aria-checked, every button gets
  // tabIndex -1, and the whole radiogroup leaves the tab order. The two prices
  // originally tested ($400k and $1.6M) are precisely the two where that cannot
  // happen -- one has no floor, the other floors to exactly 20.
  const blended = { ...untouched, price: 900000, dpPct: 5 };

  it("floors to a percentage that is not one of the offered options", () => {
    const r = resolveInputs(blended, winnipeg, federal);
    expect(r.belowMinimum).toBe(true);
    expect([5, 10, 20, 25]).not.toContain(r.dpPct);
    expect(r.dpPct).toBeGreaterThan(5);
    expect(r.dpPct).toBeLessThan(10);
  });

  it("keeps the reader's own choice addressable, so a control can bind to it", () => {
    expect(resolveInputs(blended, winnipeg, federal).dpPctRequested).toBe(5);
  });

  it("floors in dollars, matching the rule's own unit and scenario()'s threshold", () => {
    // A request a fraction of a dollar under the floor is a rounding artefact,
    // not someone asking for something illegal.
    const price = 900000;
    const exact = (minDown(price) / price) * 100;
    const hair = ((minDown(price) - 0.25) / price) * 100;
    expect(resolveInputs({ ...untouched, price, dpPct: exact }, winnipeg, federal).belowMinimum).toBe(false);
    expect(resolveInputs({ ...untouched, price, dpPct: hair }, winnipeg, federal).belowMinimum).toBe(false);
  });
});

describe("benchmarkPrice", () => {
  it("returns the published series for house and condo", () => {
    expect(benchmarkPrice(winnipeg, "house")).toBe(winnipeg.bench.house);
    expect(benchmarkPrice(winnipeg, "condo")).toBe(winnipeg.bench.condo);
  });

  it("reads a new build off the resale house benchmark", () => {
    // `bench.newbuild` is gone: no publisher produces a new-build price level in Canada,
    // so all fourteen of its values were invented. The resale house benchmark for the same
    // city is at least a figure someone published, and the reader supplies the developer's
    // price. `ptype: "newbuild"` stays a tax and warranty treatment.
    expect(benchmarkPrice(winnipeg, "newbuild")).toBe(winnipeg.bench.house);
    expect(resolveInputs({ ...untouched, ptype: "newbuild" }, winnipeg, federal).price).toBe(
      winnipeg.bench.house,
    );
  });

  it("exposes the benchmark separately from the price it seeded", () => {
    // A screen showing the benchmark as a hint must branch on this, not on `price`:
    // an edited price is still a price when no benchmark exists behind it.
    const r = resolveInputs({ ...untouched, price: 512345 }, winnipeg, federal);
    expect(r.price).toBe(512345);
    expect(r.benchmark).toBe(winnipeg.bench.house);
  });

  it("has a published benchmark everywhere except where provenance says nobody publishes one", () => {
    // NARROWED, deliberately, as this test's previous comment said it would have to be: the
    // per-region verification tasks null out the benchmarks no publisher produces, starting
    // with Saskatoon's apartment series. The invariant is not dropped, it is re-pointed — a
    // benchmark may be null ONLY where that record's own provenance records conf "none" for
    // the field, which is the milestone's rule that an unsourced figure is never displayed.
    // So resolveInputs' `?? 0` last rung is now reachable, and `priceKnown` is the fact a
    // screen branches on: every page whose figures derive from the price asks for one in
    // place rather than printing an answer built on that zero.
    for (const j of jurisdictions) {
      for (const ptype of ["house", "condo", "newbuild"] as const) {
        if (benchmarkPrice(j, ptype) !== null) continue;
        const field = ptype === "newbuild" ? "house" : ptype;
        expect(j.provenance[`bench.${field}`]?.conf, `${j.id}.${ptype} is null`).toBe("none");
      }
    }
  });
});
