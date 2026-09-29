import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AppFooter } from "./app-footer";
import { FOOTER } from "@/lib/routes";
import { CATALOGUES, leafPaths, type Tree } from "@/test/catalogues";
import { languageOf, countryOf } from "@/i18n/countries";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/locales";
import { countryKey } from "@/lib/country-key";
import { NextIntlClientProvider } from "next-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { latestRelevant } from "@/lib/changelog";
import { defaultJurisdictionOf } from "@/domain/jurisdictions";

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
  // The version note reads the reader's jurisdiction, exactly as it does under the root layout.
  const footer = await AppFooter({ locale });
  return render(
    <NextIntlClientProvider locale={locale} messages={CATALOGUES[languageOf(locale)]}>
      <JurisdictionProvider>{footer}</JurisdictionProvider>
    </NextIntlClientProvider>,
  );
}

describe("AppFooter", () => {
  for (const locale of LOCALES) {
    it(`renders the disclosure verbatim in ${locale}`, async () => {
      const { unmount } = await renderFooter(locale);
      // Asserted on the whole string, not a fragment. A disclaimer silently shortened to
      // something weaker is the failure worth catching, and it would pass a substring check.
      // `countryKey` picks the US-forked key at a US locale — asserting the base key's text
      // there would look for a string the footer never renders.
      const legal = (CATALOGUES[languageOf(locale)] as { Legal: Record<string, string> }).Legal;
      expect(
        screen.getByText(legal[countryKey("footerDisclaimer", countryOf(locale))]),
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

  for (const locale of LOCALES) {
    it(`shows the newest release for this country, and links to the changelog, in ${locale}`, async () => {
      const { container, unmount } = await renderFooter(locale);
      const changelog = (CATALOGUES[languageOf(locale)] as { Changelog: Record<string, string> })
        .Changelog;
      // The newest release relevant to the country's default jurisdiction (what a first render shows).
      const country = countryOf(locale);
      const latest = latestRelevant(country, defaultJurisdictionOf(country).id)!;
      expect(container.textContent).toContain(changelog[latest.summary]);
      expect(container.textContent).toContain(changelog.updated.replace("{date}", ""));
      const link = screen.getByRole("link", { name: changelog.whatChanged });
      expect(link.getAttribute("href")).toBe("/changelog");
      const leaked = leafPaths(CATALOGUES.en.Changelog as Tree)
        .map((path) => `Changelog.${path}`)
        .filter((key) => (container.textContent ?? "").includes(key));
      expect(leaked, `${locale}: Changelog keys rendered verbatim`).toEqual([]);
      unmount();
    });
  }

  it("keeps the footer itself server-rendered, with one client island for the version note", () => {
    // Chrome on every prerendered route. A "use client" here would put the disclaimer and its
    // links into every page's bundle to render text that never changes; only the version note
    // needs the browser (what this reader last saw), and it lives in its own file.
    const source = readFileSync("src/components/app-footer.tsx", "utf8");
    expect(source).not.toContain('"use client"');
    expect(readFileSync("src/components/version-note.tsx", "utf8")).toContain('"use client"');
  });

  // The stronger, structural version of "is rendered by the locale layout" used to live here as a
  // string-grep on layout.tsx's source (`expect(layout).toContain("<AppFooter")`), which passes if
  // the element is commented out, put behind a branch that never runs, or moved somewhere
  // unreachable. `src/app/[locale]/layout.test.tsx`'s "puts the footer in every page's tree, so no
  // page can ship without the disclosure" renders the real layout and looks for the component in
  // the tree it actually returned — the weaker duplicate here was deleted rather than kept.
});
