import { beforeEach, describe, expect, it, vi } from "vitest";
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
  });
});
