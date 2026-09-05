import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { routing } from "@/i18n/routing";
import { INDEXABLE_ROUTES, ROUTE_METADATA_KEY, ogImagePath, routeLocales } from "./og-manifest";

const PNG_MAGIC = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

/**
 * The cards are build artifacts committed to the repo, written by
 * scripts/generate-og.mjs. Nothing else fails if one is missing: the page
 * still renders, the share preview just silently loses its image — which is
 * exactly the kind of regression nobody notices until someone posts a link.
 */
describe("social cards", () => {
  for (const href of INDEXABLE_ROUTES) {
    // Scoped to the route's own locales, not every registered locale: RRSP-HBP has
    // no en-US or es-US card to generate, because it has no en-US or es-US page.
    for (const locale of routeLocales(href, routing.locales)) {
      const path = `public${ogImagePath(locale, href)}`;

      it(`${locale} ${href} has a card`, () => {
        expect(existsSync(path)).toBe(true);
      });

      it(`${locale} ${href} is a 1200x630 PNG`, () => {
        const bytes = readFileSync(path);
        expect([...bytes.subarray(0, 8)]).toEqual(PNG_MAGIC);
        // IHDR puts width and height as big-endian uint32 at bytes 16 and 20.
        expect(bytes.readUInt32BE(16)).toBe(1200);
        expect(bytes.readUInt32BE(20)).toBe(630);
        // Under ~40KB means the text almost certainly failed to render; over
        // 1MB and Facebook starts refusing to fetch it.
        expect(bytes.length).toBeGreaterThan(10_000);
        expect(bytes.length).toBeLessThan(1_000_000);
      });
    }
  }

  it("covers every indexable route", () => {
    expect(Object.keys(ROUTE_METADATA_KEY).sort()).toEqual([...INDEXABLE_ROUTES].sort());
  });
});
