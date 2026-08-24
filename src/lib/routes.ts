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
