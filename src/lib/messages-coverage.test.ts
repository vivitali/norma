import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import en from "../../messages/en.json";

/**
 * Every message key must have a call site in a file that renders its namespace.
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

/**
 * Namespaces read ENTIRELY by computed name. Nav's every key is reached through
 * the registry in routes.ts — `t(group.heading)`, `t(entry.label)` — so no key
 * of it appears as a literal anywhere. routes.test.ts already asserts that every
 * heading and label resolves in both locales, which is the stronger check.
 */
const DYNAMIC_NAMESPACES = new Set(["Nav"]);

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

const FILES = sourceFiles("src").map((path) => ({ path, source: readFileSync(path, "utf8") }));

/**
 * The source that could plausibly render a given namespace's keys.
 *
 * Scanning all of `src` as one string made this namespace-blind: `tagYours`,
 * `breakdown`, `expandAll`, `income` and `marginal` exist in most namespaces, so
 * ONE call site anywhere satisfied all of them and an orphan in `RentVsBuy` rode
 * in on a render in `Scenarios`. A file counts for a namespace only if it names
 * that namespace, or takes one as a prop (`LineRows` does, and `tool-page.tsx`
 * reads Disclosure directly).
 */
function sourceFor(namespace: string): string {
  const relevant = FILES.filter(
    ({ source }) =>
      source.includes(`"${namespace}"`) ||
      // Components handed a namespace by their caller.
      source.includes("namespace: string") ||
      source.includes("namespace}"),
  );
  return relevant.map((f) => f.source).join("\n");
}

/**
 * Dead copy that predates this guard, in a namespace this work did not touch.
 *
 * Recorded rather than deleted: pruning Affordability's copy is its own change,
 * with its own review. What the baseline buys is that the number cannot grow —
 * a new orphan in that namespace fails the test like any other.
 */
const KNOWN_ORPHANS: Record<string, number> = { Affordability: 32 };

/**
 * What this does NOT prove: that a key is reached on any particular code path,
 * or that its ICU placeholders are supplied. A call site is necessary, not
 * sufficient. The French page tests cover the second, by expanding every section
 * before asserting no raw key leaked.
 */

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
      if (DYNAMIC_NAMESPACES.has(namespace)) return;
      const source = sourceFor(namespace);
      expect(source, `no file references the ${namespace} namespace`).not.toBe("");
      const orphans = keys.filter(
        (key) =>
          !DYNAMIC_PREFIXES.some((prefix) => key.startsWith(prefix)) &&
          !source.includes(`"${key}"`) &&
          !source.includes(`'${key}'`),
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
