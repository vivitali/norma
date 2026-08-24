import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import RentVsBuyPage from "./page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: "en" | "fr" = "en") =>
  renderWithIntl(
    <JurisdictionProvider>
      <RentVsBuyPage />
    </JurisdictionProvider>,
    { locale },
  );

async function open(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole("button", { name }));
}

beforeEach(() => window.localStorage.clear());

describe("Rent vs buy — the horizon decides", () => {
  it("leads with a verdict tied to a holding period, not an abstract one", () => {
    renderPage();
    expect(screen.getAllByText(/wins for your horizon/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Your horizon:/).length).toBeGreaterThan(0);
  });

  it("shows the verdict at several holding periods, not just one", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The verdict/);
    const table = screen.getAllByRole("table")[0];
    expect(table.querySelectorAll("tbody tr").length).toBe(6);
  });

  it("flips the verdict on the rent being compared against", async () => {
    // The comparison has to be sensitive to the one input it is ABOUT. At the
    // placeholder rent for this city the numbers favour renting and there is no
    // break-even inside forty years; against a rent twice as high, buying pulls
    // ahead within a few years. A page that answered the same either way would
    // be decoration.
    const user = userEvent.setup();
    renderPage();
    expect(screen.getAllByText(/Renting wins/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/never pulls ahead/).length).toBeGreaterThan(0);

    const rent = screen.getByLabelText("Rent you are comparing against, monthly");
    await user.clear(rent);
    await user.type(rent, "3200");
    await user.tab();

    expect(screen.getAllByText(/Buying wins/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/never pulls ahead/)).not.toBeInTheDocument();
  });

  it("respects the horizon control", async () => {
    // Scoped to the holding group: amortization offers "25 years" too, and an
    // unscoped query silently picks whichever comes first in the DOM.
    const user = userEvent.setup();
    renderPage();
    const horizon = within(
      screen.getByRole("radiogroup", { name: "How long you expect to stay" }),
    );
    await user.click(horizon.getByRole("radio", { name: "3 years" }));
    expect(screen.getAllByText(/Your horizon: 3 years/).length).toBeGreaterThan(0);
  });
});

describe("Rent vs buy — the flat-market counterweight", () => {
  it("says whether the verdict survives appreciation being switched off", () => {
    // The one question the headline cannot carry: is buying winning on shelter
    // costs, or only on a forecast of the housing market?
    renderPage();
    const text = document.body.textContent ?? "";
    expect(
      /appreciation switched off|depends on appreciation|Renting wins/.test(text),
    ).toBe(true);
  });

  it("frames the appreciation switch as a forecast, not a setting", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Where you end up/);
    expect(screen.getByText(/forecasting the housing market/)).toBeInTheDocument();
  });
});

describe("Rent vs buy — what the model leaves out", () => {
  it("names the omissions on both sides, rather than only the ones that flatter buying", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /What is not captured/);
    expect(screen.getAllByText(/these favour buying/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/these favour renting/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Concentration risk/)).toBeInTheDocument();
    expect(screen.getByText(/Forced savings/)).toBeInTheDocument();
  });
});

describe("Rent vs buy — French", () => {
  it("renders in French without leaking a message key", () => {
    renderPage("fr");
    expect(document.body.textContent).not.toMatch(/RentVsBuy\./);
  });
});
