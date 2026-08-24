import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import DownPaymentPage from "./page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: "en" | "fr" = "en") =>
  renderWithIntl(
    <JurisdictionProvider>
      <DownPaymentPage />
    </JurisdictionProvider>,
    { locale },
  );

async function open(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole("button", { name }));
}

beforeEach(() => window.localStorage.clear());

describe("Down payment — the target", () => {
  it("targets net cash at closing, not the down payment alone", () => {
    // Assembling only the down payment is the mistake this page exists to
    // prevent: closing costs are due the same day.
    renderPage();
    // getAllByText: SectionRow prints its line twice, once for wide screens and
    // once beneath the name on phone, where there is no room beside it.
    expect(screen.getAllByText("Needed on closing day").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Closing costs").length).toBeGreaterThan(0);
  });

  it("shows the legal minimum as a rule, not an opinion", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Assembled from your accounts/);
    expect(screen.getByText("Legal minimum down payment")).toBeInTheDocument();
  });
});

describe("Down payment — the waterfall", () => {
  it("asks for the balances rather than reporting a shortfall nobody described", () => {
    // On a first visit every account is unknown. Reporting 'you are short the
    // entire down payment' would be arithmetically true and useless.
    renderPage();
    expect(
      screen.getByText(/Add what you have in each account/),
    ).toBeInTheDocument();
  });

  it("lists the sources in the fixed cost order", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The funding order/);
    const text = document.body.textContent ?? "";
    const order = ["FHSA", "Cash and savings", "Home Buyers’ Plan", "TFSA", "Gift", "Non-registered"];
    const positions = order.map((label) => text.indexOf(label));
    expect(positions.every((p) => p >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("draws the free money first once balances are given", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The funding order/);

    const fhsa = screen.getByLabelText("FHSA");
    await user.clear(fhsa);
    await user.type(fhsa, "40000");
    await user.tab();

    // The TFSA is still untouched: the order is by cost, not by balance.
    expect(screen.getAllByText("Not needed").length).toBeGreaterThan(0);
  });

  it("says what a source costs beyond the money", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The funding order/);
    expect(screen.getByText(/must repay it over 15 years/)).toBeInTheDocument();
    expect(screen.getByText(/contribution room comes back/)).toBeInTheDocument();
  });
});

describe("Down payment — the glide path", () => {
  it("refuses to name a month the saving rate cannot reach", async () => {
    // The honest answer. A number here would be a promise the rate cannot keep.
    const user = userEvent.setup();
    renderPage();
    await open(user, /The savings glide path/);
    expect(screen.getAllByText(/Not reached within 36 months/).length).toBeGreaterThan(0);
  });

  it("asks for a saving rate instead of assuming one", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The savings glide path/);
    expect(screen.getByText(/Add a monthly saving rate/)).toBeInTheDocument();
  });
});

describe("Down payment — French", () => {
  it("renders in French without leaking a message key", () => {
    renderPage("fr");
    expect(screen.getByText("Sources de la mise de fonds")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/DownPayment\./);
  });
});
