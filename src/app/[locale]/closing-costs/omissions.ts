/**
 * Real costs and real timing this bill deliberately does not price.
 *
 * The product's data layer already has a word for this — `conf: "none"`, "nobody
 * publishes it and we will not invent one" — and until now that word produced
 * SILENCE, which on a closing-cost bill is indistinguishable from "this cost does
 * not exist". A reader who has never bought here cannot tell the difference, and
 * the two most expensive surprises on a Canadian closing (the deposit's timing and
 * a builder's adjustments) both sit in that gap.
 *
 * Shaped exactly like `rent-vs-buy/omissions.ts`, on purpose: a module-level array
 * whose LENGTH feeds the sentence introducing it, so the count can never drift out
 * of step with the list. A sibling module rather than exports from `page.tsx` for
 * the same reason it is one there — Next reserves a route module's named export
 * surface for its own conventions.
 *
 * Nothing here carries a figure, and that is the point rather than a limitation:
 * a deposit is negotiated per offer, a builder's levies have no publisher, and an
 * adjustment prorates by day from a closing date this app never asks for. Naming
 * the obligation is honest; pricing it would be the invention this list exists to
 * refuse.
 */

/**
 * The namespace these keys resolve against.
 *
 * Declared rather than implied: `messages-coverage.test.ts` scopes its orphan scan
 * to files that name the namespace, so an array of bare key strings in a file that
 * never mentions `ClosingCosts` reads as dead copy.
 */
export const OMISSIONS_NAMESPACE = "ClosingCosts";

/** True of every purchase. */
export const NOT_PRICED = ["omDeposit", "omAdjustments"] as const;

/**
 * Added only for `ptype === "newbuild"`. A resale buyer has no builder and no
 * statement of adjustments, and an inventory that lists costs that cannot apply
 * spends the reader's attention teaching them to skim it.
 */
export const NOT_PRICED_NEWBUILD = ["omNewBuild"] as const;
