import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import ClosingCostsPage from "./page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: "en" | "fr" = "en") =>
  renderWithIntl(
    <JurisdictionProvider>
      <ClosingCostsPage />
    </JurisdictionProvider>,
    { locale },
  );

/** Open a section by its heading button and return its panel. */
async function openSection(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  const button = screen.getByRole("button", { name });
  await user.click(button);
  return button;
}

beforeEach(() => window.localStorage.clear());

describe("Closing costs — the answer comes first", () => {
  it("leads with cash needed on closing day, before anyone types", () => {
    renderPage();
    expect(screen.getByText("Cash needed on closing day")).toBeInTheDocument();
    expect(screen.getAllByText(/^\$[\d,]+$/).length).toBeGreaterThan(0);
  });

  it("says the bill is separate from the down payment", () => {
    // The single most common misunderstanding this page exists to correct.
    renderPage();
    expect(
      screen.getByText("Separate from the down payment, and due the same day."),
    ).toBeInTheDocument();
  });

  it("renders every section of the bill", () => {
    renderPage();
    for (const name of [
      /Taxes and government fees/,
      /Professional and third-party fees/,
      /Adjustments and moving in/,
      /Credits back/,
      /Do you have the cash\?/,
    ]) {
      expect(screen.getByRole("button", { name })).toBeInTheDocument();
    }
  });

  it("opens and closes every section with one control", async () => {
    const user = userEvent.setup();
    renderPage();
    const expandAll = screen.getByRole("button", { name: "Expand all" });
    await user.click(expandAll);
    expect(screen.getByRole("button", { name: "Collapse all" })).toBeInTheDocument();
    expect(screen.getAllByText("Subtotal").length).toBeGreaterThan(0);
  });
});

describe("Closing costs — the jurisdiction drives the bill", () => {
  it("shows a line item that exists here and not one that does not", async () => {
    // Toronto stacks a municipal land transfer tax on the provincial one. The
    // point of the engine is that the row appears because the jurisdiction
    // record has it, not because a component knows about Toronto.
    const user = userEvent.setup();
    renderPage();
    await openSection(user, /Taxes and government fees/);
    expect(screen.getAllByText(/land transfer tax/i).length).toBeGreaterThan(0);
  });

  it("never renders a zero row for a fee that does not apply here", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    // A "$0" line would assert the fee exists and happens to be nil, which is a
    // different and usually false claim than the fee not existing.
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
  });

  it("shows the bracket breakdown on demand, not by default", async () => {
    const user = userEvent.setup();
    renderPage();
    await openSection(user, /Taxes and government fees/);
    expect(screen.queryByText(/on the first/)).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Bracket breakdown" })[0]);
    expect(screen.getAllByText(/on the first/).length).toBeGreaterThan(0);
  });
});

describe("Closing costs — credits, and when they arrive", () => {
  it("separates closing-day credits from ones that arrive at tax time", async () => {
    const user = userEvent.setup();
    renderPage();
    await openSection(user, /Credits back/);
    expect(screen.getByText("Applied on closing day")).toBeInTheDocument();
  });

  it("warns that a tax-time credit is not closing-day money", async () => {
    // Unconditional. The previous version was `if (later) expect(later)...`,
    // which passes whether the warning renders or not. The default jurisdiction
    // has a tax-time credit for a first-time buyer, so this is deterministic.
    const user = userEvent.setup();
    renderPage();
    await openSection(user, /Credits back/);
    expect(screen.getByText("Arrives later, at tax time")).toBeInTheDocument();
    expect(
      screen.getByText(/do not budget it as closing-day money/),
    ).toBeInTheDocument();
  });
});

describe("Closing costs — the cash check", () => {
  it("asks for funds rather than assuming a balance", () => {
    renderPage();
    expect(screen.getByLabelText("Funds available for this purchase")).toBeInTheDocument();
  });

  it("turns the unanswered check into a verdict once funds are given", async () => {
    const user = userEvent.setup();
    renderPage();
    const section = screen.getByRole("button", { name: /Do you have the cash\?/ });
    expect(
      within(section).queryByText(/Enough|Short/),
    ).not.toBeInTheDocument();

    const funds = screen.getByLabelText("Funds available for this purchase");
    await user.clear(funds);
    await user.type(funds, "500000");
    await user.tab();

    expect(
      within(screen.getByRole("button", { name: /Do you have the cash\?/ })).getByText(/Enough/),
    ).toBeInTheDocument();
  });
});

describe("Closing costs — French", () => {
  it("renders the page in French without leaking a message key", () => {
    renderPage("fr");
    expect(screen.getByText("Comptant requis le jour de la clôture")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/ClosingCosts\./);
  });
});
