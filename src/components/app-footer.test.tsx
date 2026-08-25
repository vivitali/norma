import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import { AppFooter } from "./app-footer";
import { FOOTER } from "@/lib/routes";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

/**
 * Vitest resolves `next-intl/server` to the package's react-client build, where `getTranslations`
 * is a stub that throws. The substitute is next-intl's own `createTranslator` over the real
 * catalogue rather than a `(key) => key` fake: a fake would make every assertion below pass
 * against message keys and prove nothing, and the failure this file exists to catch — a key that
 * resolves to nothing and reaches a French reader as `Legal.footerDisclaimer` — is exactly the one
 * a fake hides.
 */
vi.mock("next-intl/server", async () => {
  const { createTranslator } = await import("next-intl");
  const catalogues: Record<string, Record<string, unknown>> = {
    en: (await import("../../messages/en.json")).default,
    fr: (await import("../../messages/fr.json")).default,
  };
  return {
    getTranslations: async ({ locale, namespace }: { locale: string; namespace: string }) =>
      createTranslator({ locale, messages: catalogues[locale], namespace }),
  };
});

const MESSAGES = { en, fr } as const;

/** Awaited to a plain element before rendering — the shape the App Router uses for an async RSC. */
async function renderFooter(locale: "en" | "fr") {
  return render(await AppFooter({ locale }));
}

describe("AppFooter", () => {
  for (const locale of ["en", "fr"] as const) {
    it(`renders the disclosure verbatim in ${locale}`, async () => {
      const { unmount } = await renderFooter(locale);
      // Asserted on the whole string, not a fragment. A disclaimer silently shortened to
      // something weaker is the failure worth catching, and it would pass a substring check.
      expect(screen.getByText(MESSAGES[locale].Legal.footerDisclaimer)).toBeTruthy();
      unmount();
    });

    it(`links to every legal page in ${locale}`, async () => {
      const { unmount } = await renderFooter(locale);
      const nav = screen.getByRole("navigation", { name: MESSAGES[locale].Legal.legal });
      const links = within(nav).getAllByRole("link");
      expect(links).toHaveLength(FOOTER.length);
      for (const entry of FOOTER) {
        const label = (MESSAGES[locale].Legal as Record<string, string>)[entry.label];
        expect(within(nav).getByRole("link", { name: label })).toBeTruthy();
      }
      unmount();
    });
  }

  it("renders no message key as literal text", async () => {
    // next-intl renders the raw key when one is missing, so `Legal.privacy` reaching a reader is
    // the concrete failure. French is the locale that drifts, so it is the one checked.
    const { container, unmount } = await renderFooter("fr");
    expect(container.textContent ?? "").not.toMatch(/Legal\.\w/);
    unmount();
  });

  it("ships no client JavaScript", () => {
    // Chrome on all eleven prerendered routes. A "use client" here would put the disclaimer and
    // its two links into every page's bundle to render text that never changes.
    const source = readFileSync("src/components/app-footer.tsx", "utf8");
    expect(source).not.toContain('"use client"');
  });

  it("is rendered by the locale layout, so no page can ship without it", () => {
    // The disclosure only does legal work if a reader meets it. Mounting it in the layout rather
    // than per page makes that true by construction — and this notices if someone moves it into
    // one page's tree.
    const layout = readFileSync("src/app/[locale]/layout.tsx", "utf8");
    expect(layout).toContain("<AppFooter");
  });
});
