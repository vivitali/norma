import { routing } from "@/i18n/routing";

export type RouteKey = keyof typeof routing.pathnames;

export interface NavEntry {
  route: RouteKey;
  /** Message key under the `Nav` namespace. */
  label: string;
  /**
   * Whether the page exists yet. The registry records the information architecture for all nine
   * routes now — that decision is what this milestone exists to fix — while the renderer shows
   * only what a user can actually reach. Shipping a page means flipping this to true.
   */
  built: boolean;
}

export interface NavGroup {
  /** Message key under the `Nav` namespace. */
  heading: string;
  entries: readonly NavEntry[];
}

/**
 * Grouped by the buyer's journey, in the NAVIGATION only — the URLs stay flat. Keeping grouping
 * out of the path is what lets Rent vs Buy appear under both `afford` and `own` honestly, and it
 * means regrouping later costs nothing while a nested URL would have been permanent.
 */
export const NAV: readonly NavGroup[] = [
  {
    heading: "afford",
    entries: [
      { route: "/affordability", label: "affordability", built: true },
      { route: "/rent-vs-buy", label: "rentVsBuy", built: true },
    ],
  },
  {
    heading: "buy",
    entries: [
      { route: "/closing-costs", label: "closingCosts", built: true },
      { route: "/down-payment", label: "downPayment", built: true },
      { route: "/rrsp-hbp", label: "rrspHbp", built: true },
    ],
  },
  {
    heading: "own",
    entries: [
      { route: "/amortization", label: "amortization", built: true },
      { route: "/rent-vs-buy", label: "rentVsBuy", built: true },
    ],
  },
  {
    heading: "utility",
    entries: [
      { route: "/scenarios", label: "scenarios", built: true },
      { route: "/sources", label: "sources", built: true },
    ],
  },
];

export function builtEntries(group: NavGroup): readonly NavEntry[] {
  return group.entries.filter((e) => e.built);
}

/**
 * The footer registry — destinations that are obligations rather than tools.
 *
 * Deliberately NOT a fifth NAV group. `NAV` is grouped by the buyer's journey and every entry in
 * it answers a question the reader came with; a privacy policy answers a question the reader did
 * not ask and the law obliges us to answer anyway. Putting them in the menu panel would rank them
 * beside Affordability and Closing Costs, which misstates what they are, and would push the
 * panel's four columns to five for two links nobody browses to.
 *
 * They still need a registry rather than two hardcoded `<Link>`s, for the same reason NAV is one:
 * `routes.test.ts` checks `routing.pathnames` against NAV ∪ FOOTER in both directions, so a route
 * added to routing.ts and forgotten here fails the suite instead of becoming silently unreachable.
 *
 * `built` is kept for symmetry with NavEntry, and because these two pages ship in the same commit
 * as this registry — a false here would mean a footer link to a 404.
 */
export interface FooterEntry {
  route: RouteKey;
  /**
   * Message key under the `Legal` namespace — NOT `Nav`, which is why this is its own type rather
   * than a reused `NavEntry`. A check written against `NavEntry` would look in the wrong catalogue.
   */
  label: string;
}

/**
 * No `built` flag, deliberately, where `NavEntry` has one. NAV's flag earns its place because the
 * registry recorded all nine routes before the pages existed and the renderer filtered them. Both
 * of these pages ship in the same commit as this registry, so a `built: false` here would describe
 * a state that has never existed — and `routes.test.ts` asserting every entry is reachable would
 * make the filter unfalsifiable: a flag the tests prove can never be false is documentation of an
 * impossible capability, not a safeguard.
 */
export const FOOTER: readonly FooterEntry[] = [
  { route: "/privacy", label: "privacy" },
  { route: "/terms", label: "terms" },
];
