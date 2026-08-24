/**
 * Closing-day cash, as a state rather than a number.
 *
 * "Tight" is a state this product asserts and no lender does: closing with
 * almost nothing left is not a failure by any bank's test, and it is still the
 * thing most likely to go wrong three weeks later. Drawing the line at 5% of the
 * bill is a judgement, stated here in one place so it can be argued with.
 */
export type CashState = "pass" | "caution" | "blocked" | "unanswered";

/** Below this share of the bill left over, "you can close" is technically true and misleading. */
export const RESERVE_FRACTION = 0.05;

export function cashState({ net, funds }: { net: number; funds: number | null }): CashState {
  // Not told is its own state, never a zero. A reader who has not said what they
  // have must not be shown a red verdict computed from a number they never gave.
  if (funds === null) return "unanswered";
  const left = funds - net;
  if (left < 0) return "blocked";
  return left < net * RESERVE_FRACTION ? "caution" : "pass";
}
