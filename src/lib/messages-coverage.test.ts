import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import en from "../../messages/en.json";

/**
 * Every message key must be reachable from the code.
 *
 * `messages.test.ts` keeps en and fr in step; this keeps both in step with what
 * the app actually renders. Without it, six new namespaces shipped copy for an
 * interaction nobody built — five Scenarios keys described tapping a column to
 * re-base the grid, a feature the page does not have — and en/fr parity then
 * obliged a translator to maintain them forever.
 *
 * The Affordability screen already had `rendered-keys.ts` for the engine's
 * fields. This is the same idea one level up, and it covers every page at once.
 */

/** Keys reached by computed name, which a source scan cannot see. */
const DYNAMIC_PREFIXES = [
  // Line-item, explanation and credit labels: t(item.key), t(item.ex), t(c.key).
  "li_", "ex_", "cr_",
  // Section labels, resolved through the registries in sections.ts.
  "sec",
  // Waterfall sources: t(SOURCE_LABEL[row.key]) and the `${...}Why` sibling.
  "src",
  // Renewal presets: t(preset.key).
  "preset",
];

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    if (!/\.tsx?$/.test(name) || /\.test\.tsx?$/.test(name)) return [];
    return [path];
  });
}

const SOURCE = sourceFiles("src")
  .map((path) => readFileSync(path, "utf8"))
  .join("\n");

/**
 * Dead copy that predates this guard, in a namespace this work did not touch.
 *
 * Recorded rather than deleted: pruning Affordability's copy is its own change,
 * with its own review. What the baseline buys is that the number cannot grow —
 * a new orphan in that namespace fails the test like any other.
 */
const KNOWN_ORPHANS: Record<string, number> = { Affordability: 27 };

const NAMESPACES = [
  "Affordability", "ClosingCosts", "DownPayment", "RrspHbp",
  "Amortization", "RentVsBuy", "Scenarios", "Inputs", "Disclosure", "Provenance", "Nav",
] as const;

describe("message coverage", () => {
  for (const namespace of NAMESPACES) {
    it(`renders every key in ${namespace}`, () => {
      const keys = Object.keys(
        (en as unknown as Record<string, Record<string, string>>)[namespace],
      );
      const orphans = keys.filter(
        (key) =>
          !DYNAMIC_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
          !SOURCE.includes(`"${key}"`) &&
          !SOURCE.includes(`'${key}'`),
      );
      const allowed = KNOWN_ORPHANS[namespace] ?? 0;
      if (allowed === 0) {
        expect(orphans, `${namespace} keys with no call site`).toEqual([]);
      } else {
        // Must shrink or hold, never grow. Drop the baseline when it reaches 0.
        expect(orphans.length, `${namespace} orphan copy`).toBeLessThanOrEqual(allowed);
      }
    });
  }
});
