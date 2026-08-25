import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { OPERATOR, PRIVACY_OFFICER, LEGAL_UPDATED } from "@/lib/legal";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

/**
 * `createTranslator` over the real catalogue, not a `(key) => key` fake — see the same mock in
 * `src/components/app-footer.test.tsx` for why. A fake would make every assertion below pass
 * against message keys and prove nothing, and a raw key reaching a reader is the entire failure
 * this file exists to catch.
 */
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const catalogues: Record<string, Record<string, unknown>> = {
    en: (await import("../../messages/en.json")).default,
    fr: (await import("../../messages/fr.json")).default,
  };
  return {
    setRequestLocale: vi.fn(),
    getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) =>
      createTranslator({ locale, messages: catalogues[locale], namespace }),
  };
});

import PrivacyPage from "./[locale]/privacy/page";
import TermsPage from "./[locale]/terms/page";

const MESSAGES = { en, fr } as const;
type Locale = keyof typeof MESSAGES;

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

/** Every namespace whose keys could leak into these pages, as next-intl would print them. */
const RAW_KEY = /\b(Legal|Privacy|Terms|Metadata)\.[a-zA-Z_]+/;

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
  for (const locale of ["en", "fr"] as const) {
    it(`renders every clause in ${locale} with no raw message key`, async () => {
      const { container, unmount } = await renderPage(Page, locale);

      expect(container.textContent ?? "").not.toMatch(RAW_KEY);

      // Every `sec*` key in the namespace must appear as a real heading. Derived from the
      // catalogue rather than listed here, so adding a clause to the page without adding its
      // heading — or misspelling either — fails without anyone remembering to update this test.
      const ns = MESSAGES[locale][namespace] as Record<string, string>;
      const headings = Object.entries(ns).filter(([key]) => key.startsWith("sec"));
      expect(headings.length).toBeGreaterThan(0);
      for (const [key, text] of headings) {
        expect(screen.getByRole("heading", { level: 2, name: text }), key).toBeTruthy();
      }

      // And every `body*` key must render as prose beneath one.
      for (const [key, text] of Object.entries(ns)) {
        if (!key.startsWith("body")) continue;
        expect(screen.getByText(text), key).toBeTruthy();
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
        (MESSAGES[locale][namespace] as Record<string, string>).eyebrow,
      );
      unmount();
    });

    it(`dates itself machine-readably in ${locale}`, async () => {
      const { container, unmount } = await renderPage(Page, locale);
      const time = container.querySelector("time");
      expect(time?.getAttribute("dateTime")).toBe(LEGAL_UPDATED);
      // The human half is a translated literal and the machine half a constant; they can drift.
      expect(time?.textContent).toContain(MESSAGES[locale].Legal.updatedLong);
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
