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
 * The two are deliberately allowed to be OUT of sync in one direction, for the span of
 * `docs/superpowers/specs/2026-08-29-us-market-design.md`'s implementation order: step 3
 * (`rules/us.ts`) and step 4 (Houston) land RULES.us on a domain-only branch BEFORE any route
 * can reach it, precisely so a wrong land-transfer-tax figure and a wrong redirect are never
 * reviewed together (see the spec's Decision 1, "why /ca/ landed as its own PR"). So the
 * invariant this file actually enforces is one-directional: every country COUNTRIES routes to
 * MUST have rules (you cannot route to a country with no calculation engine behind it) — not
 * that every country WITH rules is already routed. Tighten this back to the exact two-way match
 * once the UI/routing branch adds `us` to `COUNTRIES`; until then a one-way match here would be
 * a false alarm on every commit of the domain-only branch, not a real drift.
 */

/** Compile error the moment COUNTRIES names a country RULES has no rules for. The reverse —
 * RULES ahead of COUNTRIES — is the expected, temporary state described above. */
type AssertRoutedHasRules<Routed extends string, Ruled extends string> = [Routed] extends [Ruled]
  ? true
  : never;
const _everyRoutedCountryHasRules: AssertRoutedHasRules<RoutingCountry, DomainCountry> = true;
void _everyRoutedCountryHasRules;

describe("Country registries stay in sync", () => {
  it("gives every country COUNTRIES routes a RULES entry (RULES may be ahead, never behind)", () => {
    const routed = Object.keys(COUNTRIES).sort();
    const ruled = Object.keys(RULES).sort();
    for (const country of routed) {
      expect(ruled, `RULES has no entry for routed country "${country}"`).toContain(country);
    }
  });
});
