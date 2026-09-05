import { routing } from "@/i18n/routing";
import type { Country } from "@/i18n/countries";
import { ROUTE_COUNTRIES as OG_ROUTE_COUNTRIES, type IndexableRoute } from "./og-manifest";

export type RouteKey = keyof typeof routing.pathnames;

/**
 * Which countries each route exists in, keyed by the same route strings `routing.pathnames`
 * declares — re-exported from `src/lib/og-manifest.ts` rather than restated, since that file
 * already has to carry this data import-free for `scripts/generate-og.mjs` and
 * `scripts/assert-prerendered.mjs`. One source; `routes-availability.test.ts` pins `RouteKey`
 * and `IndexableRoute` as the same key set so this cast can never silently paper over a route
 * that exists in one list and not the other.
 */
export const ROUTE_COUNTRIES: Record<RouteKey, readonly Country[]> = OG_ROUTE_COUNTRIES as Record<
  IndexableRoute,
  readonly Country[]
>;

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
  /**
   * Which countries this route exists in — read off `ROUTE_COUNTRIES` above rather than
   * hand-written per entry, so a route can only ever disagree with itself by editing
   * `og-manifest.ts`, never by two call sites drifting apart. RRSP-HBP is Canada-only; every
   * other route lists every registered country (US-market spec, "RRSP-HBP is absent from the
   * US navigation").
   */
  countries: readonly Country[];
}

export interface NavGroup {
  /** Message key under the `Nav` namespace. */
  heading: string;
  entries: readonly NavEntry[];
}

/** Builds one NavEntry, reading its `countries` off `ROUTE_COUNTRIES` so it can never
 * be written inconsistently with `og-manifest.ts`. */
function entry(route: RouteKey, label: string): NavEntry {
  return { route, label, built: true, countries: ROUTE_COUNTRIES[route] };
}

/**
 * Grouped by the buyer's journey, in the NAVIGATION only — the URLs stay flat. Keeping grouping
 * out of the path is what lets Rent vs Buy appear under both `afford` and `own` honestly, and it
 * means regrouping later costs nothing while a nested URL would have been permanent.
 */
export const NAV: readonly NavGroup[] = [
  {
    heading: "afford",
    entries: [entry("/affordability", "affordability"), entry("/rent-vs-buy", "rentVsBuy")],
  },
  {
    heading: "buy",
    entries: [
      entry("/closing-costs", "closingCosts"),
      entry("/down-payment", "downPayment"),
      entry("/rrsp-hbp", "rrspHbp"),
    ],
  },
  {
    heading: "own",
    entries: [entry("/amortization", "amortization"), entry("/rent-vs-buy", "rentVsBuy")],
  },
  {
    heading: "utility",
    entries: [entry("/scenarios", "scenarios"), entry("/sources", "sources")],
  },
];

export function builtEntries(group: NavGroup): readonly NavEntry[] {
  return group.entries.filter((e) => e.built);
}
