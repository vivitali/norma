import { describe, expect, it } from "vitest";
import { buildLines, credits } from "../engine";
import { federal } from "../federal";
import { jurisdictions } from "./index";
import { CATALOGUES } from "@/test/catalogues";

/** The ClosingCosts namespace of every locale, keyed by locale. */
const CLOSING = Object.entries(CATALOGUES).map(
  ([locale, messages]) =>
    [locale, (messages as unknown as Record<string, Record<string, string>>).ClosingCosts] as const,
);

/**
 * Every line item, explanation and credit key the engine can emit, for EVERY
 * jurisdiction, must have copy in EVERY locale.
 *
 * The Closing Costs page resolves these dynamically — `t(item.key)`,
 * `t(item.ex)`, `t(c.key)` — so no typecheck and no source scan can see them,
 * and the page's own French smoke test only ever renders the default
 * jurisdiction. Without this, adding a fifteenth jurisdiction with one new
 * `li_*` key ships a raw message key to production, in the province that
 * jurisdiction exists to serve.
 */
describe("every jurisdiction's line-item keys have copy", () => {
  // Property type, buyer status and RESIDENCY change WHICH lines are built, so the sweep
  // has to cover the combinations, not just the default one. Nova Scotia's non-resident deed
  // transfer tax is invisible to a resident-only sweep, and it is the largest closing cost in
  // the province for the buyer it applies to.
  const CASES = [
    { ptype: "house" as const, ftb: true, elsewhere: false, residency: "resident" as const },
    { ptype: "condo" as const, ftb: false, elsewhere: false, residency: "resident" as const },
    { ptype: "newbuild" as const, ftb: true, elsewhere: false, residency: "resident" as const },
    { ptype: "house" as const, ftb: true, elsewhere: true, residency: "resident" as const },
    { ptype: "house" as const, ftb: true, elsewhere: false, residency: "nonResident" as const },
    { ptype: "condo" as const, ftb: false, elsewhere: false, residency: "nonResident" as const },
  ];

  for (const jurisdiction of jurisdictions) {
    it(`resolves every key for ${jurisdiction.id}`, () => {
      const seen = new Set<string>();
      for (const shape of CASES) {
        for (const price of [300000, 800000, 1800000]) {
          for (const dpPct of [5, 20]) {
            const input = { price, dpPct, amortYears: 25, ...shape };
            const lines = buildLines(jurisdiction, federal, input);
            for (const item of [...lines.gov, ...lines.pro, ...lines.adj]) {
              seen.add(item.key);
              if (item.ex) seen.add(item.ex);
            }
            const credit = credits(jurisdiction, federal, input, lines.gov);
            for (const c of credit.atClosing) seen.add(c.key);
            for (const c of credit.later) {
              seen.add(c.key);
              if (c.ex) seen.add(c.ex);
            }
            // A programme reported as an OMISSION still renders, in words rather than in
            // dollars, so its keys need copy exactly as a paid credit's do — and the GST
            // rebate now reaches the reader only this way, so dropping it from the sweep
            // would take the app's one new-build disclosure out of the safety net.
            for (const c of credit.omitted) {
              seen.add(c.key);
              seen.add(c.ex);
            }
          }
        }
      }
      expect(seen.size).toBeGreaterThan(0);
      for (const key of seen) {
        for (const [locale, namespace] of CLOSING) {
          expect(namespace[key], `${locale} ClosingCosts.${key}`).toBeDefined();
        }
      }
    });
  }
});
