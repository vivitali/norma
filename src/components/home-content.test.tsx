import { describe, expect, it, vi, afterEach } from "vitest";
import { screen, cleanup } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { NAV, builtEntries } from "@/lib/routes";
import { faqPageSchema } from "@/components/json-ld";
import en from "../../messages/en.json";
import fr from "../../messages/fr.json";
import { CATALOGUES } from "@/test/catalogues";
import { HOME_FAQ_KEYS, HomeContent } from "./home-content";

vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

/** Every route a visitor can reach, each once — what the home page owes a link to. */
const BUILT_ROUTES = [...new Set(NAV.flatMap(builtEntries).map((e) => e.route))];

describe("HomeContent", () => {
  afterEach(() => cleanup());

  it("renders the heading", () => {
    renderWithIntl(<HomeContent />);
    expect(
      screen.getByRole("heading", { name: "What can you actually afford?" }),
    ).toBeInTheDocument();
  });

  it("links its primary CTA to the affordability page", () => {
    renderWithIntl(<HomeContent />);
    expect(screen.getByRole("link", { name: "See what you can afford" })).toHaveAttribute(
      "href",
      "/affordability",
    );
  });

  it("offers renters their own entry point beside the buying one", () => {
    // PRODUCT.md: buyers and renters are co-equal users, not a funnel and a side trip.
    renderWithIntl(<HomeContent />);
    expect(screen.getByRole("link", { name: "Compare renting and buying" })).toHaveAttribute(
      "href",
      "/rent-vs-buy",
    );
  });
});

describe("internal linking", () => {
  afterEach(() => cleanup());

  it("links to every route a visitor can reach", () => {
    // The whole reason this page was rebuilt: it linked to one of nine surfaces, so eight pages
    // had no path in from the one URL every inbound link lands on.
    const { container } = renderWithIntl(<HomeContent />);
    for (const route of BUILT_ROUTES) {
      expect(container.querySelector(`a[href="${route}"]`), route).not.toBeNull();
    }
  });

  it("gives each tool link the tool's name and what it answers as its anchor text", () => {
    renderWithIntl(<HomeContent />);
    const tools = screen.getByRole("region", { name: "What each tool answers" });
    for (const entry of NAV.flatMap(builtEntries)) {
      const label = (en.Nav as Record<string, string>)[entry.label];
      const description = (en.Home as Record<string, string>)[`tool_${entry.label}`];
      expect(description, `Home.tool_${entry.label}`).toBeTruthy();
      const link = tools.querySelector(`a[href="${entry.route}"]`);
      expect(link, entry.route).not.toBeNull();
      expect(link?.textContent, entry.route).toContain(label);
      expect(link?.textContent, entry.route).toContain(description);
    }
  });

  it("lists Rent vs Buy once in the directory, though NAV carries it twice", () => {
    // Two groups is correct for a menu and wrong for a directory: two identical anchors to one
    // URL reads as a duplication bug to a person and is a weaker internal link than one.
    renderWithIntl(<HomeContent />);
    const tools = screen.getByRole("region", { name: "What each tool answers" });
    expect(
      [...tools.querySelectorAll("a")].filter((a) => a.getAttribute("href") === "/rent-vs-buy"),
    ).toHaveLength(1);
  });

  it("writes no route string of its own", async () => {
    // Routes come from src/lib/routes.ts. A literal here is how a slug rename silently 404s.
    const source = await import("node:fs").then((fs) =>
      fs.readFileSync("src/components/home-content.tsx", "utf8"),
    );
    const literals = [...source.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
    expect(literals.filter((href) => !["/affordability", "/rent-vs-buy", "/sources"].includes(href)))
      .toEqual([]);
  });
});

describe("heading hierarchy", () => {
  afterEach(() => cleanup());

  it("has exactly one h1", () => {
    renderWithIntl(<HomeContent />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
  });

  it("skips no level between h1 and the deepest heading", () => {
    const { container } = renderWithIntl(<HomeContent />);
    const levels = [...container.querySelectorAll("h1,h2,h3,h4,h5,h6")].map((h) =>
      Number(h.tagName[1]),
    );
    expect(levels[0]).toBe(1);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i] - levels[i - 1], `${levels[i - 1]} -> ${levels[i]}`).toBeLessThanOrEqual(1);
    }
  });

  it("gives every section a heading of its own", () => {
    renderWithIntl(<HomeContent />);
    expect(screen.getAllByRole("heading", { level: 2 }).map((h) => h.textContent)).toEqual([
      "Two ceilings, not one",
      "Provincial rules, not national averages",
      "What each tool answers",
      "Questions this answers",
    ]);
  });
});

describe("positioning", () => {
  afterEach(() => cleanup());

  it("states the two-ceilings claim, and that the binding one is named", () => {
    renderWithIntl(<HomeContent />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Two ceilings, computed side by side");
    expect(text).toContain("GDS and TDS");
    expect(text).toMatch(/whichever one binds is named/);
  });

  it("does not promise that the lower ceiling sets the headline price", () => {
    // It does not. `affordability/page.tsx` puts `result.comfort` in the hero
    // unconditionally, so when a low income drops the lender ceiling BELOW the comfort
    // price the headline is the higher of the two — see the contract test in
    // affordability/page.test.tsx, which pins that deliberately.
    //
    // This page used to say "The lower ceiling sets the price and the other one is
    // noise" and "The lower one decides". Both were false of the built product, on the
    // one page whose copy is also emitted as FAQPage structured data — where a claim is
    // stripped of the screen that would have contradicted it.
    const banned = [
      /lower ceiling sets the price/i,
      /lower one decides/i,
      /names the lower one/i,
      /plus bas des deux qui décide|plafond le plus bas qui fixe le prix/i,
      /[Dd]ecide el más bajo|techo más bajo fija el precio/i,
      /Вирішує нижча|Ціну задає нижча межа/i,
    ];
    for (const [locale, messages] of Object.entries(CATALOGUES)) {
      const home = JSON.stringify((messages as unknown as Record<string, unknown>).Home);
      for (const pattern of banned) expect(home, locale).not.toMatch(pattern);
    }
  });

  it("describes the second ceiling as a budget you set, not as your income", () => {
    // The deeper half of the same error: the comfort ceiling does not start from net
    // income. It is `comfortCeiling` — a monthly all-in figure the reader states, which
    // defaults to a flat $2,700 — so there is no income term in the headline at all.
    // Saying "net income after tax, minus property tax…" told the reader the number
    // would move when they typed their salary, and it never does.
    renderWithIntl(<HomeContent />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/You set that figure — nothing here infers it from your income/);
  });

  it("says provincial rules are applied, across fourteen jurisdictions", () => {
    // A binding brand commitment (PRODUCT.md), and the one thing a competitor cannot copy
    // without doing the same jurisdiction-by-jurisdiction work.
    renderWithIntl(<HomeContent />);
    const text = document.body.textContent ?? "";
    expect(text).toContain("Provincial rules, not national averages");
    expect(text).toContain("Fourteen jurisdictions");
  });

  it("describes how the figures are sourced, and links to the sources page", () => {
    const { container } = renderWithIntl(<HomeContent />);
    const text = document.body.textContent ?? "";
    // Used to assert the word "placeholders". That claim was true when it was written and became
    // false when #5 landed — every jurisdiction figure now carries a provenance record — so the
    // test was pinning a statement the product had outgrown. It matters more than most copy: the
    // FAQ answers feed the FAQPage JSON-LD from the SAME keys they render (see HOME_FAQ_KEYS), so
    // a wrong answer here is served to machines that strip the surrounding context.
    expect(text).toContain("sourcing record");
    expect(container.querySelector('a[href="/sources"]')).not.toBeNull();
  });

  it("does not claim the figures are unverified placeholders any more", () => {
    renderWithIntl(<HomeContent />);
    const text = document.body.textContent ?? "";
    for (const stale of ["placeholders", "Not yet", "not verified yet"]) {
      expect(text, `home page still says "${stale}"`).not.toContain(stale);
    }
  });

  it("still discloses the two honest limits rather than claiming everything is confirmed", () => {
    // The opposite failure mode, and the one to watch now: over-claiming. Some figures are our
    // own defaults and some are genuinely unpublished, and the home page has to keep saying so.
    renderWithIntl(<HomeContent />);
    const text = document.body.textContent ?? "";
    expect(text).toMatch(/defaults we chose and disclose/);
    expect(text).toMatch(/nobody publishes them/);
  });

  it("claims no adoption, no verification and no price, in any locale", () => {
    // PRODUCT.md, Evidence on Hand: no users, no traffic, no testimonials, no press, no revenue.
    // Copy may not fabricate any of them, and a translator has no more licence than a writer.
    //
    // English patterns catch the untranslated brand-speak that tends to survive a translation
    // pass ("#1", "award"); the rest are the same claims in each language. `gratis`/`gratuit`
    // matter most: monetization is undecided, so no locale may promise a price.
    const banned = [
      /trusted by|thousands|join \d|millions|#1\b|award|free|verified rules|official rates|no cost/i,
      /gratuit|sans frais|approuv[ée] par des milliers/i,
      /gratis|sin costo|miles de (usuarios|personas)|premiad/i,
      /безкоштовн|безплатн|тисячі (користувачів|людей)|нагород/i,
    ];
    for (const [locale, messages] of Object.entries(CATALOGUES)) {
      const home = JSON.stringify((messages as unknown as Record<string, unknown>).Home);
      for (const pattern of banned) expect(home, locale).not.toMatch(pattern);
    }
  });
});

describe("FAQ", () => {
  afterEach(() => cleanup());

  it("renders every question and answer the key list names", () => {
    renderWithIntl(<HomeContent />);
    const text = document.body.textContent ?? "";
    for (const key of HOME_FAQ_KEYS) {
      const home = en.Home as Record<string, string>;
      expect(text, `faqQ_${key}`).toContain(home[`faqQ_${key}`]);
      expect(text, `faqA_${key}`).toContain(home[`faqA_${key}`]);
    }
  });

  it("marks up only questions the page shows", () => {
    // The failure mode FAQPage schema invites is markup describing content that is not there.
    // Both come off HOME_FAQ_KEYS, and this is what keeps that true.
    renderWithIntl(<HomeContent />);
    const home = en.Home as Record<string, string>;
    const schema = faqPageSchema(
      HOME_FAQ_KEYS.map((key) => ({
        question: home[`faqQ_${key}`],
        answer: home[`faqA_${key}`],
      })),
    ) as { mainEntity: { name: string }[] };
    const rendered = document.body.textContent ?? "";
    for (const question of schema.mainEntity) {
      expect(rendered, question.name).toContain(question.name);
    }
  });

  it("answers whether a non-Canadian may buy at all, before any question about price", () => {
    // Purchase eligibility sits before every number the product computes, and the words
    // "permanent", "foreign", "work permit", "immigrat" and "abroad" appeared in no
    // catalogue in any language. It belongs on the home page because the residency control
    // that carries the same sentence only renders where the dataset has a residency-gated
    // charge — Halifax alone — and this question is federal.
    renderWithIntl(<HomeContent />);
    const home = en.Home as Record<string, string>;
    expect(document.body.textContent).toContain(home.faqQ_eligibility);
    expect(document.body.textContent).toContain(home.faqA_eligibility);
  });

  it("keeps the eligibility answer qualitative, in every locale", () => {
    // These answers are emitted as FAQPage structured data, whose whole function is to make
    // a claim extractable by machines that strip the surrounding context. CLAUDE.md admits a
    // qualitative "which rules exist and who levies them" answer, and admits a NUMBER only
    // at conf "high" with its asOf quoted. The federal Act is time-limited and has been
    // extended by regulation, so a date here is both an unsourced figure and a maintenance
    // liability that expires silently. A translator has no more licence than a writer.
    for (const [locale, messages] of Object.entries(CATALOGUES)) {
      const home = (messages as unknown as { Home: Record<string, string> }).Home;
      expect(home.faqA_eligibility, `${locale} faqA_eligibility`).toBeTruthy();
      expect(home.faqA_eligibility, `${locale} names a date or a figure`).not.toMatch(/\d/);
      expect(home.faqQ_eligibility, `${locale} faqQ_eligibility`).not.toMatch(/\d/);
    }
  });

  it("answers the query the page is written for", () => {
    renderWithIntl(<HomeContent />);
    expect(document.body.textContent).toContain("How much house can I afford in Canada?");
  });
});

describe("French", () => {
  afterEach(() => cleanup());

  it("leaks no raw message key", () => {
    const { container } = renderWithIntl(<HomeContent />, { locale: "fr" });
    expect(container.textContent).not.toMatch(/\bHome\.[a-zA-Z_]+/);
    expect(container.textContent).not.toMatch(/\bNav\.[a-zA-Z_]+/);
  });

  it("translates the tool descriptions rather than falling back to English", () => {
    renderWithIntl(<HomeContent />, { locale: "fr" });
    expect(document.body.textContent).toContain(fr.Home.toolsHeading);
    expect(document.body.textContent).toContain(fr.Home.tool_closingCosts);
  });
});
