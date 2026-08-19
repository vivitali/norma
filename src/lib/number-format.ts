/**
 * Locale-aware number parsing and formatting for input controls. Formatting only:
 * money() stays in the engine, because currency placement is a domain convention
 * ("− $340" in en, "− 340 $" in fr) and two screens must never disagree about it.
 *
 * Separators come from Intl, never from a table: fr-CA groups with U+202F, which
 * is exactly what money() emits at engine.ts:62 — so a French user re-typing a
 * figure the app just showed them must not get 0.
 */

/** Every space character a formatter may emit between digit groups. */
const SPACES = /[\s   ]/g;
/** Both minus signs: ASCII, and the U+2212 money() puts in front of a negative. */
const MINUS = /[−–—]/g;

export function separatorsFor(locale: string): { group: string; decimal: string } {
  const parts = new Intl.NumberFormat(locale).formatToParts(12345.6);
  const group = parts.find((p) => p.type === "group")?.value ?? ",";
  const decimal = parts.find((p) => p.type === "decimal")?.value ?? ".";
  return { group, decimal };
}

/**
 * The symbols a figure may legitimately carry, and nothing else. Stripping
 * everything non-numeric instead would make the validation below unreachable:
 * "350k" would become 350 and "12e3" would become 123 — silently wrong, rather
 * than rejected the way "1-2" already is.
 */
const CURRENCY = /[$€£¥%]/g;

export function parseLocaleNumber(raw: string, locale: string): number | null {
  const { group, decimal } = separatorsFor(locale);
  let s = raw.replace(MINUS, "-").replace(SPACES, "").replace(CURRENCY, "");
  if (s === "") return null;
  // Drop the group separator, then normalise the decimal mark. Order matters: in
  // fr-CA the group separator is whitespace and is already gone.
  s = s.split(group).join("");
  if (decimal !== ".") s = s.split(decimal).join(".");
  if (!/^-?(\d+(\.\d*)?|\.\d+)$/.test(s)) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function formatLocaleNumber(n: number, locale: string, dp = 0): string {
  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: dp,
    maximumFractionDigits: dp,
  }).format(n);
}
