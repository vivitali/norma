import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { CrossLink } from "./cross-link";
import { routing } from "@/i18n/routing";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { vi } from "vitest";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

type Catalogue = Record<string, Record<string, string>>;

/** Every cross-page sentence, by convention `x` + the destination. */
function crossKeys(messages: Catalogue): [string, string][] {
  return Object.entries(messages).flatMap(([ns, keys]) =>
    Object.keys(keys)
      .filter((k) => /^x[A-Z]/.test(k))
      .map((k) => [ns, k] as [string, string]),
  );
}

describe("CrossLink", () => {
  it("renders the sentence with the page name as the link", () => {
    renderWithIntl(
      <CrossLink namespace="Affordability" id="xClosing" href="/closing-costs" />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/closing-costs");
    // The sentence has to be worth reading unclicked, so the link is a phrase
    // inside it — not the whole line, and not a bare "learn more".
    expect(link.textContent).not.toBe(link.parentElement?.textContent);
  });
});

describe("the cross-link rules", () => {
  it("keeps every sentence in both locales", () => {
    const enKeys = crossKeys(en as unknown as Catalogue).map(([ns, k]) => `${ns}.${k}`).sort();
    const frKeys = crossKeys(fr as unknown as Catalogue).map(([ns, k]) => `${ns}.${k}`).sort();
    expect(enKeys).toEqual(frKeys);
    expect(enKeys.length).toBeGreaterThan(0);
  });

  it("gives every sentence exactly one link, and never makes the link the whole sentence", () => {
    // A line whose entire text is the link is an advertisement. The rule is that
    // the sentence tells the reader something true even if they never click.
    for (const [locale, messages] of [["en", en], ["fr", fr]] as const) {
      for (const [ns, key] of crossKeys(messages as unknown as Catalogue)) {
        const text = (messages as unknown as Catalogue)[ns][key];
        expect([...text.matchAll(/<link>/g)], `${locale} ${ns}.${key}`).toHaveLength(1);
        const inner = /<link>(.*?)<\/link>/.exec(text)![1];
        expect(inner.length, `${locale} ${ns}.${key} is only a link`).toBeLessThan(
          text.replace(/<\/?link>/g, "").length - 20,
        );
      }
    }
  });

  it("never uses promotional vocabulary", () => {
    // PRODUCT.md's voice: names what the other page computes, never asserts a
    // benefit and never sells the click.
    const banned = /learn more|find out|try (it|our)|explore|discover|check out|calculator|click here|would you like/i;
    for (const [locale, messages] of [["en", en], ["fr", fr]] as const) {
      for (const [ns, key] of crossKeys(messages as unknown as Catalogue)) {
        expect((messages as unknown as Catalogue)[ns][key], `${locale} ${ns}.${key}`).not.toMatch(
          banned,
        );
      }
    }
  });

  it("never lets a page point at itself", () => {
    const PAGES = [
      "affordability", "closing-costs", "down-payment",
      "rrsp-hbp", "amortization", "rent-vs-buy", "scenarios",
    ];
    for (const page of PAGES) {
      const source = readFileSync(`src/app/[locale]/${page}/page.tsx`, "utf8");
      for (const m of source.matchAll(/<CrossLink[\s\S]*?href="([^"]+)"/g)) {
        expect(m[1], `${page} links to itself`).not.toBe(`/${page}`);
      }
    }
  });

  it("points every link at a route that exists", () => {
    const routes = new Set(Object.keys(routing.pathnames));
    const PAGES = [
      "affordability", "closing-costs", "down-payment",
      "rrsp-hbp", "amortization", "rent-vs-buy", "scenarios",
    ];
    for (const page of PAGES) {
      const source = readFileSync(`src/app/[locale]/${page}/page.tsx`, "utf8");
      for (const m of source.matchAll(/<CrossLink[\s\S]*?href="([^"]+)"/g)) {
        expect(routes, `${page} -> ${m[1]}`).toContain(m[1]);
        // Rule: a page never points at itself.
        expect(m[1]).not.toBe(`/${page}`);
      }
    }
  });
});
