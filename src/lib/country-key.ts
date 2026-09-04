import type { Country } from "@/i18n/countries";

/**
 * A message key forked by country: `${base}_us` for the US, `base` unchanged for every
 * other country (today, only `ca`). Use this only where the WORDING genuinely differs
 * by country — CMHC vs PMI, "land transfer tax" vs "transfer tax", GDS/TDS vs
 * front-end/back-end DTI — never as a blanket habit; most copy is country-neutral and
 * should stay a single key.
 *
 * The `_us` key must exist in the catalogue for every call site that uses this helper:
 * there is no runtime fallback (next-intl has no `t.has()` on the translator this app
 * uses), so a missing `_us` key renders the raw key string to a US reader. Keep the
 * forked-key surface small and let a parity/coverage test enumerate it, rather than
 * reaching for this on every `t()` call "just in case".
 */
export function countryKey(base: string, country: Country): string {
  return country === "us" ? `${base}_us` : base;
}
