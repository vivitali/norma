"use client";

import { useLocale } from "next-intl";
import { money } from "@/domain/engine";
import { localeProfile } from "@/lib/locales";

/**
 * Locale-aware currency formatter. Where the sign goes is a per-locale fact and is
 * read from the table in `@/lib/locales`, not inferred: this used to say
 * `trailing = locale !== "en"`, which was a two-locale coincidence rather than a
 * rule. Latin American Spanish leads with the sign exactly as English does.
 */
export function useMoney() {
  const { intl, moneyTrailing } = localeProfile(useLocale());
  return (n: number, dp?: number) => money(n, intl, moneyTrailing, dp);
}

/**
 * Locale-aware percentage. French and Spanish put a narrow no-break space before
 * the sign (34,5 %), English does not (34.5%). Kept here so every gauge, rate and
 * ratio on every screen agrees.
 */
export function usePercent() {
  const { intl: intlLocale, percentSpaced: spaced } = localeProfile(useLocale());
  return (n: number, dp?: number) => {
    const v = new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits: dp ?? 0,
      maximumFractionDigits: dp ?? 1,
    }).format(n);
    return spaced ? `${v} %` : `${v}%`;
  };
}
