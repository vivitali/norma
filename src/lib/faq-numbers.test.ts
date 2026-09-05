import { describe, expect, it } from "vitest";
import { CATALOGUE_ENTRIES, type Tree } from "@/test/catalogues";

/**
 * `Home.faqA_*` feeds the `FAQPage` structured-data block on the home page (see
 * `src/app/[locale]/page.tsx` and `page.test.tsx`'s "marks up exactly the questions"
 * test). CLAUDE.md's `## Don't` rule is explicit about what a number in that payload
 * may claim: "A figure may travel only if its own `provenance` entry is `conf: "high"`
 * and carries an `asOf`." A machine consuming `FAQPage` strips the surrounding
 * disclosure — the whole reason this rule exists — so a `medium`/`low`/`assumption`
 * figure slipping into an FAQ answer is invisible to review the moment it ships (the
 * "28/36 is the classic guideline" DTI figure did exactly this: `rules/us.ts` grades
 * both `gds` and `tds` `conf: "medium"`).
 *
 * This is a coverage test, not a values test: it does not re-verify a number is
 * correct, only that every digit sequence appearing in a `faqA_*` string is one a
 * human already reviewed and recorded here against the exact domain-layer field that
 * backs it — so the NEXT number someone adds either matches an entry already reviewed,
 * or fails loudly and demands one.
 *
 * Keyed by the literal digit run(s) a locale can render it as — Latin-script locales
 * group thousands with a comma (`140,000`, en/es) or a narrow no-break space that this
 * scanner's digit-only regex splits into separate runs (`140`, `000`, fr/uk) — so a
 * number appears once per shape it can actually take in some catalogue, not once per
 * locale.
 */
const FAQ_NUMBER_ALLOWLIST: Record<string, string> = {
  // "a loan above 80% loan-to-value usually carries PMI" (Home.faqA_stressTest_us).
  // src/domain/rules/us.ts: provenance["programs.conventional.pmi.cancelRequestLtv"]
  // -- conf: "high", asOf: "2026", src: the Homeowners Protection Act of 1998.
  "80": 'rules/us.ts "programs.conventional.pmi.cancelRequestLtv" (conf: high, asOf: 2026)',

  // "$140,000 of a primary residence's value" (Home.faqA_jurisdiction_us), the Harris
  // County / HISD homestead exemption.
  // src/domain/jurisdictions/houston.ts: provenance["propTax.exemptions"] -- conf:
  // "high", asOf: "2025-11-04 (Prop 13 certified, retroactive to TY2025)".
  "140,000": 'houston.ts "propTax.exemptions" (conf: high, asOf: 2025-11-04)',
  // Same figure, split by a thousands separator this scanner's \d+ pattern does not
  // bridge (fr/uk group with a narrow no-break space, not a comma).
  "140": 'houston.ts "propTax.exemptions" (conf: high, asOf: 2025-11-04) -- thousands-group digits',
  "000": 'houston.ts "propTax.exemptions" (conf: high, asOf: 2025-11-04) -- thousands-group digits',

  // "(as of 2025-11-04)" -- the asOf date for the same field, quoted alongside the
  // figure per the CLAUDE.md rule ("Quote the asOf alongside it").
  "2025": 'houston.ts "propTax.exemptions" asOf date (2025-11-04)',
  "11": 'houston.ts "propTax.exemptions" asOf date (2025-11-04)',
  "04": 'houston.ts "propTax.exemptions" asOf date (2025-11-04)',
};

/** Every run of digits, tolerating a `.`/`,` decimal or thousands separator inside it. */
const NUMBER_PATTERN = /\d+(?:[.,]\d+)*/g;

function faqAnswers(tree: Tree): [string, string][] {
  const home = tree.Home as Record<string, unknown> | undefined;
  if (!home) return [];
  return Object.entries(home).filter(
    (entry): entry is [string, string] =>
      entry[0].startsWith("faqA_") && typeof entry[1] === "string",
  );
}

describe("Home.faqA_* numbers are all allowlisted with their provenance", () => {
  for (const [language, tree] of CATALOGUE_ENTRIES) {
    for (const [key, value] of faqAnswers(tree as Tree)) {
      it(`${language} ${key}`, () => {
        const numbers = value.match(NUMBER_PATTERN) ?? [];
        for (const n of numbers) {
          expect(
            FAQ_NUMBER_ALLOWLIST,
            `${language} Home.${key} contains the number "${n}", which is not in ` +
              `FAQ_NUMBER_ALLOWLIST. Every number in a faqA_* string reaches the ` +
              `FAQPage structured-data block, so it may only travel if its own ` +
              `domain-layer provenance entry is conf: "high" with an asOf -- add it ` +
              `to the allowlist with that provenance key, or reword the answer to ` +
              `drop the number (see CLAUDE.md's "## Don't" rule).\n\nFull string: "${value}"`,
          ).toHaveProperty(n);
        }
      });
    }
  }
});
