import { beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { jurisdictions } from "@/domain/jurisdictions";

import AffordabilityPage from "./[locale]/affordability/page";
import ClosingCostsPage from "./[locale]/closing-costs/page";
import DownPaymentPage from "./[locale]/down-payment/page";
import RrspHbpPage from "./[locale]/rrsp-hbp/page";
import AmortizationPage from "./[locale]/amortization/page";
import RentVsBuyPage from "./[locale]/rent-vs-buy/page";
import ScenariosPage from "./[locale]/scenarios/page";

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

  it("holds for every jurisdiction, on the pages whose figures are provincial", async () => {
    // A jurisdiction record missing a field the engine reads is the other way
    // this surfaces, and it only shows on the jurisdiction that is missing it.
    for (const jurisdiction of jurisdictions) {
      window.localStorage.setItem(
        "norma.inputs.v2",
        JSON.stringify({ jurId: jurisdiction.id }),
      );
      for (const [name, Page] of PAGES) {
        renderWithIntl(
          <JurisdictionProvider>
            <Page />
          </JurisdictionProvider>,
        );
        expect(document.body.textContent, `${name} / ${jurisdiction.id}`).not.toMatch(GARBAGE);
        cleanup();
      }
    }
    // Ninety-eight full page renders, and Scenarios now renders two layouts of
    // its comparison — the table and the phone cards — on every one of them.
    // That took the sweep from 4.0s to 5.4s against a 5s default and made it a
    // timeout rather than an assertion. Raised deliberately: shrinking the
    // matrix would cost the coverage the test exists for.
  }, 30_000);
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
