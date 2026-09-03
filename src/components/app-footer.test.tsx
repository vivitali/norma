import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AppFooter } from "./app-footer";
import { FOOTER } from "@/lib/routes";
import { CATALOGUES, leafPaths, type Tree } from "@/test/catalogues";
import { languageOf } from "@/i18n/countries";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/locales";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

/**
 * Vitest resolves `next-intl/server` to the package's react-client build, where `getTranslations`
 * is a stub that throws. The substitute is next-intl's own `createTranslator` over the real
 * catalogue rather than a `(key) => key` fake: a fake would make every assertion below pass
 * against message keys and prove nothing, and the failure this file exists to catch — a key that
 * resolves to nothing and reaches a reader as `Legal.footerDisclaimer` — is exactly the one a fake
 * hides.
 *
 * Built from `CATALOGUES` rather than a hardcoded `{ en, fr }` map, so the footer — chrome on
 * every one of the thirteen routes — actually renders in uk and es here too, not just in the
 * catalogue-level parity/ICU checks. `CATALOGUES` is keyed by LANGUAGE, not by the full `Locale`
 * pair `AppFooter` actually receives (`en-CA`), so the mock goes through `languageOf` to find the
 * right catalogue — see the same note in `src/app/legal-pages.test.tsx`.
 */
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { CATALOGUES } = await import("@/test/catalogues");
  const { languageOf } = await import("@/i18n/countries");
  return {
    getTranslations: async ({ locale, namespace }: { locale: Locale; namespace: string }) =>
      createTranslator({
        locale,
        messages: (CATALOGUES as unknown as Record<string, Record<string, unknown>>)[
          languageOf(locale)
        ],
        namespace,
      }),
  };
});

/**
 * A per-ROUTE check (this renders the footer) iterates the actual `Locale` pairs from
 * routing.ts, not the language-keyed `CATALOGUES` registry — see the same note in
 * `src/app/legal-pages.test.tsx` and `src/app/locale-render.test.tsx`.
 */
const LOCALES = routing.locales;

/** Awaited to a plain element before rendering — the shape the App Router uses for an async RSC. */
async function renderFooter(locale: Locale) {
  return render(await AppFooter({ locale }));
}

describe("AppFooter", () => {
  for (const locale of LOCALES) {
    it(`renders the disclosure verbatim in ${locale}`, async () => {
      const { unmount } = await renderFooter(locale);
      // Asserted on the whole string, not a fragment. A disclaimer silently shortened to
      // something weaker is the failure worth catching, and it would pass a substring check.
      expect(
        screen.getByText(
          (CATALOGUES[languageOf(locale)] as { Legal: { footerDisclaimer: string } }).Legal
            .footerDisclaimer,
        ),
      ).toBeTruthy();
      unmount();
    });

    it(`links to every legal page in ${locale}`, async () => {
      const { unmount } = await renderFooter(locale);
      const legalTree = (CATALOGUES[languageOf(locale)] as { Legal: Record<string, string> }).Legal;
      const nav = screen.getByRole("navigation", { name: legalTree.legal });
      const links = within(nav).getAllByRole("link");
      expect(links).toHaveLength(FOOTER.length);
      for (const entry of FOOTER) {
        const label = legalTree[entry.label];
        expect(within(nav).getByRole("link", { name: label })).toBeTruthy();
      }
      unmount();
    });

    it(`renders no message key as literal text in ${locale}`, async () => {
      // next-intl renders the raw key when one is missing, so `Legal.privacy` reaching a reader is
      // the concrete failure. Derived from the real key list, not a pattern that resembles one —
      // `textContent` concatenates adjacent elements with no separator, so a leaked key can arrive
      // glued to neighbouring text with no word boundary a regex like `/Legal\.\w/` would catch.
      // See the same note in `src/app/legal-pages.test.tsx`.
      const { container, unmount } = await renderFooter(locale);
      const text = container.textContent ?? "";
      const keys = leafPaths(CATALOGUES.en.Legal as Tree).map((path) => `Legal.${path}`);
      const leaked = keys.filter((key) => text.includes(key));
      expect(leaked, `${locale}: message keys rendered verbatim`).toEqual([]);
      unmount();
    });
  }

  it("ships no client JavaScript", () => {
    // Chrome on all thirteen prerendered routes. A "use client" here would put the disclaimer and
    // its two links into every page's bundle to render text that never changes.
    const source = readFileSync("src/components/app-footer.tsx", "utf8");
    expect(source).not.toContain('"use client"');
  });

  // The stronger, structural version of "is rendered by the locale layout" used to live here as a
  // string-grep on layout.tsx's source (`expect(layout).toContain("<AppFooter")`), which passes if
  // the element is commented out, put behind a branch that never runs, or moved somewhere
  // unreachable. `src/app/[locale]/layout.test.tsx`'s "puts the footer in every page's tree, so no
  // page can ship without the disclosure" renders the real layout and looks for the component in
  // the tree it actually returned — the weaker duplicate here was deleted rather than kept.
});
