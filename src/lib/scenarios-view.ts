import type { ScenarioResult } from "@/domain/engine";

/** The four columns the page compares. 20 is the one that removes the premium. */
export const SCENARIO_PERCENTS = [5, 10, 20, 25] as const;
export const PREMIUM_FREE_PCT = 20;

export type Recommendation =
  | { kind: "twenty"; pct: number; saving: number; extraCash: number; returnOnExtra: number }
  | { kind: "only"; pct: number; extraCash: number; months: number | null; saving: number }
  | { kind: "noneCash"; cheapest: ScenarioResult; months: number | null }
  | { kind: "noneQualify" }
  | { kind: "unanswered" };

/**
 * Which column to recommend, and why.
 *
 * The order of these tests is the argument, not an implementation detail:
 *
 * 1. **Approval first.** If no column passes the stress test, the constraint is
 *    income against debt and no deposit fixes it. Recommending a down payment
 *    there would be answering a question the reader does not have.
 * 2. **Then fundability.** A cheaper column you cannot fund is not an option, so
 *    a recommendation the reader cannot act on is not a recommendation.
 * 3. **Then 20%,** because it is the only threshold that removes the insurance
 *    premium outright and lowers the payment for the life of the loan. Above 20%
 *    each extra dollar earns exactly the mortgage rate, a much weaker case, so
 *    the page does not push past it.
 *
 * **The rationale here used to be "more than a dollar back per extra dollar of
 * deposit", and that is false.** Swept across the insurable range at the rates
 * in federal.ts, `returnOnExtra` runs 0.88 to 0.95 and never reaches 1.0: the
 * premium saved does not outrun fifteen extra points of deposit over twenty-five
 * undiscounted years at a 10-basis-point insured/uninsured spread.
 *
 * The reference shipped that claim at THESE rates — design-reference/hbt-data.js
 * carries the same 3.94/4.04 now in federal.ts — so it was wrong against its own
 * data rather than written for a different rate environment. Worth stating
 * plainly, because src/domain/ is a port of that file and a maintainer who
 * assumed otherwise would restore the copy the first time rates moved.
 *
 * And the SPREAD matters at least as much as the level. At 5.5/5.6 the ratio
 * runs 1.20–1.28 and at 6.0/6.1 it runs 1.31–1.40, but at 6.0/6.5 — a realistic
 * insured/uninsured gap rather than the current ten basis points — it falls back
 * to 0.91 across the whole range. So verifying rates upward does not by itself
 * bring the old claim back, and the sweep test guarding this will not fire
 * unless the spread stays narrow too.
 *
 * Returns `unanswered` when funds were never given: fundability is unknowable
 * then, and guessing it would put a verdict on the screen the reader never
 * supplied the input for.
 */
export function recommend(columns: readonly ScenarioResult[]): Recommendation {
  const qualifying = columns.filter((c) => c.qualifies);
  if (qualifying.length === 0) return { kind: "noneQualify" };

  // fundable is null for every column when funds are unknown — never false.
  if (columns.every((c) => c.fundable === null)) return { kind: "unanswered" };

  const affordable = qualifying.filter((c) => c.fundable === true);
  if (affordable.length === 0) {
    const cheapest = [...columns].sort((a, b) => a.net - b.net)[0];
    return { kind: "noneCash", cheapest, months: cheapest.months };
  }

  const twenty = affordable.find((c) => c.dpPct === PREMIUM_FREE_PCT);
  const lowest = [...affordable].sort((a, b) => a.dpPct - b.dpPct)[0];
  const target = columns.find((c) => c.dpPct === PREMIUM_FREE_PCT);
  const saving = target ? lowest.costOfBorrowing - target.costOfBorrowing : 0;
  const extraCash = target ? target.net - lowest.net : 0;

  if (twenty) {
    return {
      kind: "twenty",
      pct: PREMIUM_FREE_PCT,
      saving: lowest.costOfBorrowing - twenty.costOfBorrowing,
      extraCash: twenty.net - lowest.net,
      // Lifetime saving per dollar of extra deposit, undiscounted: nominal
      // interest over 25 years against dollars paid today. Reported, never
      // relied on -- see the note above about what it actually comes out at.
      returnOnExtra:
        twenty.net - lowest.net > 0
          ? (lowest.costOfBorrowing - twenty.costOfBorrowing) / (twenty.net - lowest.net)
          : 0,
    };
  }

  return { kind: "only", pct: lowest.dpPct, extraCash, months: target?.months ?? null, saving };
}
