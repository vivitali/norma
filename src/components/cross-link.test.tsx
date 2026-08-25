import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { CrossLink, TraceLabel } from "./cross-link";
import { routing } from "@/i18n/routing";
import { NAV } from "@/lib/routes";
import { SECTION_REGISTRIES } from "@/lib/sections";
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

  const PAGES = [
    "affordability", "closing-costs", "down-payment",
    "rrsp-hbp", "amortization", "rent-vs-buy", "scenarios",
  ];

  /**
   * Every cross-page destination written on a tool page, in either shape.
   *
   * Source-level and one scanner for BOTH components, because the rules are
   * about where a link may point rather than about which component renders it —
   * and because the object form (`{{ pathname, hash }}`) is the only way a
   * link can name a section, so a scan that only understood `href="…"` would
   * silently stop covering exactly the links that carry a hash.
   */
  function destinations(page: string): { component: string; route: string; hash?: string }[] {
    const source = readFileSync(`src/app/[locale]/${page}/page.tsx`, "utf8");
    const pattern =
      /<(CrossLink|TraceLabel)\b[\s\S]*?href=(?:"([^"]+)"|\{\{\s*pathname:\s*"([^"]+)",\s*hash:\s*"#([^"]+)"\s*\}\})/g;
    return [...source.matchAll(pattern)].map((m) => ({
      component: m[1],
      route: m[2] ?? m[3],
      hash: m[4],
    }));
  }

  it("finds links on every page that has them, so the scans cannot pass vacuously", () => {
    const found = PAGES.flatMap(destinations);
    expect(found.filter((d) => d.component === "CrossLink").length).toBeGreaterThan(0);
    expect(found.filter((d) => d.component === "TraceLabel").length).toBeGreaterThan(0);
    expect(found.filter((d) => d.hash !== undefined).length).toBeGreaterThan(0);
  });

  it("never lets a page point at itself", () => {
    for (const page of PAGES) {
      for (const { route } of destinations(page)) {
        expect(route, `${page} links to itself`).not.toBe(`/${page}`);
      }
    }
  });

  it("points every link at a route that exists", () => {
    const routes = new Set(Object.keys(routing.pathnames));
    for (const page of PAGES) {
      for (const { route } of destinations(page)) {
        expect(routes, `${page} -> ${route}`).toContain(route);
      }
    }
  });

  it("points every link at a page that is actually built", () => {
    // The nav registry renders only built entries, so an unbuilt route is a
    // reachable 404 the navigation itself would never have offered.
    const built = new Set(
      NAV.flatMap((group) => group.entries).filter((e) => e.built).map((e) => e.route as string),
    );
    for (const page of PAGES) {
      for (const { route } of destinations(page)) {
        expect(built, `${page} -> ${route} is not built`).toContain(route);
      }
    }
  });

  it("names a real section when it carries a hash", () => {
    // A hash suppresses the destination page's own default section and moves
    // focus to the one it names. A hash naming nothing lands the reader on a
    // page with EVERY section closed and their focus unmoved -- worse than the
    // plain route, and invisible until someone follows the link.
    const ids = (namespace: string): readonly string[] =>
      SECTION_REGISTRIES.find((r) => r.namespace === namespace)!.sections.map((s) => s.id);
    const sectionsFor: Record<string, readonly string[]> = {
      "/affordability": ids("Affordability"),
      "/closing-costs": ids("ClosingCosts"),
      "/down-payment": ids("DownPayment"),
      "/rrsp-hbp": ids("RrspHbp"),
      "/amortization": ids("Amortization"),
      "/rent-vs-buy": ids("RentVsBuy"),
      "/scenarios": ids("Scenarios"),
    };
    for (const page of PAGES) {
      for (const { route, hash } of destinations(page)) {
        if (hash === undefined) continue;
        expect(sectionsFor[route], `${page} -> ${route}#${hash}`).toContain(hash);
      }
    }
  });

  it("carries the reader's numbers to wherever it points", () => {
    // A link that drops the inputs is worse than no link: the reader arrives at
    // a page of default figures that look like theirs. Nothing is passed in the
    // URL -- the shared blob does it -- so what has to hold is that the
    // destination reads the SAME allowlist. A page inventing its own is how that
    // guarantee would be lost, and it would look fine until someone clicked.
    for (const page of PAGES) {
      for (const { route } of destinations(page)) {
        const target = readFileSync(`src/app/[locale]${route}/page.tsx`, "utf8");
        expect(target, `${route} does not read the shared inputs`).toContain(
          "useSharedState(TOOL_KEYS, TOOL_DEFAULTS)",
        );
      }
    }
  });
});

describe("TraceLabel", () => {
  it("links the row's own label, and writes no copy of its own", () => {
    renderWithIntl(
      <TraceLabel
        namespace="Affordability"
        id="mPi"
        href={{ pathname: "/amortization", hash: "#payment" }}
      />,
    );
    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/amortization#payment");
    // The whole point: the accessible name IS the label the row already shows,
    // so there is no second string to translate and none to drift.
    expect(link.textContent).toBe((en as unknown as Catalogue).Affordability.mPi);
    expect(link.textContent).not.toMatch(/^\s*$/);
  });

  it("makes sense in a screen reader's link list", () => {
    // WCAG 2.4.4: the name has to survive being read out of context. A label
    // that is one word, or a bare figure, does not.
    renderWithIntl(<TraceLabel namespace="DownPayment" id="closingCosts" href="/closing-costs" />);
    const name = screen.getByRole("link").textContent ?? "";
    expect(name.trim().length).toBeGreaterThan(4);
    expect(name).not.toMatch(/\d/);
  });
});
