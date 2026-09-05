import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { NAV, ROUTE_COUNTRIES, type RouteKey } from "./routes";
import { ROUTE_COUNTRIES as OG_ROUTE_COUNTRIES, INDEXABLE_ROUTES, type IndexableRoute } from "./og-manifest";

/**
 * `RouteKey` (`keyof routing.pathnames`) and `IndexableRoute` (`og-manifest.ts`'s own
 * hand-written union) are two independently-declared key sets that `routes.ts` casts
 * one onto the other (`ROUTE_COUNTRIES: Record<RouteKey, …> = OG_ROUTE_COUNTRIES as
 * Record<IndexableRoute, …>`). A cast proves nothing at compile time — it is exactly
 * the mechanism that lets a route added to one list and forgotten in the other pass
 * silently. This pins them as the same set at runtime, so that cast can never paper
 * over real drift.
 */
describe("route availability", () => {
  it("RouteKey and IndexableRoute name exactly the same routes", () => {
    const routeKeys = Object.keys(routing.pathnames).sort();
    const indexable = [...INDEXABLE_ROUTES].sort();
    expect(routeKeys).toEqual(indexable);
  });

  it("routes.ts's ROUTE_COUNTRIES is og-manifest.ts's, not a second table", () => {
    // Not a deep-equal of two independently maintained literals — that would let both
    // drift together and still pass. This asserts the re-export IS the source object.
    expect(ROUTE_COUNTRIES as unknown).toBe(OG_ROUTE_COUNTRIES as unknown);
  });

  it("every NAV entry's countries match ROUTE_COUNTRIES for its route", () => {
    for (const group of NAV) {
      for (const entry of group.entries) {
        expect(entry.countries).toEqual(ROUTE_COUNTRIES[entry.route as RouteKey]);
      }
    }
  });

  it("RRSP-HBP is Canada-only — the one route this whole seam exists for today", () => {
    expect(ROUTE_COUNTRIES["/rrsp-hbp" as IndexableRoute]).toEqual(["ca"]);
  });

  it("every other indexable route lists every registered country", () => {
    const countries = new Set(Object.values(ROUTE_COUNTRIES).flat());
    for (const route of INDEXABLE_ROUTES) {
      if (route === "/rrsp-hbp") continue;
      expect(new Set(ROUTE_COUNTRIES[route])).toEqual(countries);
    }
  });
});
