import type { Country, CountryRules } from "../types";
import { ca } from "./ca";
import { us } from "./us";

/**
 * Every market's rules, one entry per `Country`. A TOTAL record — the same discipline
 * `LOCALES` in `src/lib/locales.ts` and `COUNTRIES` in `src/i18n/countries.ts` already apply —
 * so adding a country to the `Country` union without adding its rules here is a compile error,
 * never a silent fallback to Canadian conventions. `rules/index.test.ts` also checks this at
 * runtime, because a `Record<Country, CountryRules>` literal can still be sabotaged by an `as`
 * cast; the two checks cover different ways this invariant could be defeated.
 */
export const RULES: Record<Country, CountryRules> = { ca, us };

/** The rules for one country. A thin named wrapper over `RULES[country]` for call sites that
 * have a `Country` but no React context to read it from — server components and `/sources`. */
export function rulesFor(country: Country): CountryRules {
  return RULES[country];
}
