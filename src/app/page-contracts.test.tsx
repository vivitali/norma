import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { jurisdictions } from "@/domain/jurisdictions";
import { SECTION_REGISTRIES } from "@/lib/sections";
import { benchmarkPrice } from "@/lib/resolve-inputs";

import AffordabilityPage from "./[locale]/affordability/page";
import ClosingCostsPage from "./[locale]/closing-costs/page";
import DownPaymentPage from "./[locale]/down-payment/page";
import RrspHbpPage from "./[locale]/rrsp-hbp/page";
import AmortizationPage from "./[locale]/amortization/page";
import RentVsBuyPage from "./[locale]/rent-vs-buy/page";
import ScenariosPage from "./[locale]/scenarios/page";
import { HomeContent } from "@/components/home-content";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

/**
 * No screen may ever render a non-finite number.
 *
 * `money()` formats whatever it is handed, so a field that goes `undefined` —
 * a renamed engine key, a typo, a value the engine stopped returning — reaches
 * the reader as **"$NaN"** rather than as a crash or a blank. On a product whose
 * whole claim is that its arithmetic is honest and traceable, that is the worst
 * available failure mode: it is visibly broken, and it is broken in the one place
 * the reader came to trust.
 *
 * This is not hypothetical. Renaming `inclusionIfMissed` to `taxIfMissed` in the
 * engine produced exactly that on the RRSP-HBP screen for as long as the page
 * still read the old name. Nothing failed; the tests were green throughout,
 * because every one of them asserts on copy rather than on the absence of
 * garbage.
 *
 * Every section is opened first — a collapsed panel hides its own figures, which
 * is where a stale key is most likely to be.
 */
const PAGES = [
  ["Affordability", AffordabilityPage],
  ["Closing costs", ClosingCostsPage],
  ["Down payment", DownPaymentPage],
  ["RRSP-HBP", RrspHbpPage],
  ["Amortization", AmortizationPage],
  ["Rent vs buy", RentVsBuyPage],
  ["Scenarios", ScenariosPage],
] as const;

/**
 * The pages whose headline figure is computed FROM the purchase price, and which therefore
 * must ask for one rather than answer where no benchmark is published. Named positively so
 * that adding a page here is a claim about that page, not an exemption granted to it.
 */
const PRICE_DERIVED_HEADLINE = new Set<string>([
  "Closing costs",
  "Down payment",
  "Amortization",
  "Rent vs buy",
  "Scenarios",
]);


/**
 * Stored state a page needs before it will render an ANSWER at all.
 *
 * Rent vs buy weighs a purchase against a PUBLISHED rent, and every rent in this
 * dataset is a CMHC two-bedroom apartment average. That answers a condo purchase
 * and nothing else, so on the default `ptype: "house"` the page correctly asks
 * for a rent instead of printing a verdict — and a contract about sections, or
 * about figures inside them, then has nothing to inspect. Seeding a condo puts
 * the page in the state these contracts are actually about. The ask state has its
 * own tests, in the page's own file.
 */
const SEED: Record<string, Record<string, unknown>> = {
  "Rent vs buy": { ptype: "condo" },
};

function seed(name: string) {
  const s = SEED[name];
  if (!s) return;
  // MERGES rather than overwrites: several tests below set their own state first
  // (a jurisdiction, a cash position), and this only supplies the field that
  // decides whether the page answers at all.
  const cur = JSON.parse(window.localStorage.getItem("norma.inputs.v2") ?? "{}") as Record<string, unknown>;
  window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ ...cur, ...s }));
}

/** Rendered figures that are not numbers. `undefined` catches a missing message too. */
const GARBAGE = /NaN|Infinity|\bundefined\b|\[object Object\]/;

beforeEach(() => window.localStorage.clear());

describe("exactly one section opens on arrival", () => {
  // The marking IS being open. Every closed row looks alike, so the section whose
  // check produced the verdict was indistinguishable from the ones that decided
  // nothing — and it doubles as the invitation, since the reader meets the
  // disclosure gesture already performed once rather than guessing that a bare
  // "+" is worth pressing.
  //
  // Asserted as a contract across every page, not per page, because the failure
  // mode is a page forgetting to pass a deciding section at all — which looks
  // exactly like the old behaviour and would otherwise go unnoticed.
  for (const [name, Page] of PAGES) {
    it(name, () => {
      seed(name);
      renderWithIntl(
        <JurisdictionProvider>
          <Page />
        </JurisdictionProvider>,
      );
      expect(screen.getAllByRole("button", { expanded: true })).toHaveLength(1);
    });
  }

  it("offers to expand rather than to collapse, with one already open", () => {
    // Keyed off ALL sections, not any: an any-test made the bulk control read
    // "Collapse all" on first paint, offering to undo something nobody did.
    renderWithIntl(
      <JurisdictionProvider>
        <AffordabilityPage />
      </JurisdictionProvider>,
    );
    expect(screen.getByRole("button", { name: "Expand all" })).toBeInTheDocument();
  });
});

describe("no screen renders a non-finite figure", () => {
  for (const [name, Page] of PAGES) {
    it(`${name}, every section open`, async () => {
      const user = userEvent.setup();
      seed(name);
      renderWithIntl(
        <JurisdictionProvider>
          <Page />
        </JurisdictionProvider>,
      );
      for (const button of screen.getAllByRole("button", { expanded: false })) {
        await user.click(button);
      }
      expect(document.body.textContent).not.toMatch(GARBAGE);
    });
  }

  it("holds for every jurisdiction and property type, and no headline is a $0", async () => {
    // A jurisdiction record missing a field the engine reads is the other way
    // this surfaces, and it only shows on the jurisdiction that is missing it.
    //
    // PROPERTY TYPE is swept alongside it, and the pair carries a second
    // assertion, because the garbage regex was blind to the worst figure the app
    // can print: a well-formed **$0**. Nine jurisdiction × property-type
    // combinations have no published benchmark price — the three territories at
    // either type, and PEI, Halifax and Saskatoon condos — and `resolved.price`
    // is 0 in all nine. That zero is arithmetic, never an answer: it made
    // Amortization quote a $0 payment and Affordability call $0 "within reach",
    // with LESS explanation on screen than a priced city gets, and every test in
    // this file passed throughout. A page with no price must ASK for one; what
    // it must never do is print a headline figure of nothing.
    for (const jurisdiction of jurisdictions) {
      for (const ptype of ["house", "condo", "newbuild"] as const) {
        window.localStorage.setItem(
          "norma.inputs.v2",
          JSON.stringify({ jurId: jurisdiction.id, ptype }),
        );
        for (const [name, Page] of PAGES) {
          const { container } = renderWithIntl(
            <JurisdictionProvider>
              <Page />
            </JurisdictionProvider>,
          );
          const where = `${name} / ${jurisdiction.id} / ${ptype}`;
          expect(document.body.textContent, where).not.toMatch(GARBAGE);
          // Absent is fine and is what a page with no price to model renders;
          // present and zero is the failure. `$0.00` and `0 $` (fr) are the same
          // figure in other clothes, so the match is on the digits either side of
          // any currency mark rather than on one formatted string.
          const headline = container.querySelector('[data-slot="answer-figure"]');
          const digits = headline?.textContent?.replace(/[^\d.,]/g, "") ?? "";
          expect(digits, where).not.toMatch(/^0([.,]0+)?$/);
          // Stronger than "not zero", and it had to be. Closing Costs printed
          // $7,420 at `yt` — the fixed lawyer, inspection and moving fees, which
          // do not depend on a price — as "cash needed at closing" for a purchase
          // that has no price. A plausible wrong number sails past a check for a
          // zero, so where nothing is published the contract is that there is no
          // headline figure AT ALL: the page asks instead of answering.
          //
          // Stated as an ALLOWLIST of the pages whose headline is derived from
          // price, not as a list of exemptions. Two pages legitimately answer
          // without one and adding them as exceptions would have been indistinguishable
          // from weakening the test until it passed:
          //   Affordability — its headline is the ceiling the reader's INCOME
          //     supports; no benchmark stands behind it. What it must not do is
          //     compare that ceiling to a price it does not have, so it drops its
          //     verdict, both price-derived stats and all five sections.
          //   RRSP-HBP — `hbpPlay` takes no price argument at all; its headline is
          //     a withdrawal against the reader's own RRSP balance.
          // If a page is ever added here, the question to answer is whether its
          // headline can be computed without a price — not whether the test is
          // inconvenient.
          if (PRICE_DERIVED_HEADLINE.has(name) && benchmarkPrice(jurisdiction, ptype) === null) {
            expect(headline, `${where}: answered without a published price`).toBeNull();
          }
          cleanup();
        }
      }
    }
    // Two hundred and ninety-four full page renders — fourteen jurisdictions by
    // three property types by seven pages — and Scenarios renders two layouts of
    // its comparison, the table and the phone cards, on every one of them. The
    // matrix is the coverage: the defect this sweep now catches was invisible at
    // the default property type on thirteen of the fourteen records, and one
    // sweep asserting both facts is three times cheaper than two sweeps walking
    // the same matrix. The timeout is raised to match rather than the matrix cut.
  }, 90_000);

  it("holds when the reader has typed a zero into the price, not only when none is published", () => {
    // The sweep above only ever writes `{ jurId, ptype }`, so it tests the price the app
    // DERIVES and never the one the reader stores. That is a hole the width of the whole
    // contract: `price` is `{ kind: "number", nullable: true, min: 0 }` and NumberField
    // clamps to the minimum and commits, so a stored 0 is one keystroke away on every page
    // — and `priceKnown` used to be `stored.price !== null`, which called it a price. Every
    // defect the nine unpublished-benchmark combinations taught us about came back through
    // the front door, in Toronto, where nothing on screen suggests anything is missing.
    //
    // The contract is the same one, and deliberately not a special case for zero: where a
    // benchmark stands behind the field the zero falls through to it and the page answers
    // as it always did; where nothing is published there is nothing to fall through to and
    // the page must ask. What no page may do is print an answer built on nothing.
    for (const jurisdiction of jurisdictions) {
      window.localStorage.setItem(
        "norma.inputs.v2",
        JSON.stringify({ jurId: jurisdiction.id, ptype: "house", price: 0 }),
      );
      for (const [name, Page] of PAGES) {
        seed(name);
        const { container } = renderWithIntl(
          <JurisdictionProvider>
            <Page />
          </JurisdictionProvider>,
        );
        const where = `${name} / ${jurisdiction.id} / typed 0`;
        expect(document.body.textContent, where).not.toMatch(GARBAGE);
        const headline = container.querySelector('[data-slot="answer-figure"]');
        const digits = headline?.textContent?.replace(/[^\d.,]/g, "") ?? "";
        expect(digits, where).not.toMatch(/^0([.,]0+)?$/);
        if (PRICE_DERIVED_HEADLINE.has(name) && benchmarkPrice(jurisdiction, "house") === null) {
          expect(headline, `${where}: answered without a price`).toBeNull();
        }
        cleanup();
      }
    }
    // And the other half of the same fact, on the page that has the field: a priced city
    // keeps its answer rather than being told nobody publishes one there.
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "toronto", ptype: "house", price: 0 }),
    );
    const { container } = renderWithIntl(
      <JurisdictionProvider>
        <AmortizationPage />
      </JurisdictionProvider>,
    );
    expect(container.querySelector('[data-slot="answer-figure"]')).not.toBeNull();
    expect(document.body.textContent).not.toMatch(/Nobody publishes a benchmark price/);
  }, 60_000);
});

describe("cross-page links stay within their cap", () => {
  /**
   * DESIGN.md §5.2: at most two cross-page SENTENCES per page, and at most one
   * TRACE LABEL per panel.
   *
   * Counted on the RENDERED page, in each state, not by grepping the source. A
   * static count reads three sentences on Affordability and is wrong: the two
   * verdict links are mutually exclusive — the down-payment line renders only
   * when cash is short, the scenarios line only when it is not — so at most two
   * can ever be on screen. The cap is a property of what the reader sees.
   *
   * **The two shapes are capped separately, deliberately.** The two-per-page cap
   * exists to stop sentences piling up into a related-links block; a linked row
   * label cannot pile up into anything, because it is the label that was already
   * there and it adds no line to the panel. Counting them together would have
   * meant a page could buy a link on the words naming its figure only by giving
   * up a sentence that says something the reader cannot otherwise learn — a
   * trade with nothing to recommend it.
   *
   * The third assertion is what keeps the split from being a loophole: every
   * link to a tool route must declare which shape it is, so a bare <Link> to
   * another page is a failure rather than an uncounted link.
   */
  const TOOL_ROUTES = [
    "/affordability", "/closing-costs", "/down-payment",
    "/rrsp-hbp", "/amortization", "/rent-vs-buy", "/scenarios",
  ];

  function crossLinks(): HTMLElement[] {
    return screen
      .getAllByRole("link")
      // Provenance marks point at /sources and are per-figure, not cross-page.
      .filter((a) => TOOL_ROUTES.some((route) => (a.getAttribute("href") ?? "").startsWith(route)));
  }

  const shaped = (kind: string) =>
    crossLinks().filter((a) => a.getAttribute("data-cross") === kind);

  /**
   * Open every section, and only the sections.
   *
   * `getAllByRole("button", { expanded: false })` alone does NOT do that: the
   * *Expand all* pill carries `aria-expanded` too and sorts first in document
   * order, so clicking the list in order opened everything and then closed each
   * section again one by one — leaving exactly the panels that were open on
   * arrival. A cap counted on links that live inside panels was measuring a
   * screen the reader never sees. The section rows are the buttons with
   * `aria-controls`; the pill controls nothing in particular and has none.
   */
  async function openEverySection(user: ReturnType<typeof userEvent.setup>) {
    for (const button of screen.getAllByRole("button", { expanded: false })) {
      if (button.hasAttribute("aria-controls")) await user.click(button);
    }
  }

  const STATES: [string, Record<string, unknown>][] = [
    ["untouched", {}],
    ["short on cash", { price: 875000, income1: 142000, funds: 20000, save: 500 }],
    ["comfortably funded", { price: 300000, income1: 220000, funds: 400000, save: 4000 }],
    ["declined on income", { price: 900000, income1: 40000, funds: 400000 }],
  ];

  for (const [state, inputs] of STATES) {
    for (const [name, Page] of PAGES) {
      it(`${name}, ${state}`, async () => {
        window.localStorage.setItem("norma.inputs.v2", JSON.stringify(inputs));
        const user = userEvent.setup();
        seed(name);
        renderWithIntl(
          <JurisdictionProvider>
            <Page />
          </JurisdictionProvider>,
        );
        await openEverySection(user);
        expect(shaped("sentence").length, `${name} / ${state} sentences`).toBeLessThanOrEqual(2);
        expect(crossLinks(), `${name} / ${state} untagged cross-page link`).toHaveLength(
          shaped("sentence").length + shaped("trace").length,
        );
        // One per panel, not one per page: the rule is that a derivation never
        // turns into a list of exits, and a panel is the unit a reader reads.
        for (const panel of document.querySelectorAll('[id$="-panel"]')) {
          expect(
            panel.querySelectorAll('[data-cross="trace"]').length,
            `${name} / ${state} / ${panel.id} traces`,
          ).toBeLessThanOrEqual(1);
        }
      });
    }
  }

  it("finds both shapes on one page, so the caps cannot pass vacuously", async () => {
    // Down Payment carries one of each: the trace label on the closing-costs row
    // in `target`, and the RRSP-HBP sentence at the foot of `waterfall`. If
    // either count goes to zero the caps above are measuring nothing.
    const user = userEvent.setup();
    renderWithIntl(
      <JurisdictionProvider>
        <DownPaymentPage />
      </JurisdictionProvider>,
    );
    await openEverySection(user);
    expect(shaped("trace").length).toBe(1);
    expect(shaped("sentence").length).toBe(1);
  });

  it("lets a page carry both caps at once", async () => {
    // Affordability, short on cash, is the densest state the product has: two
    // sentences (the closing-costs trace in `cash`, the down-payment verdict
    // beneath it) plus the payment label in `comfort` — a panel that had no way
    // to answer its own biggest row until the label could carry the link, because
    // the page's two sentences were already spent elsewhere.
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ price: 875000, income1: 142000, funds: 20000, save: 500 }),
    );
    const user = userEvent.setup();
    renderWithIntl(
      <JurisdictionProvider>
        <AffordabilityPage />
      </JurisdictionProvider>,
    );
    await openEverySection(user);
    expect(shaped("sentence").length).toBe(2);
    expect(shaped("trace").map((a) => a.getAttribute("href"))).toEqual(["/amortization#payment"]);
  });
});

describe("horizontal scroll stays inside the element that owns it", () => {
  /**
   * Two classes must travel with every `overflow-x-auto`, and both were learned
   * from the same 320px bug on Scenarios, which no test could see because jsdom
   * applies no layout:
   *
   * - `min-w-0` — the container is a flex item, and `min-width: auto` is the flex
   *   default, so without it the box refuses to shrink below its 560px table and
   *   `overflow-x-auto` never engages. The PAGE scrolls sideways instead.
   * - `relative` — `sr-only` is `position: absolute`, and with no positioned
   *   ancestor those markers resolve against the document. At 320px that put the
   *   "best of the four" markers at x=568 and scrolled the page 248px, while
   *   every element measured under the viewport width. Making the scroller their
   *   containing block puts them where the overflow can clip them.
   *
   * Source-level because the symptom is invisible without a real layout engine,
   * and the cause is two class names that are easy to omit on the next table.
   */
  const sourceFiles = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name);
      if (entry.isDirectory()) return sourceFiles(path);
      if (!/\.tsx$/.test(entry.name) || /\.test\.tsx$/.test(entry.name)) return [];
      return [path];
    });

  it("gives every scroll container min-w-0 and relative", () => {
    const offenders: string[] = [];
    for (const path of sourceFiles("src")) {
      const source = readFileSync(path, "utf8");
      for (const match of source.matchAll(/className=\{?"([^"]*overflow-x-auto[^"]*)"/g)) {
        const classes = match[1];
        if (!classes.includes("min-w-0") || !classes.includes("relative")) {
          offenders.push(`${path}: "${classes}"`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("finds the containers at all, so the sweep cannot pass vacuously", () => {
    const found = sourceFiles("src").filter((path) =>
      readFileSync(path, "utf8").includes("overflow-x-auto"),
    );
    expect(found.length).toBeGreaterThanOrEqual(3);
  });

  /**
   * `hidden … sm:block` says "not on a phone", and on its own that is a hole in
   * the phone layout rather than a decision about it. Both places that use it
   * pair it with a `sm:hidden` sibling carrying the same content in a shape that
   * fits: SectionRow moves its line under the row, and CompareGrid swaps its
   * 560px table for a carousel of one card per scenario.
   *
   * Source-level, and per file rather than per pair, because the failure this
   * guards is deleting one half — the phone would then show nothing at all where
   * the other width shows a comparison, and jsdom applies no layout, so no
   * rendered test can see it.
   */
  const HIDES_BELOW_SM = /className=\{?"[^"]*\bhidden\b[^"]*\bsm:(?:block|flex|table|grid|inline)/;
  const SHOWS_BELOW_SM = /className=\{?"[^"]*\bsm:hidden\b/;

  it("replaces what a breakpoint hides, rather than only removing it", () => {
    const offenders = sourceFiles("src").filter((path) => {
      const source = readFileSync(path, "utf8");
      return HIDES_BELOW_SM.test(source) && !SHOWS_BELOW_SM.test(source);
    });
    expect(offenders).toEqual([]);
  });

  it("finds the swaps at all, so that sweep cannot pass vacuously either", () => {
    const found = sourceFiles("src").filter((path) =>
      HIDES_BELOW_SM.test(readFileSync(path, "utf8")),
    );
    expect(found.length).toBeGreaterThanOrEqual(2);
  });

  /**
   * The third shape of the same 320px bug, and the one with no scroll container
   * to hand the overflow to.
   *
   * `/sources` prints provenance `src` and `note` from `src/domain` VERBATIM —
   * publisher titles and verification notes written for a document, not for a
   * phone, carrying URL-shaped tokens up to 38 characters. They sit in a flex
   * row, whose items refuse to shrink below their longest word, so without
   * `break-words` the row sets the page's width and the BODY scrolls sideways.
   * There is no table here and no `overflow-x-auto` to catch it; the text simply
   * has to be allowed to break.
   *
   * Source-level for the same reason as the sweeps above: jsdom applies no
   * layout, so no rendered test can see it.
   */
  it("lets the verbatim source text /sources prints break inside a word", () => {
    const source = readFileSync("src/components/sources-content.tsx", "utf8");
    // Anchored on the `>` that ends the opening tag, so `key={note}` — an
    // attribute, not a rendered child — does not count as a third print.
    const verbatim = [...source.matchAll(/>\s*\{(?:entry\.src|note)\}/g)];
    // Two source-title branches (linked and plain) and the note paragraph.
    expect(verbatim.length, "the inventory stopped printing verbatim text").toBe(3);
    for (const match of verbatim) {
      const tag = source.slice(source.lastIndexOf("<", match.index), match.index);
      expect(tag, `verbatim text in ${tag.slice(0, 40)}…`).toContain("break-words");
    }
  });
});

/**
 * "Show me how you got that."
 *
 * Every page that COMPUTES an answer has to be able to show the arithmetic behind
 * it. Asserted across the registry rather than page by page, so a page added later
 * cannot quietly ship without one — the same reason the nav and pathnames pairs are
 * enforced in both directions.
 *
 * Affordability is absent from this list and present in spirit: it shipped the same
 * disclosure first, as `MathColumns` under its own `math` section, and the two are
 * the same promise under different labels. Home and Sources are absent because
 * neither computes anything — Sources IS the provenance inventory.
 */
describe("every page that computes an answer can show its work", () => {
  /**
   * Driven off the SECTION REGISTRY, not a hand-kept list of components.
   *
   * A hardcoded array would have meant a seventh computing page could be added to
   * `SECTION_REGISTRIES` and `NAV` and ship with no disclosure at all, while this
   * file stayed green and CLAUDE.md went on claiming otherwise. The allowlist below
   * is the same shape `PRICE_DERIVED_HEADLINE` uses: named positively, so adding a
   * namespace to it is a claim about that page rather than an exemption granted
   * quietly.
   */
  const NO_CALC_SECTION: Record<string, string> = {
    // Shipped the same disclosure first, under its own `math` section.
    Affordability: "MathColumns",
    // Computes nothing. `/sources` IS the provenance inventory.
    Sources: "nothing to derive",
  };

  const PAGE_BY_NAMESPACE: Record<string, (typeof PAGES)[number][1]> = {
    ClosingCosts: ClosingCostsPage,
    DownPayment: DownPaymentPage,
    RrspHbp: RrspHbpPage,
    Amortization: AmortizationPage,
    RentVsBuy: RentVsBuyPage,
    Scenarios: ScenariosPage,
  };

  const NAME_BY_NAMESPACE: Record<string, string> = {
    ClosingCosts: "Closing costs",
    DownPayment: "Down payment",
    RrspHbp: "RRSP-HBP",
    Amortization: "Amortization",
    RentVsBuy: "Rent vs buy",
    Scenarios: "Scenarios",
  };

  it("every registered page either has a calc section or is named as not needing one", () => {
    for (const { namespace, sections } of SECTION_REGISTRIES) {
      if (namespace in NO_CALC_SECTION) continue;
      expect(
        sections.map((entry) => entry.id),
        `${namespace} must offer a calc section, or be named in NO_CALC_SECTION`,
      ).toContain("calc");
      // And it must be reachable as a page, or the assertion above is vacuous.
      expect(PAGE_BY_NAMESPACE[namespace], `${namespace} has no page in this test`).toBeDefined();
    }
  });

  const COMPUTES = Object.entries(PAGE_BY_NAMESPACE).map(
    ([ns, Page]) => [NAME_BY_NAMESPACE[ns], Page] as const,
  );

  async function openCalc(user: ReturnType<typeof userEvent.setup>) {
    const button = screen.getByRole("button", { name: /How this was calculated/ });
    if (button.getAttribute("aria-expanded") === "false") await user.click(button);
    return within(document.getElementById("calc")!);
  }

  for (const [name, Page] of COMPUTES) {
    it(`${name} offers the calculation`, async () => {
      const user = userEvent.setup();
      seed(name);
      renderWithIntl(
        <JurisdictionProvider>
          <Page />
        </JurisdictionProvider>,
      );
      const body = await openCalc(user);
      // A derivation, a ledger, or both -- which of the two is a per-page judgement
      // (Amortization's schedule already IS the ledger), but SOMETHING has to be
      // there, and it has to carry figures rather than empty rows.
      expect(body.getAllByText(/\$[\d,]+/).length).toBeGreaterThan(0);
    });
  }

  it("does not open the calculation on arrival, on any of them", async () => {
    // It is the deepest disclosure on the page, and a reader who wanted the answer
    // should not have to scroll past the working to reach it.
    for (const [name, Page] of COMPUTES) {
      seed(name);
      const { unmount } = renderWithIntl(
        <JurisdictionProvider>
          <Page />
        </JurisdictionProvider>,
      );
      expect(
        screen.getByRole("button", { name: /How this was calculated/ }),
        name,
      ).toHaveAttribute("aria-expanded", "false");
      unmount();
    }
  });

  /**
   * THE assertion this feature turns on.
   *
   * A trace that does its own arithmetic can agree with itself while disagreeing
   * with the answer it claims to explain, and that is the one failure the feature
   * cannot have. Three real defects shipped past 1538 green tests because nothing
   * compared a derived figure to the headline above it: Scenarios rendered GDS at
   * 100x the value in its own panel, Down Payment printed `x - x = y`, and Closing
   * Costs derived a closing bill for a home with no published price.
   */
  it("the last line of a trace is the figure the page leads with", async () => {
    // The pages whose trace TERMINATES in the hero. Amortization's does not and says
    // so -- its hero is the payment after renewal, its trace builds the first
    // payment -- and Scenarios has a ledger rather than a trace.
    const TERMINAL = ["Closing costs", "Down payment", "Rent vs buy"] as const;
    for (const name of TERMINAL) {
      const Page = COMPUTES.find(([n]) => n === name)![1];
      seed(name);
      const user = userEvent.setup();
      const { container, unmount } = renderWithIntl(
        <JurisdictionProvider>
          <Page />
        </JurisdictionProvider>,
      );
      const body = await openCalc(user);
      const hero = container.querySelector('[data-slot="answer-figure"]')?.textContent?.trim();
      expect(hero, `${name} renders no hero`).toBeTruthy();
      const terminal = [...document.getElementById("calc")!.querySelectorAll("dd")]
        .map((dd) => dd.textContent?.trim())
        .filter(Boolean);
      expect(terminal, `${name}: hero ${hero} appears nowhere in its own derivation`).toContain(hero);
      unmount();
    }
  });

  /**
   * The same contract, at a Houston seed rather than the Canadian default.
   *
   * TERMINAL widens to include Amortization here, deliberately, rather than reusing the CA
   * list above: on a `toMaturity` mortgage `paymentAfterRenewal` IS `firstPayment`
   * (`amortizationToMaturity`'s own doc comment — there is no term to renew, so the two never
   * diverge), so the US hero terminates its own trace exactly where the CA one cannot. And the
   * renewal step this trace conditionally adds (`resolved.renewalRate !== null && firstRenewal
   * !== null`) must never appear at all: `firstRenewal` reads `rows.find(r => r.renewed)`, and
   * `row.renewed` is never true on a toMaturity schedule.
   */
  it("holds at a Houston seed too, including Amortization", async () => {
    const TERMINAL_US = ["Closing costs", "Down payment", "Rent vs buy", "Amortization"] as const;
    for (const name of TERMINAL_US) {
      const Page = COMPUTES.find(([n]) => n === name)![1];
      window.localStorage.setItem(
        "norma.inputs.v2",
        JSON.stringify({ jurId: "houston", ...(name === "Rent vs buy" ? { ptype: "condo" } : {}) }),
      );
      const user = userEvent.setup();
      const { container, unmount } = renderWithIntl(
        <JurisdictionProvider>
          <Page />
        </JurisdictionProvider>,
        { locale: "en-US" },
      );
      const hero = container.querySelector('[data-slot="answer-figure"]')?.textContent?.trim();
      expect(hero, `${name} renders no hero at a Houston seed`).toBeTruthy();
      const body = await openCalc(user);
      const calc = document.getElementById("calc")!;
      const terminal = [...calc.querySelectorAll("dd")].map((dd) => dd.textContent?.trim()).filter(Boolean);
      expect(terminal, `${name}: hero ${hero} appears nowhere in its own Houston-seeded derivation`).toContain(
        hero,
      );
      if (name === "Amortization") {
        expect(body.queryByText(/renewal/i), "Amortization's US trace names a renewal step").toBeNull();
      }
      unmount();
    }
  });

  it("derives nothing where no price is published", async () => {
    // The defect this file already documents one level up, at the headline: a page
    // with no price must ASK, and a derivation is a headline in slower motion.
    // `yt` publishes no benchmark at any property type.
    //
    // Scoped to the PRICE-DERIVED pages, reusing the set declared at the top of this
    // file. RRSP-HBP is deliberately outside it — its refund is built from income and
    // a contribution, with no price term, so it answers at `yt` for the same reason
    // its headline does.
    for (const [name, Page] of COMPUTES.filter(([n]) => PRICE_DERIVED_HEADLINE.has(n))) {
      window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "yt" }));
      const { container, unmount } = renderWithIntl(
        <JurisdictionProvider>
          <Page />
        </JurisdictionProvider>,
      );
      const calc = document.getElementById("calc");
      if (calc) {
        expect(
          calc.textContent ?? "",
          `${name} derives a figure for a home with no published price`,
        ).not.toMatch(/\$[\d,]*[1-9][\d,]*/);
      }
      expect(container.textContent).toBeTruthy();
      unmount();
    }
  });
});

/**
 * The vocabulary contract for the US market seam: a Houston-seeded page must never leak the
 * Canadian terms it replaced, and a Winnipeg-seeded page must never leak the US terms that
 * replaced them there. One `it.each` per direction, not eight copies of the same assertion —
 * see CLAUDE.md's own framing of this as "one it.each over the pages, not eight copies".
 *
 * RRSP-HBP is excluded from the Houston direction only: it is Canada-only
 * (`ROUTE_COUNTRIES["/rrsp-hbp"] = ["ca"]`), and `rules.hbp` does not exist on `UsRules` — a
 * real request never reaches this page for a US locale (`assertRouteAvailable` 404s it in the
 * route's layout before `page.tsx` mounts), so rendering it directly here the way this test
 * mounts every other page would throw for a reason that has nothing to do with vocabulary.
 *
 * `pickJurisdiction` (`use-jurisdiction.tsx`) only honours a stored `jurId` when it belongs to
 * the CURRENT country — derived from the render locale, not from the stored id — so seeding
 * Houston without also rendering at a US locale would silently fall back to the Canadian
 * default and test nothing.
 */
describe("US vocabulary contract", () => {
  const HOUSTON_PAGES = PAGES.filter(([name]) => name !== "RRSP-HBP");

  // Home is not in PAGES: it is a server component (`page.tsx` calls next-intl/server's
  // `getTranslations`, unmocked here) wrapping the client `HomeContent`, which is what
  // actually renders the copy this contract checks — see `home-content.tsx`'s own doc
  // comment on why `country` is a plain prop rather than `useCountry()`. Rendered
  // directly, at both countries, as its own pair of entries rather than folded into
  // `PAGES` (whose shape — a bare `<Page />`, seeded through localStorage — Home does
  // not use: it takes its country as a prop, not from a stored jurisdiction).
  function HoustonHome() {
    return <HomeContent country="us" />;
  }
  function WinnipegHome() {
    return <HomeContent country="ca" />;
  }

  // Every term below is checked as a literal substring, case-sensitively: these are real
  // English words this app's own copy uses (not a pattern that merely resembles one), the
  // same discipline `locale-render.test.tsx`'s own leaked-key check applies to message keys.
  // "Canad" (not "Canada"/"Canadian" separately) catches both spellings in one entry;
  // "province"/"provincial" are kept as two entries because neither is a substring of the
  // other. The country switcher's own labels ("Canada"/"United States", `Countries.ca`/
  // `Countries.us`) legitimately appear on every page regardless of which country is
  // seeded, so they are stripped out of the rendered text before scanning rather than
  // exempted term-by-term, which would have to be re-derived every time a label changed.
  const CA_ONLY_VOCAB = [
    "CMHC",
    "GDS",
    "TDS",
    "land transfer",
    "FHSA",
    "HBP",
    "TFSA",
    "renewal",
    "Canad",
    "province",
    "provincial",
    "strata",
    "stress",
  ];
  const US_ONLY_VOCAB = ["PMI", "DTI", "homestead", "Texas", "HOA"];

  /** `Countries.ca`/`Countries.us` — see the CA_ONLY_VOCAB comment above. */
  const COUNTRY_SWITCHER_LABELS = ["Canada", "United States"];

  /**
   * Home's FAQ deliberately asks and answers a handful of comparison questions BY
   * NAME — "Does the US have a mortgage stress test like Canada's?" (`Home.faqQ_
   * stressTest_us`/`faqA_stressTest_us`, `faqA_eligibility_us`'s "a different
   * question from the one Canada's federal Act raises") — the exact pattern CLAUDE.md
   * documents for `homeFaqKey`'s selective fork: real search-driven questions a US
   * reader arrives with, answered by naming the Canadian concept they are asking
   * about. That is not a vocabulary leak; it is the fork working. Every OTHER page
   * and Home's own non-FAQ copy still gets the full check — this exemption is scoped
   * to Home alone, for exactly the two words its reviewed FAQ pair needs.
   */
  const HOME_FAQ_CONTRAST_EXEMPT = ["Canad", "stress"];

  async function expandAll() {
    const user = userEvent.setup();
    for (const button of screen.queryAllByRole("button", { expanded: false })) {
      await user.click(button);
    }
    let text = document.body.textContent ?? "";
    for (const label of COUNTRY_SWITCHER_LABELS) {
      text = text.split(label).join(" ");
    }
    return text;
  }

  it.each([...HOUSTON_PAGES, ["Home", HoustonHome] as const])(
    "%s: US wording, no Canadian vocabulary, under a Houston seed",
    async (name, Page) => {
      window.localStorage.setItem(
        "norma.inputs.v2",
        JSON.stringify({ jurId: "houston", ...SEED[name] }),
      );
      renderWithIntl(
        <JurisdictionProvider>
          <Page />
        </JurisdictionProvider>,
        { locale: "en-US" },
      );
      const text = await expandAll();
      for (const word of CA_ONLY_VOCAB) {
        if (name === "Home" && HOME_FAQ_CONTRAST_EXEMPT.includes(word)) continue;
        expect(text, `${name}: "${word}" leaked into a Houston-seeded, en-US render`).not.toContain(word);
      }
    },
  );

  it.each([...PAGES, ["Home", WinnipegHome] as const])(
    "%s: Canadian wording, no US vocabulary, under a Winnipeg seed",
    async (name, Page) => {
      window.localStorage.setItem(
        "norma.inputs.v2",
        JSON.stringify({ jurId: "winnipeg", ...SEED[name] }),
      );
      renderWithIntl(
        <JurisdictionProvider>
          <Page />
        </JurisdictionProvider>,
      );
      const text = await expandAll();
      for (const word of US_ONLY_VOCAB) {
        expect(text, `${name}: "${word}" leaked into a Winnipeg-seeded render`).not.toContain(word);
      }
    },
  );
});
