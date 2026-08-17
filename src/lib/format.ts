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
