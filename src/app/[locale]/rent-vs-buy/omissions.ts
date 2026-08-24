/**
 * The omissions each side of the rent-vs-buy comparison carries.
 *
 * A sibling module rather than exports from `page.tsx`: Next reserves the named
 * export surface of a route module for its own conventions, and these existed
 * only so the page's test could read their lengths. Their lengths also feed the
 * section's line, so the sentence cannot drift out of step with the list.
 */
/**
 * The namespace these keys resolve against.
 *
 * Declared rather than implied: `messages-coverage.test.ts` scopes its orphan
 * scan to files that name the namespace, and moving these arrays out of
 * `page.tsx` took them out of that scope — the seven keys below instantly read
 * as dead copy. An exported constant states the relationship the move broke.
 */
export const OMISSIONS_NAMESPACE = "RentVsBuy";

export const FAVOURS_BUYING = ["fb1", "fb2", "fb3", "fb4"] as const;
export const FAVOURS_RENTING = ["fr1", "fr2", "fr3"] as const;
