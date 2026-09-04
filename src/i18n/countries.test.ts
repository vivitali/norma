import { describe, expect, it } from "vitest";
import { COUNTRIES } from "./countries";
import type { Country as RoutingCountry } from "./countries";
import { RULES } from "@/domain/rules";
import type { Country as DomainCountry } from "@/domain/types";

/**
 * Two independent total registries carry a `Country` union: `COUNTRIES` here (routing —
 * segment, language order) and `RULES` in `src/domain/rules/index.ts` (calculation rules per
 * market). They are declared separately on purpose — `src/domain` must not import from
 * `src/i18n` (see CLAUDE.md) — so nothing stops them drifting apart except a check that reads
 * both. This file is that check, and it belongs here rather than in `src/domain` for exactly
 * that reason.
 *
 * The two were briefly allowed to be OUT of sync in one direction, for the span of
 * `docs/superpowers/specs/2026-08-29-us-market-design.md`'s implementation order: step 3
 * (`rules/us.ts`) and step 4 (Houston) landed `RULES.us` on a domain-only branch BEFORE any
 * route could reach it, precisely so a wrong land-transfer-tax figure and a wrong redirect were
 * never reviewed together (see the spec's Decision 1, "why /ca/ landed as its own PR"). The
 * UI/routing branch has since added `us` to `COUNTRIES` too, so this file is back to the exact
 * two-way match it enforces for every other pairing — a country routed with no rules, or ruled
 * with no route, is now equally a compile error and a test failure.
 */

/** Compile error the moment either registry names a country the other lacks — in EITHER
 * direction, now that both `COUNTRIES` and `RULES` name the same two countries. */
type AssertSameCountries<A extends string, B extends string> = [A] extends [B]
  ? [B] extends [A]
    ? true
    : never
  : never;
const _countriesMatchRules: AssertSameCountries<RoutingCountry, DomainCountry> = true;
void _countriesMatchRules;

describe("Country registries stay in sync", () => {
  it("routes exactly the countries RULES has rules for, and no others", () => {
    const routed = Object.keys(COUNTRIES).sort();
    const ruled = Object.keys(RULES).sort();
    expect(routed).toEqual(ruled);
  });
});
