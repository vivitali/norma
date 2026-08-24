"use client";

import { useLocale } from "next-intl";
import { money } from "@/domain/engine";

const INTL_LOCALES: Record<string, string> = { en: "en-CA", fr: "fr-CA" };

/**
 * Locale-aware currency formatter. English puts the symbol first ($340); every other
 * supported locale puts it after (340 $), which is what `money()`'s `trailing` flag is for.
 * Centralised here so a new locale is one map entry, not an edit to every page.
 */
export function useMoney() {
  const locale = useLocale();
  const intlLocale = INTL_LOCALES[locale] ?? "en-CA";
  const trailing = locale !== "en";
  return (n: number, dp?: number) => money(n, intlLocale, trailing, dp);
}

/**
 * Locale-aware percentage. French puts a narrow no-break space before the sign
 * (34,5 %), English does not (34.5%) — the reference's own rule, kept here so
 * every gauge, rate and ratio on every screen agrees.
 */
export function usePercent() {
  const locale = useLocale();
  const intlLocale = INTL_LOCALES[locale] ?? "en-CA";
  const spaced = locale !== "en";
  return (n: number, dp?: number) => {
    const v = new Intl.NumberFormat(intlLocale, {
      minimumFractionDigits: dp ?? 0,
      maximumFractionDigits: dp ?? 1,
    }).format(n);
    return spaced ? `${v} %` : `${v}%`;
  };
}
