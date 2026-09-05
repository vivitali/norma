"use client";

import { useLocale } from "next-intl";
import { countryOf, type Country, type Locale } from "@/i18n/countries";
import { RULES } from "@/domain/rules";
import type { CountryRules } from "@/domain/types";

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
 * Typed `CountryRules` — the full union, not the `CaRules` stopgap cast this hook carried
 * while `Country` in `src/i18n/countries.ts` named only `"ca"` (`docs/superpowers/specs/
 * 2026-08-29-us-market-design.md`, implementation order step 3 vs the US routing/UI work).
 * `COUNTRIES` now has a `"us"` entry, so `useCountry()` genuinely can return `"us"`, and every
 * caller of this hook must narrow with `rules.country === "ca"` (or `rules.mortgage.renews`
 * where that is the more legible branch — see CLAUDE.md) before reading a Canada-only field
 * (`rules.cmhc`, `rules.hbp`, `rules.heatAllowance`, …) — exactly the discipline
 * `src/domain/engine.ts` already applies internally, now enforced at every call site by the
 * compiler rather than documented as a known gap.
 */
export function useRules(): CountryRules {
  return RULES[useCountry()];
}
