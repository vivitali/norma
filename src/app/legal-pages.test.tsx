import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { OPERATOR, PRIVACY_OFFICER, LEGAL_UPDATED } from "@/lib/legal";
import { CATALOGUES, leafPaths, type Tree } from "@/test/catalogues";
import type { Locale } from "@/lib/locales";
import fr from "../../messages/fr.json";

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
 */
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const { CATALOGUES } = await import("@/test/catalogues");
  return {
    setRequestLocale: vi.fn(),
    getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) =>
      createTranslator({
        locale,
        messages: (CATALOGUES as unknown as Record<string, Record<string, unknown>>)[locale],
        namespace,
      }),
  };
});

import PrivacyPage from "./[locale]/privacy/page";
import TermsPage from "./[locale]/terms/page";

const LOCALES = Object.keys(CATALOGUES) as Locale[];

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
      const ns = (CATALOGUES[locale] as unknown as Record<string, Record<string, string>>)[namespace];
      const headings = Object.entries(ns).filter(([key]) => key.startsWith("sec"));
      expect(headings.length).toBeGreaterThan(0);
      for (const [key, headingText] of headings) {
        expect(screen.getByRole("heading", { level: 2, name: headingText }), key).toBeTruthy();
      }

      // And every `body*` key must render as prose beneath one.
      for (const [key, bodyText] of Object.entries(ns)) {
        if (!key.startsWith("body")) continue;
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
        (CATALOGUES[locale] as unknown as Record<string, Record<string, string>>)[namespace].eyebrow,
      );
      unmount();
    });

    it(`dates itself machine-readably in ${locale}`, async () => {
      const { container, unmount } = await renderPage(Page, locale);
      const time = container.querySelector("time");
      expect(time?.getAttribute("dateTime")).toBe(LEGAL_UPDATED);
      // The human half is a translated literal and the machine half a constant; they can drift.
      expect(time?.textContent).toContain(
        (CATALOGUES[locale] as { Legal: { updatedLong: string } }).Legal.updatedLong,
      );
      unmount();
    });
  }
});

describe("the named parties", () => {
  it("publishes the privacy officer's title, name and address — Private Sector Act s. 3.1", async () => {
    const { container, unmount } = await renderPage(PrivacyPage, "fr");
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
    const { container, unmount } = await renderPage(TermsPage, "en");
    const list = container.querySelector("dl");
    expect(within(list!).getByText(OPERATOR.name)).toBeTruthy();
    expect(within(list!).getByRole("link", { name: OPERATOR.email })).toBeTruthy();
    unmount();
  });

  it("gives the contact list working term/description pairs", async () => {
    // The <dt>s are "Role"/"Name"/"Email", not the values repeated. The first version put the
    // role in both halves, so a screen reader announced it twice and the <dl> had no working
    // term/description relationship at all.
    const { container, unmount } = await renderPage(PrivacyPage, "fr");
    const terms = [...container.querySelectorAll("dt")].map((node) => node.textContent);
    expect(terms).toEqual([fr.Legal.roleLabel, fr.Legal.nameLabel, fr.Legal.emailLabel]);
    expect(terms).not.toContain(fr.Legal.officerTitle);
    unmount();
  });
});
