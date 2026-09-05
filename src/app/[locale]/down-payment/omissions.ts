/**
 * What the funding waterfall does not model.
 *
 * The same mechanism as `rent-vs-buy/omissions.ts` and `closing-costs/omissions.ts`
 * — a module-level array whose length feeds its own introductory sentence — applied
 * to the two facts that decide whether assembled money is money a lender will
 * actually accept.
 *
 * Both are `conf: "none"` territory and neither may ever carry a number:
 *
 * - **Seasoning and source of funds.** Every lender asks where a down payment came
 *   from and how long it has sat where it is. The periods are lender policy and
 *   nobody publishes them, so the honest form is the obligation without a duration.
 * - **One buyer's caps.** `waterfall()` applies `F.hbp.max` once, and `resolved.fhsa`
 *   is one balance, while `income2` elsewhere in the app already says there may be a
 *   second buyer. Making the caps per person would require knowing whether the second
 *   person is also a first-time buyer — a fact this app does not have and does not
 *   ask for. So the model applies one buyer's caps and SAYS SO, which is the branch
 *   the review left open; the alternative, inviting combined balances while implying
 *   per-person room, would have the page contradict its own arithmetic.
 */

/** See `closing-costs/omissions.ts` — the orphan scan is namespace-scoped. */
export const OMISSIONS_NAMESPACE = "DownPayment";

export const NOT_MODELLED = ["omSeasoning", "omOneBuyerCaps"] as const;

/**
 * US: `omOneBuyerCaps` names a CA-only mechanic (`F.hbp.max` applied once), which
 * has no US analogue at all — there is no HBP to cap. `omIraTip` replaces it:
 * `rules.programs.fha` isn't the only US down-payment programme this page's engine
 * call leaves unmodelled — the IRA first-time-buyer $10,000 penalty exception and a
 * 401(k) loan are real sources `waterfall()` does not read (see its own doc comment,
 * "IRA first-time-buyer $10,000 penalty exception ... NOT modelled"). `omSeasoning`
 * stays: every lender, in either country, asks where money came from and how long
 * it has sat there.
 */
export const NOT_MODELLED_US = ["omSeasoning", "omIraTip"] as const;
