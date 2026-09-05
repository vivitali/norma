import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import en from "../../messages/en.json";
import { NAV, FOOTER } from "./routes";
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
/**
 * FOOTER's labels, DERIVED rather than prefix-exempted, for the same reason Home's are: a stray
 * `Legal.whatever` should still be an orphan. `src/lib/routes.ts` carries these two strings
 * without naming the `Legal` namespace, so `sourceFor("Legal")` cannot see them.
 */
function derivedFooterKeys(): string[] {
  return FOOTER.map((entry) => entry.label);
}

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
 * Dead copy that predates this guard, recorded by name rather than deleted.
 *
 * EMPTY, and that is the point. It held 32 Affordability keys until issue #21
 * resolved them one at a time: every one was v1 copy the v2 rebuild dropped,
 * verified against `design-reference/Affordability v2.dc.html` — the file
 * DESIGN.md names as the authority — where none of them appears as a copy key.
 * Their content either moved to a v2 key that IS rendered (`pi` → `mPi`,
 * `ceiling` → `mLender`, `comfortFail` → `ckCfNo`) or belonged to an
 * interaction v2 deleted (`aDeep` was the depth switcher, `cHide` the
 * advanced-inputs toggle, `wPass`/`wCaution`/`wBlocked` the verdict words the
 * tone dot and the section's always-visible line replaced).
 *
 * The one that took an argument was `perYear` ("gross, per year"), which v2 DOES
 * render — as a hint beside a label v2 shortened to "Applicant 1". Our copy
 * keeps v1's fuller wording throughout (`cApp1` is "Applicant 1, gross annual",
 * as are `stMonthly`, `mTitle`, `mStated` and a dozen more), so the unit already
 * reaches the reader inside the label. Rendering `perYear` would have meant
 * shortening `cApp1`/`cApp2` to match — reversing that project-wide choice for
 * one hint, and saying "gross" twice until it was.
 *
 * A 33rd went with them that this scanner never flagged: `Affordability.comfort`
 * ("What fits your real budget", v1's pair to `ceiling`). The scan matches a
 * bare quoted string, and `section("comfort", …)` in the page passes a SECTION
 * ID by that name — so an id and a message key that happen to spell the same
 * word cover for each other. Worth knowing before trusting a green run: this
 * catches orphans whose names are unique, not every orphan.
 *
 * The seam stays for the next namespace that needs it. Nothing is exempt today,
 * so any orphan anywhere fails outright.
 */
const KNOWN_ORPHANS: Record<string, readonly string[]> = {};

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
  // Brought under the guard when /sources grew from four org lists into the
  // provenance inventory: seven of its keys described the old page and had to
  // go, and copy that describes a page nobody built is exactly what this catches.
  "Sources",
  // The legal namespaces. They have no entry in SECTION_REGISTRIES — the pages render flat, so
  // there are no sections to register — which means they also miss sections.test.ts's both-locale
  // label check. Without them here they would sit outside EVERY orphan guard, and three keys
  // (`resultNote`, `rateNote`, `privacyLede`) had already shipped translated with no call site
  // before this line existed.
  "Legal", "Privacy", "Terms",
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
          !(namespace === "Legal" && derivedFooterKeys().includes(key)) &&
          !source.includes(`"${key}"`) &&
          !source.includes(`'${key}'`) &&
          // Country-forked key, reached as `t(countryKey(base, rules.country))`
          // (src/lib/country-key.ts) rather than a literal `t("${base}_us")` —
          // `countryKey` builds "${base}_us" at RUNTIME, so the literal string
          // this scan looks for never appears in source. Covered if the BASE key
          // (the literal first argument countryKey is actually called with) has
          // its own call site, which is what makes the fork reachable at all.
          !(key.endsWith("_us") && (source.includes(`"${key.slice(0, -3)}"`) || source.includes(`'${key.slice(0, -3)}'`))),
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
