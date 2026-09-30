import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import type { ComponentType } from "react";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { STORE_KEY_V2 } from "@/lib/storage";
import AffordabilityPage from "./[locale]/affordability/page";
import ClosingCostsPage from "./[locale]/closing-costs/page";
import DownPaymentPage from "./[locale]/down-payment/page";
import ScenariosPage from "./[locale]/scenarios/page";
import RentVsBuyPage from "./[locale]/rent-vs-buy/page";
import AmortizationPage from "./[locale]/amortization/page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

/**
 * The school-division picker is a control whose whole purpose is to reach a figure, so the
 * assertion that it is REACHED belongs on the pages (CLAUDE.md: the residency switch was built
 * and tested and bound by no page). Every page that prices property tax binds it; Amortization,
 * which prices none, must not.
 */
const PRICES_PROPERTY_TAX: [string, ComponentType][] = [
  ["Affordability", AffordabilityPage],
  ["Closing costs", ClosingCostsPage],
  ["Down payment", DownPaymentPage],
  ["Scenarios", ScenariosPage],
  ["Rent vs buy", RentVsBuyPage],
];

const render = (Page: ComponentType) =>
  renderWithIntl(
    <JurisdictionProvider>
      <Page />
    </JurisdictionProvider>,
  );

beforeEach(() => window.localStorage.clear());

describe("Winnipeg's school division reaches every page that prices property tax", () => {
  it.each(PRICES_PROPERTY_TAX)("%s offers it in Winnipeg", async (_name, Page) => {
    render(Page);
    expect(await screen.findByRole("combobox", { name: "School division" })).toBeInTheDocument();
  });

  it.each(PRICES_PROPERTY_TAX)("%s does not offer it in Toronto", async (_name, Page) => {
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ jurId: "toronto" }));
    render(Page);
    await screen.findAllByRole("radiogroup");
    expect(screen.queryByRole("combobox", { name: "School division" })).not.toBeInTheDocument();
  });

  it("is absent from Amortization, which prices no property tax", async () => {
    render(AmortizationPage);
    await screen.findAllByRole("radiogroup");
    expect(screen.queryByRole("combobox", { name: "School division" })).not.toBeInTheDocument();
  });

  it("moves Affordability's answer: a cheaper division carries a dearer home", async () => {
    const hero = async () => {
      const figure = document.querySelector('[data-slot="answer-figure"]');
      return figure?.textContent ?? "";
    };
    render(AffordabilityPage);
    await screen.findByRole("combobox", { name: "School division" });
    const winnipegSd = await hero();
    cleanup();

    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ taxArea: "pembina-trails" }));
    render(AffordabilityPage);
    expect(await screen.findByRole("combobox", { name: "School division" })).toHaveTextContent(
      "Pembina Trails",
    );
    const pembina = await hero();
    const dollars = (s: string) => Number(s.replace(/[^\d]/g, ""));
    expect(dollars(pembina)).toBeGreaterThan(dollars(winnipegSd));
  });
});
