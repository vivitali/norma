import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import en from "../../messages/en.json";
import { NAV } from "./routes";
import { HOME_FAQ_KEYS } from "@/components/home-content";

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

/**
 * Home's computed keys, DERIVED rather than exempted by prefix.
 *
 * Blanket-prefixing `tool_`, `faqQ_` and `faqA_` waived 17 of Home's ~40 keys in
 * the same change that brought Home under this guard — so a stray `faqQ_x` with
 * no entry in HOME_FAQ_KEYS would have lived in both locales forever, which is
 * exactly the half-wired FAQ someone later feeds to the JSON-LD. Reading the two
 * registries instead means an orphan is still an orphan.
 */
function derivedHomeKeys(): string[] {
  return [
    ...NAV.flatMap((group) => group.entries.map((entry) => `tool_${entry.label}`)),
    ...HOME_FAQ_KEYS.flatMap((key) => [`faqQ_${key}`, `faqA_${key}`]),
  ];
}

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
 * with its own review, and doing it inside a six-page branch would mean nobody
 * reviews it properly. Listed by name so this doubles as the checklist for that
 * follow-up, and so a NEW orphan fails the test like any other.
 */
const KNOWN_ORPHANS: Record<string, readonly string[]> = {
  Affordability: [
    "heading", "subheading", "debts", "ceiling", "approvalPass", "approvalFail",
    "comfortPass", "comfortFail", "monthlyBreakdown", "pi", "propTax",
    "insuranceMonthly", "maintenance", "total", "aDeep", "aSub", "stComfortNote",
    "ckTitle", "ckSub", "wPass", "wCaution", "wBlocked", "gapOf", "gapOfInv",
    "cHide", "mSub", "mRatios", "mGdsFull", "mTdsFull", "mLimitWord", "tagComfort",
    "perYear",
  ],
};

/**
 * What this does NOT prove: that a key is reached on any particular code path,
 * or that its ICU placeholders are supplied. A call site is necessary, not
 * sufficient. The French page tests cover the second, by expanding every section
 * before asserting no raw key leaked.
 */

const NAMESPACES = [
  // Home was outside this guard while it held three keys; at forty-odd it is exactly the kind of
  // namespace the guard exists for.
  "Home",
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
          !(namespace === "Home" && derivedHomeKeys().includes(key)) &&
          !source.includes(`"${key}"`) &&
          !source.includes(`'${key}'`),
      );
      const allowed = KNOWN_ORPHANS[namespace] ?? [];
      // Named, not counted. A count lets one orphan be deleted and another added
      // with the total unmoved, and the number is a property of THIS SCANNER
      // rather than of the copy -- it went 27 to 32 when the scan tightened, with
      // nobody having written a line. Delete keys from the list as they go.
      expect(
        orphans.filter((key) => !allowed.includes(key)),
        `${namespace} keys with no call site`,
      ).toEqual([]);
    });
  }
});
