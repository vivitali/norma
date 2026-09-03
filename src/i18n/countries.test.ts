import { describe, expect, it } from "vitest";
import { COUNTRIES } from "./countries";
import type { Country as RoutingCountry } from "./countries";
import { RULES } from "@/domain/rules";
import type { Country as DomainCountry } from "@/domain/types";

/**
 * Two independent total registries carry the same `Country` union: `COUNTRIES` here
 * (routing — segment, language order) and `RULES` in `src/domain/rules/index.ts`
 * (calculation rules per market). They are declared separately on purpose —
 * `src/domain` must not import from `src/i18n` (see CLAUDE.md) — so nothing stops
 * them drifting apart except a check that reads both. This file is that check, and
 * it belongs here rather than in `src/domain` for exactly that reason.
 */

/** Compile error the moment the two `Country` unions diverge, either direction. */
type AssertSameUnion<A extends string, B extends string> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never;
const _countryUnionsInSync: AssertSameUnion<RoutingCountry, DomainCountry> = true;
void _countryUnionsInSync;

describe("Country registries stay in sync", () => {
  it("gives RULES exactly the countries COUNTRIES routes, no more and no fewer", () => {
    const routed = Object.keys(COUNTRIES).sort();
    const ruled = Object.keys(RULES).sort();
    expect(ruled).toEqual(routed);
  });
});
