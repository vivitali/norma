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
 */
export function useRules(): CountryRules {
  return RULES[useCountry()];
}
