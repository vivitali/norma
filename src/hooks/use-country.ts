"use client";

import { useLocale } from "next-intl";
import { countryOf, type Country, type Locale } from "@/i18n/countries";
import { RULES } from "@/domain/rules";
import type { CaRules } from "@/domain/types";

/**
 * The routing country for the current request — derived from the URL's locale segment, never
 * stored or chosen independently of it. `en-CA` and `fr-CA` are both `"ca"`; there is currently
 * only one member, but every call site here is written against the general case so a second
 * country (`en-US` / `es-US`, per `docs/superpowers/specs/2026-08-29-us-market-design.md`) is
 * additive.
 *
 * `useLocale()` returns `string`, not `Locale` — next-intl carries no module augmentation in
 * this project (see `src/lib/locales.ts`'s `localeProfile`, which takes the same cast) — so the
 * cast here matches the one established pattern rather than inventing a second.
 */
export function useCountry(): Country {
  return countryOf(useLocale() as Locale);
}

/**
 * This request's country rules, resolved off the URL rather than imported as a singleton. The
 * replacement for every client-side `import { federal } from "@/domain/federal"` — see
 * `docs/superpowers/specs/2026-08-29-us-market-design.md`'s country seam. Server components and
 * `/sources` use `rulesFor(country)` directly instead, since they already have a `country` (or a
 * `locale`) in hand and no React context to read a hook from.
 *
 * Typed `CaRules`, not the full `CountryRules` union, and that is a STOPGAP, not an oversight:
 * `RULES` gained a `"us"` member in the domain layer (`docs/superpowers/specs/2026-08-29-us-
 * market-design.md`, implementation order step 3) before any route can reach it — `Country` in
 * `src/i18n/countries.ts` still names only `"ca"`, so `useCountry()` can only ever return `"ca"`
 * today, and this cast simply states that fact rather than pretending it might not hold. Every
 * page in `src/app` and every shared component under `src/components` reads Canada-only fields
 * off this hook's result (`rules.cmhc`, `rules.hbp`, `rules.heatAllowance`, …) without narrowing,
 * because there was only ever one country to read. The moment `COUNTRIES` (routing) grows a
 * `"us"` entry, this cast becomes a lie and must come out — replaced by real per-page branching
 * on `rules.country`, the same discipline `src/domain/engine.ts` already applies internally.
 * Tracked as a known follow-up for whichever branch wires US routing, not fixed here: that is UI
 * work, out of scope for the domain-only branch this hook's cast was introduced on.
 */
export function useRules(): CaRules {
  return RULES[useCountry()] as CaRules;
}
