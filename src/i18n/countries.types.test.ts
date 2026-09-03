import { describe, expectTypeOf, it } from "vitest";
import type { Locale, LocalePairsOf } from "./countries";

/**
 * Type-level only — `expectTypeOf` and `@ts-expect-error` are compile-time checks that
 * `tsc --noEmit` (part of `scripts/check`) already runs; nothing here executes at
 * runtime, so the `it` bodies are empty.
 *
 * Proves the property against a registry `COUNTRIES` does not itself declare, rather
 * than only ever exercising `LocalePairsOf` on the one country `COUNTRIES` has today.
 * `ca` and `us` here are FAKE — a two-country shape with an asymmetric language list,
 * chosen specifically to distinguish "the registry's own pairs" from "the cross
 * product of every language against every country": `fr` and `uk` exist as `Language`s
 * (via `ca`), so a cross-product derivation would wrongly accept `"fr-US"` and
 * `"uk-US"` even though this fake `us` never lists them.
 */
type FakeCountries = {
  readonly ca: { readonly segment: "/ca"; readonly languages: readonly ["en", "fr", "uk"] };
  readonly us: { readonly segment: "/us"; readonly languages: readonly ["en", "es"] };
};

// LocalePairsOf's own generic constraint (Registry extends Record<string, CountryProfile>)
// already requires FakeCountries to have that shape — if it didn't, this line alone
// would fail to compile, which is why there is no separate assertion for it.
type FakeLocale = LocalePairsOf<FakeCountries>;

describe("LocalePairsOf", () => {
  it("derives exactly the registry's own (country, language) pairs", () => {
    expectTypeOf<FakeLocale>().toEqualTypeOf<"en-CA" | "fr-CA" | "uk-CA" | "en-US" | "es-US">();

    // The cross-product values a wrong derivation would have accepted: fr-US and
    // uk-US, built from a language that exists in the registry (via ca) but that
    // `us` itself never lists.
    expectTypeOf<"fr-US">().not.toMatchTypeOf<FakeLocale>();
    expectTypeOf<"uk-US">().not.toMatchTypeOf<FakeLocale>();

    // @ts-expect-error — "fr-US" is not assignable to FakeLocale; if LocalePairsOf ever
    // collapsed to the cross product, this line would stop erroring and CI would need
    // the line below deleted, which is the point: the assertion breaks loudly.
    const _rejected: FakeLocale = "fr-US";
    void _rejected;
  });

  it("derives the real Locale as the ca-only pairs COUNTRIES declares today", () => {
    expectTypeOf<Locale>().toEqualTypeOf<"en-CA" | "fr-CA" | "uk-CA" | "es-CA">();
  });
});
