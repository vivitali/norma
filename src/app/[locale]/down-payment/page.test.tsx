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
  // Idempotent. One section opens itself on arrival — the one whose check
  // produced the verdict — so an unconditional click closed it instead.
  const button = screen.getByRole("button", { name });
  if (button.getAttribute("aria-expanded") === "false") await user.click(button);
  return button;
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
    expect(screen.getAllByText(/Add what you have in each account/).length).toBeGreaterThan(0);
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
  it("asks for a saving rate before judging one", async () => {
    // On an empty form there is no rate to fail. Saying "not reached at this
    // savings rate" in red blames the reader for an input never requested.
    const user = userEvent.setup();
    renderPage();
    await open(user, /The savings glide path/);
    expect(screen.getAllByText(/Add a monthly saving rate/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Not reached within 36 months/)).not.toBeInTheDocument();
  });

  it("refuses to name a month the saving rate genuinely cannot reach", async () => {
    // Once a rate IS given and it does not get there, the honest answer is no
    // month at all. A number would be a promise the rate cannot keep.
    const user = userEvent.setup();
    renderPage();

    await open(user, /The funding order/);
    const fhsa = screen.getByLabelText("FHSA");
    await user.clear(fhsa);
    await user.type(fhsa, "1000");
    await user.tab();

    await open(user, /The savings glide path/);
    const save = screen.getAllByLabelText("Monthly savings toward the purchase")[0];
    await user.clear(save);
    await user.type(save, "50");
    await user.tab();

    expect(screen.getAllByText(/Not reached within 36 months/).length).toBeGreaterThan(0);
  });
});

describe("Down payment — the row states what it found, and never a dash", () => {
  it("shows no em-dash figure before any balance is given", () => {
    // "—" in the figure slot reads as a figure that failed to render. Nothing
    // drawn yet is an absent number, and the row carries no number at all.
    renderPage();
    for (const name of [/The funding order/, /Tax cost/, /The savings glide path/]) {
      expect(screen.getByRole("button", { name }).textContent).not.toContain("—");
    }
  });

  it("replaces the ordering rule with the shortfall once balances are given", async () => {
    // "Cheapest money first" under a section called "The funding order" is the
    // same fact twice. It is the ordering RULE, true whatever the numbers, so
    // it holds the line only while there are no numbers.
    const user = userEvent.setup();
    renderPage();
    const order = () => screen.getByRole("button", { name: /The funding order/ });
    expect(order().textContent).toContain("Cheapest money first");

    await open(user, /The funding order/);
    const fhsa = screen.getByLabelText("FHSA");
    await user.clear(fhsa);
    await user.type(fhsa, "1000");
    await user.tab();

    expect(order().textContent).toMatch(/Short by \$[\d,]+/);
    expect(order().textContent).not.toContain("Cheapest money first");
  });
});

describe("Down payment — French", () => {
  it("renders in French without leaking a message key, in every section", async () => {
    // Expanded first, deliberately. A missing ICU parameter makes next-intl
    // render the raw key, and a collapsed page hides every section where that
    // can happen -- which is exactly where Amortization.altText was hiding.
    const user = userEvent.setup();
    renderPage("fr");
    await user.click(screen.getByRole("button", { name: "Tout ouvrir" }));
    expect(screen.getByText("Sources de la mise de fonds")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/DownPayment\./);
  });
});
