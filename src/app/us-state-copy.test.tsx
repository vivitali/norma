import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { jurisdictionsOf } from "@/domain/jurisdictions";
import { regionOf } from "@/domain/types";
import { ROUTE_COUNTRIES } from "@/lib/routes";

import AffordabilityPage from "./[locale]/affordability/page";
import ClosingCostsPage from "./[locale]/closing-costs/page";
import DownPaymentPage from "./[locale]/down-payment/page";
import AmortizationPage from "./[locale]/amortization/page";
import RentVsBuyPage from "./[locale]/rent-vs-buy/page";
import ScenariosPage from "./[locale]/scenarios/page";
import { SourcesContent } from "@/components/sources-content";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

/**
 * One state's copy must never appear on another state's pages.
 *
 * The US-vocabulary contract in `page-contracts.test.tsx` guards Canada against the US. It cannot
 * see WITHIN the US: `_us` keys were written when Houston was the only market, so Texas words
 * ("Texas", "Harris County") shipped on Seattle's pages the day Washington arrived. This renders
 * every US-available tool page for every US jurisdiction (derived from the registry, so a new
 * metro is covered unaided) and checks each page's text against the OTHER states' place names.
 *
 * Home is deliberately out of scope: it is country-level and names Texas as its worked examples,
 * and says so. Sources prints each record's provenance notes verbatim as an audit trail (marked
 * `data-source-note`) — those are scrubbed, as `page-contracts.test.tsx` does.
 */
const PAGES = [
  ["/affordability", "Affordability", AffordabilityPage],
  ["/closing-costs", "Closing costs", ClosingCostsPage],
  ["/down-payment", "Down payment", DownPaymentPage],
  ["/amortization", "Amortization", AmortizationPage],
  ["/rent-vs-buy", "Rent vs buy", RentVsBuyPage],
  ["/scenarios", "Scenarios", ScenariosPage],
  ["/sources", "Sources", SourcesContent],
] as const;

/** Words that name a state or county. Keyed by the state code a record carries as `prov`. */
const STATE_WORDS: Record<string, string[]> = {
  TX: ["Texas", "Harris County", "Travis County", "HISD"],
  WA: ["Washington", "King County"],
};

const SEED: Record<string, Record<string, unknown>> = {
  "Rent vs buy": { ptype: "condo" },
  "Closing costs": { ptype: "newbuild" },
};

beforeEach(() => window.localStorage.clear());

describe("US pages speak only of their own state", () => {
  const usPages = PAGES.filter(([route]) => ROUTE_COUNTRIES[route].includes("us"));

  for (const jur of jurisdictionsOf("us")) {
    const state = regionOf(jur);
    const foreign = Object.entries(STATE_WORDS)
      .filter(([code]) => code !== state)
      .flatMap(([, words]) => words);

    it(`knows which state ${jur.id} is in`, () => {
      // A new state needs its words listed here, or its neighbours' leaks go unchecked.
      expect(Object.keys(STATE_WORDS), `${jur.id} (${state})`).toContain(state);
    });

    it.each(usPages)(`%s: no other state's words under a ${jur.id} seed`, async (_route, name, Page) => {
      window.localStorage.setItem(
        "norma.inputs.v2",
        JSON.stringify({ jurId: jur.id, ...SEED[name] }),
      );
      renderWithIntl(
        <JurisdictionProvider>
          <Page />
        </JurisdictionProvider>,
        { locale: "en-US" },
      );
      const user = userEvent.setup();
      for (const button of screen.queryAllByRole("button", { expanded: false })) {
        await user.click(button);
      }
      let text = document.body.textContent ?? "";
      for (const note of document.querySelectorAll("[data-source-note]")) {
        const content = note.textContent;
        if (content) text = text.split(content).join(" ");
      }
      for (const word of foreign) {
        expect(text, `${name} @ ${jur.id}: "${word}" belongs to another state`).not.toContain(word);
      }
    });
  }
});
