import { describe, expect, it } from "vitest";
import { buildLines, credits } from "../engine";
import { federal } from "../federal";
import { jurisdictions } from "./index";
import en from "../../../messages/en.json";
import fr from "../../../messages/fr.json";

const CLOSING = {
  en: (en as unknown as Record<string, Record<string, string>>).ClosingCosts,
  fr: (fr as unknown as Record<string, Record<string, string>>).ClosingCosts,
};

/**
 * Every line item, explanation and credit key the engine can emit, for EVERY
 * jurisdiction, must have copy in both locales.
 *
 * The Closing Costs page resolves these dynamically — `t(item.key)`,
 * `t(item.ex)`, `t(c.key)` — so no typecheck and no source scan can see them,
 * and the page's own French smoke test only ever renders the default
 * jurisdiction. Without this, adding a fifteenth jurisdiction with one new
 * `li_*` key ships a raw message key to production, in the province that
 * jurisdiction exists to serve.
 */
describe("every jurisdiction's line-item keys have copy", () => {
  // Property types and buyer status change WHICH lines are built, so the sweep
  // has to cover the combinations, not just the default one.
  const CASES = [
    { ptype: "house" as const, ftb: true, elsewhere: false },
    { ptype: "condo" as const, ftb: false, elsewhere: false },
    { ptype: "newbuild" as const, ftb: true, elsewhere: false },
    { ptype: "house" as const, ftb: true, elsewhere: true },
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
          }
        }
      }
      expect(seen.size).toBeGreaterThan(0);
      for (const key of seen) {
        expect(CLOSING.en[key], `en ClosingCosts.${key}`).toBeDefined();
        expect(CLOSING.fr[key], `fr ClosingCosts.${key}`).toBeDefined();
      }
    });
  }
});
