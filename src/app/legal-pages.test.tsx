import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { OPERATOR, PRIVACY_OFFICER, LEGAL_UPDATED } from "@/lib/legal";
import { CATALOGUES, leafPaths, type Tree } from "@/test/catalogues";
import { languageOf, countryOf } from "@/i18n/countries";
import { routing } from "@/i18n/routing";
import type { Locale } from "@/lib/locales";
import fr from "../../messages/fr.json";
import en from "../../messages/en.json";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

/**
 * `createTranslator` over the real catalogue, not a `(key) => key` fake — see the same mock in
 * `src/components/app-footer.test.tsx` for why. A fake would make every assertion below pass
 * against message keys and prove nothing, and a raw key reaching a reader is the entire failure
 * this file exists to catch.
 *
 * Built from `CATALOGUES` rather than a hardcoded `{ en, fr }` map: these two pages are async
 * server components, so they are absent from `locale-render.test.tsx`'s sweep (which mounts
 * client components under `renderWithIntl`), and the `home-content.test.tsx` precedent of staying
 * en/fr-only does not apply here — Home IS in that sweep and gets swept in all four locales there.
 * Without this, nothing in the suite ever executed a single `t()` call for uk or es on these pages.
 *
 * `CATALOGUES` is keyed by LANGUAGE ("en"/"fr"/"uk"/"es"), not by the full `Locale` pair
 * ("en-CA") these pages actually receive as `params.locale` — see `src/i18n/countries.ts`. The
 * mock's `locale` argument is whatever `getTranslations({ locale, ... })` was called with, i.e.
 * the real `Locale`, so it has to go through `languageOf` to find the right catalogue, exactly as
 * `src/i18n/request.ts` does for a real request.
 */
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { CATALOGUES } = await import("@/test/catalogues");
  const { languageOf } = await import("@/i18n/countries");
  return {
    setRequestLocale: vi.fn(),
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

import PrivacyPage from "./[locale]/privacy/page";
import TermsPage from "./[locale]/terms/page";

/**
 * A per-ROUTE check (this renders both pages) iterates the actual `Locale` pairs from
 * routing.ts, not the language-keyed `CATALOGUES` registry — rendering with a bare "es" would ask
 * these pages for a locale that does not exist since the /ca/ migration. See
 * `src/app/locale-render.test.tsx`, which does the same for the same reason.
 */
const LOCALES = routing.locales;

/**
 * Nothing rendered these two pages before this file existed.
 *
 * `legal.test.ts` reads their source off disk and greps it, which proves the files SAY the right
 * things but never executes a single `t()`. Between them the pages make about thirty translation
 * calls, and next-intl renders the raw key when one is missing — so `Privacy.secOficer` would
 * reach a live reader with the whole suite green. That is the failure `messages.test.ts` calls
 * worse than not translating at all, and the key-side guard in `messages-coverage.test.ts` cannot
 * see it: that one catches a key with no call site, this catches a call site with no key.
 */
const PAGES = [
  { name: "privacy", Page: PrivacyPage, namespace: "Privacy" },
  { name: "terms", Page: TermsPage, namespace: "Terms" },
] as const;

/**
 * The exact key paths that could leak on one of these pages — not a pattern that resembles one.
 *
 * The previous version matched `/\b(Legal|Privacy|Terms|Metadata)\.[a-zA-Z_]+/` against
 * `textContent`, and it is the exact trap CLAUDE.md documents: `textContent` concatenates
 * adjacent elements with no separator, and on `/terms` the sr-only `<dt>Role</dt>` sits directly
 * before `<dd>{operatorRole}</dd>`, so a leaked `Legal.operatorRole` would arrive glued to the
 * text before it as `RoleLegal.operatorRole` — and `\b` finds no boundary between `e` and `L`.
 * Deriving the real key list, as `locale-render.test.tsx`'s `leakableKeys` does, is exact in both
 * directions instead: every leak is caught wherever it lands, and nothing that merely looks like a
 * key is.
 *
 * Scoped to the page's own namespace plus `Legal` — the only two namespaces either page's `t`/`tl`
 * calls ever read (see privacy/page.tsx and terms/page.tsx). `Metadata` is not rendered into the
 * body at all; the previous regex's inclusion of it was never load-bearing.
 */
function leakableKeys(namespace: string): string[] {
  const tree = CATALOGUES.en as Tree;
  return [namespace, "Legal"].flatMap((ns) =>
    ns in tree ? leafPaths(tree[ns] as Tree).map((path) => `${ns}.${path}`) : [],
  );
}

/**
 * Next's generated `PageProps` carries `searchParams` alongside `params`, so the helper takes the
 * full shape — narrowing it to `params` alone makes the two page functions unassignable.
 */
type LegalPage = (props: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) => Promise<React.ReactElement>;

/**
 * Whether `key` is the clause this LOCALE's country actually renders, for a namespace that
 * forks a handful of keys through `countryKey` (`bodyLaw`/`bodyLaw_us`, and so on). A US locale
 * renders the `_us` sibling INSTEAD of the base key, never both, so the base key is not a clause
 * "every locale renders" any more once a `_us` sibling exists for it — and a non-US locale never
 * renders the `_us` sibling at all. Generic over the namespace's own key set rather than a
 * hardcoded list, so a future forked key is covered without editing this test.
 */
function appliesToCountry(key: string, ns: Record<string, string>, locale: Locale): boolean {
  const country = countryOf(locale);
  if (key.endsWith("_us")) return country === "us";
  return !(country === "us" && `${key}_us` in ns);
}

async function renderPage(Page: LegalPage, locale: Locale) {
  return render(
    await Page({ params: Promise.resolve({ locale }), searchParams: Promise.resolve({}) }),
  );
}

describe.each(PAGES)("/$name", ({ Page, namespace }) => {
  for (const locale of LOCALES) {
    it(`renders every clause in ${locale} with no raw message key`, async () => {
      const { container, unmount } = await renderPage(Page, locale);

      const text = container.textContent ?? "";
      const leaked = leakableKeys(namespace).filter((key) => text.includes(key));
      expect(leaked, `${locale}: message keys rendered verbatim`).toEqual([]);

      // Every `sec*` key in the namespace must appear as a real heading. Derived from the
      // catalogue rather than listed here, so adding a clause to the page without adding its
      // heading — or misspelling either — fails without anyone remembering to update this test.
      const ns = (CATALOGUES[languageOf(locale)] as unknown as Record<string, Record<string, string>>)[namespace];
      const headings = Object.entries(ns).filter(
        ([key]) => key.startsWith("sec") && appliesToCountry(key, ns, locale),
      );
      expect(headings.length).toBeGreaterThan(0);
      for (const [key, headingText] of headings) {
        expect(screen.getByRole("heading", { level: 2, name: headingText }), key).toBeTruthy();
      }

      // And every `body*` key must render as prose beneath one — the clause THIS locale's
      // country actually renders, not its country-forked sibling. See `appliesToCountry`.
      for (const [key, bodyText] of Object.entries(ns)) {
        if (!key.startsWith("body") || !appliesToCountry(key, ns, locale)) continue;
        expect(screen.getByText(bodyText), key).toBeTruthy();
      }

      unmount();
    });

    it(`names the page, not the headline, as its only h1 in ${locale}`, async () => {
      // Matches every other screen in the app — see the note in tool-page.tsx. A screen-reader
      // user jumping by heading wants "Privacy", not the opening sentence.
      const { unmount } = await renderPage(Page, locale);
      const h1s = screen.getAllByRole("heading", { level: 1 });
      expect(h1s).toHaveLength(1);
      expect(h1s[0].textContent).toBe(
        (CATALOGUES[languageOf(locale)] as unknown as Record<string, Record<string, string>>)[namespace].eyebrow,
      );
      unmount();
    });

    it(`dates itself machine-readably in ${locale}`, async () => {
      const { container, unmount } = await renderPage(Page, locale);
      const time = container.querySelector("time");
      expect(time?.getAttribute("dateTime")).toBe(LEGAL_UPDATED);
      // The human half is a translated literal and the machine half a constant; they can drift.
      expect(time?.textContent).toContain(
        (CATALOGUES[languageOf(locale)] as { Legal: { updatedLong: string } }).Legal.updatedLong,
      );
      unmount();
    });
  }
});

describe("the named parties", () => {
  it("publishes the privacy officer's title, name and address — Private Sector Act s. 3.1", async () => {
    const { container, unmount } = await renderPage(PrivacyPage, "fr-CA");
    const list = container.querySelector("dl");
    expect(list).toBeTruthy();
    // The title is a translated role; the name and address are data from src/lib/legal.ts.
    expect(within(list!).getByText(fr.Legal.officerTitle)).toBeTruthy();
    expect(within(list!).getByText(PRIVACY_OFFICER.name)).toBeTruthy();
    const mail = within(list!).getByRole("link", { name: PRIVACY_OFFICER.email });
    expect(mail.getAttribute("href")).toBe(`mailto:${PRIVACY_OFFICER.email}`);
    unmount();
  });

  it("names who operates the site on /terms", async () => {
    const { container, unmount } = await renderPage(TermsPage, "en-CA");
    const list = container.querySelector("dl");
    expect(within(list!).getByText(OPERATOR.name)).toBeTruthy();
    expect(within(list!).getByRole("link", { name: OPERATOR.email })).toBeTruthy();
    unmount();
  });

  it("gives the contact list working term/description pairs", async () => {
    // The <dt>s are "Role"/"Name"/"Email", not the values repeated. The first version put the
    // role in both halves, so a screen reader announced it twice and the <dl> had no working
    // term/description relationship at all.
    const { container, unmount } = await renderPage(PrivacyPage, "fr-CA");
    const terms = [...container.querySelectorAll("dt")].map((node) => node.textContent);
    expect(terms).toEqual([fr.Legal.roleLabel, fr.Legal.nameLabel, fr.Legal.emailLabel]);
    expect(terms).not.toContain(fr.Legal.officerTitle);
    unmount();
  });
});

describe("the US market fork", () => {
  it("shows the US governing-law paragraph at /us/en/terms, not the Quebec-consumer one", async () => {
    const { container, unmount } = await renderPage(TermsPage, "en-US");
    const text = container.textContent ?? "";
    expect(text, "must render the US governing-law paragraph").toContain(en.Terms.bodyLaw_us);
    // The CA-only sentence conditioned on being a Quebec CONSUMER — confusing to a US reader
    // and dropped by design (CLAUDE.md's US-market wording rules). Checked as the one sentence
    // that actually differs, not the whole CA paragraph: `bodyLaw_us` legitimately repeats
    // "Quebec" and "the laws of Canada" from `bodyLaw`, for the same substantive reason — the
    // operator's own governing law does not change with the reader's location.
    expect(text, "must not render the Quebec-consumer forum sentence").not.toContain(
      "If you are a consumer resident in Quebec",
    );
    unmount();
  });

  /**
   * The forbidden-vocabulary check for these two pages, in the spirit of
   * `page-contracts.test.tsx`'s "US vocabulary contract" — but Terms/Privacy are async server
   * components rendered through the `next-intl/server` mock above, not the client components
   * that file's `PAGES` list mounts, so they get their own sweep here instead of joining that
   * list.
   *
   * "notary"/"notaire"/"notario" is the CA-only closing role `bodyNot` and `footerDisclaimer`
   * named for a CA reader and forked away for a US one, where a closing uses a title company or
   * an attorney. "Quebec"/"Québec" is the operator's own governing-law disclosure
   * (`Terms.bodyLaw`) — the one place a US reader legitimately sees it, per the wording rule
   * that the US fork KEEPS the operator's own province as governing law rather than inventing a
   * US one. `bodyLaw_us`'s own text is stripped from the scanned string before the check, the
   * same way `page-contracts.test.tsx` strips the country-switcher labels before its own sweep —
   * every OTHER mention of Quebec (the old page subtitle, the "outside Quebec" heading, the
   * cross-border disclosure) is a leak the US fork above fixed, and this is what keeps it fixed.
   */
  const FORBIDDEN_US_LEGAL: Record<"en" | "es", readonly string[]> = {
    en: ["Québec", "Quebec", "notary", "notaire"],
    es: ["Québec", "Quebec", "notario"],
  };

  it.each(PAGES)(
    "/$name: no notary/Quebec vocabulary outside the governing-law disclosure, at en-US",
    async ({ Page }) => {
      const { container, unmount } = await renderPage(Page, "en-US");
      const text = (container.textContent ?? "").split(en.Terms.bodyLaw_us).join(" ");
      for (const word of FORBIDDEN_US_LEGAL.en) {
        expect(text, `"${word}" leaked onto the en-US render`).not.toContain(word);
      }
      unmount();
    },
  );

  it.each(PAGES)(
    "/$name: no notary/Quebec vocabulary outside the governing-law disclosure, at es-US",
    async ({ Page }) => {
      const { container, unmount } = await renderPage(Page, "es-US");
      const esBodyLawUs = (CATALOGUES.es as { Terms: { bodyLaw_us: string } }).Terms.bodyLaw_us;
      const text = (container.textContent ?? "").split(esBodyLawUs).join(" ");
      for (const word of FORBIDDEN_US_LEGAL.es) {
        expect(text, `"${word}" leaked onto the es-US render`).not.toContain(word);
      }
      unmount();
    },
  );
});
