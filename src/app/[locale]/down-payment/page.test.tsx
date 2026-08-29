import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/lib/locales";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import DownPaymentPage from "./page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: Locale = "en") =>
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
    // Free money first, all of it: `gift` used to sit BELOW `hbp` and `tfsa`,
    // under copy reading "each source costs more than the one above it".
    const order = ["FHSA", "Cash and savings", "Gift", "Home Buyers’ Plan", "TFSA", "Non-registered"];
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

describe("Down payment — the two accounts that require first-time-buyer status", () => {
  /**
   * C8. `waterfall()` drew FHSA and HBP money regardless of `ftb`, both of which
   * are qualifying-home-buyer programmes in law. The rows stay — dropping them
   * would tell a reader with $40,000 in an FHSA that the app forgot the account —
   * and say the rule instead.
   */
  it("blocks them for a repeat buyer instead of spending the money", async () => {
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ ftb: false, fhsa: 40000, rrsp: 60000, cashSav: 5000 }),
    );
    const user = userEvent.setup();
    renderPage();
    await open(user, /The funding order/);

    expect(screen.getAllByText("Not available").length).toBe(2);
    expect(screen.getAllByText(/first-time home buyer programmes/).length).toBeGreaterThan(0);
    // And neither blocked row reports "Left in the account: $0" back at a reader
    // looking at their own balance in the field two lines below it. Four rows
    // carry that line; the two blocked ones do not.
    expect(screen.getAllByText(/Left in the account/).length).toBe(4);
  });

  it("spends them for a first-time buyer", async () => {
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ ftb: true, fhsa: 40000, rrsp: 60000, cashSav: 5000 }),
    );
    const user = userEvent.setup();
    renderPage();
    await open(user, /The funding order/);
    expect(screen.queryByText("Not available")).not.toBeInTheDocument();
  });

  it("warns that first-time is narrower than it sounds, once", () => {
    // Someone eighteen months into Canada who owned a flat abroad is not a
    // first-time buyer, and `ftb` DEFAULTS to true.
    renderPage();
    expect(screen.getAllByText(/wherever in the world/).length).toBe(1);
  });
});

describe("Down payment — the FHSA finally says what it is worth", () => {
  it("quotes the annual and lifetime room the app has always held", async () => {
    // federal.fhsa.annual / .lifetime are conf "high", asOf 2026-08-24, sourced to
    // CRA "Participating in your FHSAs" — and were read by no screen at all. They
    // arrive as ICU arguments from `federal`, never typed into the catalogue.
    const user = userEvent.setup();
    renderPage();
    await open(user, /The funding order/);
    const fhsaWhy = screen.getByText(/First Home Savings Account/);
    expect(fhsaWhy.textContent).toContain("$8,000");
    expect(fhsaWhy.textContent).toContain("$40,000");
    // The fact that decides it for a newcomer: the clock starts on the account,
    // not on the arrival.
    expect(fhsaWhy.textContent).toMatch(/open/i);
  });
});

describe("Down payment — the ask can be answered from where it is made", () => {
  it("points the opening section at the fields that answer it", () => {
    // The hero asks for balances; all six fields sit inside the CLOSED waterfall
    // section. The link opens it and moves focus to it.
    renderPage();
    const link = screen.getByRole("link", { name: /funding order/i });
    expect(link).toHaveAttribute("href", "#waterfall");
  });

  it("drops the ask once a balance exists", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The funding order/);
    const fhsa = screen.getByLabelText("FHSA");
    await user.clear(fhsa);
    await user.type(fhsa, "1000");
    await user.tab();
    expect(screen.queryByRole("link", { name: /funding order/i })).not.toBeInTheDocument();
  });
});

describe("Down payment — what it does not model", () => {
  it("names the omissions rather than leaving them silent", () => {
    renderPage();
    expect(screen.getByText("Not modelled here")).toBeInTheDocument();
    expect(screen.getByText(/lender will ask/)).toBeInTheDocument();
    expect(screen.getByText(/single buyer/)).toBeInTheDocument();
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

describe("Down payment — with no published price there is no target", () => {
  // The target IS a percentage of a price, and the whole waterfall is measured
  // against it. At `resolved.price` of 0 the page reported a $0 target funded in
  // full, which reads as good news and is not news at all.
  it("asks for a price instead of reporting a $0 target", () => {
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "nu", fhsa: 20000 }),
    );
    renderPage();
    expect(
      screen.getByText(/Nobody publishes a benchmark price for Nunavut/),
    ).toBeInTheDocument();
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
  });

  it("computes the target once a price is given", async () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "nu" }));
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Purchase price"), "525000");
    await user.tab();
    expect(screen.queryByText(/Nobody publishes a benchmark price/)).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /The funding order/ })).toBeInTheDocument();
  });
});
