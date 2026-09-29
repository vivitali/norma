import { describe, expect, it, vi } from "vitest";
import { render, within } from "@testing-library/react";
import { CATALOGUES, leafPaths, type Tree } from "@/test/catalogues";
import { languageOf, countryOf } from "@/i18n/countries";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/locales";
import { RELEASES, dateKey, formatReleaseDate, releasesFor } from "@/lib/changelog";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

/** `createTranslator` over the real catalogue — see the same mock in `legal-pages.test.tsx`. */
const setRequestLocale = vi.fn();
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { CATALOGUES } = await import("@/test/catalogues");
  const { languageOf } = await import("@/i18n/countries");
  return {
    setRequestLocale: (...args: unknown[]) => setRequestLocale(...args),
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

import ChangelogPage from "./page";

type Props = Parameters<typeof ChangelogPage>[0];

async function renderPage(locale: Locale) {
  return render(
    await ChangelogPage({
      params: Promise.resolve({ locale }),
      searchParams: Promise.resolve({}),
    } as Props),
  );
}

/** The key paths that could leak on this page — the real list, never a pattern that resembles one. */
function leakableKeys(): string[] {
  const tree = CATALOGUES.en as Tree;
  return ["Changelog", "Jurisdictions"].flatMap((ns) =>
    leafPaths(tree[ns] as Tree).map((path) => `${ns}.${path}`),
  );
}

describe("/changelog", () => {
  for (const locale of routing.locales) {
    const country = countryOf(locale);
    const catalogue = (CATALOGUES[languageOf(locale)] as unknown as Record<string, Record<string, string>>)
      .Changelog;

    it(`renders every one of ${country}'s items in ${locale}, with no raw message key`, async () => {
      const { container, unmount } = await renderPage(locale);
      const text = container.textContent ?? "";
      expect(leakableKeys().filter((key) => text.includes(key))).toEqual([]);
      for (const release of releasesFor(country)) {
        for (const item of release.items) {
          expect(text, `${locale}: ${item.key}`).toContain(catalogue[item.key]);
        }
      }
      unmount();
    });

    if (country === "us") {
      it(`says nothing about Canada or its addresses to a US reader, in ${locale}`, async () => {
        // The US vocabulary contract greps a fixed list of Canadian programme names; a changelog
        // can leak by talking ABOUT Canada instead ("US pages no longer mention Canada").
        const { container, unmount } = await renderPage(locale);
        const text = container.textContent ?? "";
        expect(text).not.toMatch(/Canad/);
        expect(text).not.toMatch(/\/ca\//);
        unmount();
      });
    }

    it(`shows only releases that concern ${country}, newest first, in ${locale}`, async () => {
      const { container, unmount } = await renderPage(locale);
      const text = container.textContent ?? "";
      for (const release of RELEASES.filter((r) => !r.countries.includes(country))) {
        for (const item of release.items) {
          expect(text, `${locale} must not show ${item.key}`).not.toContain(catalogue[item.key]);
        }
      }
      const shown = [...container.querySelectorAll("h2 time")].map((t) => t.getAttribute("datetime")!);
      expect(shown.length).toBeGreaterThan(0);
      expect(new Set(shown).size, "one heading per date").toBe(shown.length);
      const keys = shown.map(dateKey);
      expect(keys).toEqual([...keys].sort((a, b) => b - a));
      // The date is written by Intl in the locale's own tag, not the ISO string.
      expect(container.querySelector("h2 time")!.textContent).toBe(formatReleaseDate(shown[0], locale));
      unmount();
    });

    it(`links each item to its page and section in ${locale}`, async () => {
      const { container, unmount } = await renderPage(locale);
      const main = within(container.querySelector("main")!);
      for (const release of releasesFor(country)) {
        for (const item of release.items) {
          if (!item.href) continue;
          const link = main.getByRole("link", { name: catalogue[item.key] });
          expect(link.getAttribute("href")).toBe(
            `${item.href.pathname}${item.href.hash ? `#${item.href.hash}` : ""}`,
          );
        }
      }
      unmount();
    });

    it(`tags jurisdiction-specific releases with translated names in ${locale}`, async () => {
      const { container, unmount } = await renderPage(locale);
      const names = (CATALOGUES[languageOf(locale)] as unknown as Record<string, Record<string, string>>)
        .Jurisdictions;
      const tagged = releasesFor(country).filter((r) => r.jurisdictions);
      expect(tagged.length).toBeGreaterThan(0);
      const tags = [...container.querySelectorAll("p")].filter((p) =>
        p.textContent?.startsWith(catalogue.affects),
      );
      expect(tags).toHaveLength(tagged.length);
      for (const release of tagged) {
        for (const id of release.jurisdictions!) {
          expect(tags.map((t) => t.textContent).join("|"), `${locale}: ${id}`).toContain(names[id]);
        }
      }
      unmount();
    });
  }

  it("asks for static rendering, so the route stays prerendered", async () => {
    setRequestLocale.mockClear();
    const { unmount } = await renderPage("fr-CA");
    expect(setRequestLocale).toHaveBeenCalledWith("fr-CA");
    unmount();
  });

  it("has a French and a Spanish slug and, per the uk convention, no Ukrainian one", () => {
    const entry = routing.pathnames["/changelog"] as Record<string, string>;
    expect(entry["fr-CA"]).toBe("/nouveautes");
    expect(entry["es-CA"]).toBe("/novedades");
    expect(entry["es-US"]).toBe("/novedades");
    expect(entry["uk-CA"]).toBeUndefined();
  });
});
