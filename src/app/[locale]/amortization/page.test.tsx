import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import AmortizationPage from "./page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: "en" | "fr" = "en") =>
  renderWithIntl(
    <JurisdictionProvider>
      <AmortizationPage />
    </JurisdictionProvider>,
    { locale },
  );

async function open(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole("button", { name }));
}

beforeEach(() => window.localStorage.clear());

describe("Amortization — renewal is the subject", () => {
  it("opens on no change, and says that is not the scenario to plan for", () => {
    // Defaulting to a shock would be inventing a rate forecast. Defaulting to no
    // shock and saying so is the honest starting position.
    renderPage();
    expect(screen.getAllByText(/your payment never changes/).length).toBeGreaterThan(0);
    expect(screen.getByText(/that is the risk nobody models/)).toBeInTheDocument();
  });

  it("turns a renewal rate into a payment shock", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Renewal/);
    await user.click(screen.getByRole("button", { name: "Four points up" }));
    expect(screen.getAllByText(/your payment rises by/).length).toBeGreaterThan(0);
  });

  it("shows a falling payment as a relief but warns against budgeting on it", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Renewal/);
    const field = screen.getByLabelText("Rate you renew into");
    await user.clear(field);
    await user.type(field, "1");
    await user.tab();
    expect(screen.getAllByText(/your payment falls by/).length).toBeGreaterThan(0);
    expect(screen.getByText(/rates rising is not/)).toBeInTheDocument();
  });

  it("prices extra interest against renewing at today's rate, not against nothing", async () => {
    // Without the baseline the figure has no referent and means nothing.
    const user = userEvent.setup();
    renderPage();
    await open(user, /Renewal/);
    expect(
      screen.getAllByText("Extra interest versus renewing at today’s rate").length,
    ).toBeGreaterThan(0);
  });
});

describe("Amortization — the schedule", () => {
  it("renders a year row for every year of the loan", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Year by year/);
    const table = screen.getByRole("table");
    // 30-year default amortization plus the header row.
    expect(table.querySelectorAll("tbody tr").length).toBe(30);
  });

  it("marks the renewal years in the table", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Year by year/);
    expect(screen.getAllByText("Renewal").length).toBeGreaterThan(0);
  });

  it("states the crossover year in text, not only in the chart", async () => {
    // The shape is the argument, and someone who cannot see it still gets the fact.
    const user = userEvent.setup();
    renderPage();
    await open(user, /Year by year/);
    expect(screen.getAllByText(/Principal overtakes interest/).length).toBeGreaterThan(0);
  });
});

describe("Amortization — the row line is not the row's name", () => {
  it("says where the schedule ends instead of repeating 'Year by year'", () => {
    // `tableTitle` and this section's name are the same three words, so the row
    // printed them twice and told the reader nothing between them.
    renderPage();
    const row = screen.getByRole("button", { name: /Year by year/ });
    expect(row.textContent).toMatch(/Paid off in year \d+/);
    expect(row.textContent?.match(/Year by year/g)).toHaveLength(1);
  });

  it("names both parts of the cost of borrowing, which is what its figure is", () => {
    // The figure is interest PLUS the insurance premium, and the line called it
    // "Total interest over the loan" — labelling it as something it is not. At
    // the default 10% down the mortgage is insured, so there are two parts.
    renderPage();
    const row = screen.getByRole("button", { name: /What it costs to borrow/ });
    expect(row.textContent).toMatch(/Total interest over the loan \$[\d,]+/);
    expect(row.textContent).toMatch(/Insurance premium added to the loan \$[\d,]+/);
  });
});

describe("Amortization — French", () => {
  it("renders in French without leaking a message key, in every section", async () => {
    // Expanded first, deliberately. A missing ICU parameter makes next-intl
    // render the raw key, and a collapsed page hides every section where that
    // can happen -- which is exactly where Amortization.altText was hiding.
    const user = userEvent.setup();
    renderPage("fr");
    await user.click(screen.getByRole("button", { name: "Tout ouvrir" }));
    expect(document.body.textContent).not.toMatch(/Amortization\./);
    expect(screen.getAllByText(/Amortissement et renouvellement/).length).toBeGreaterThan(0);
  });
});
