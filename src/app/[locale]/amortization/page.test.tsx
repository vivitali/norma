import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/lib/locales";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import AmortizationPage from "./page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: Locale = "en") =>
  renderWithIntl(
    <JurisdictionProvider>
      <AmortizationPage />
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

describe("Amortization — the section that opens is the one the head is about", () => {
  /**
   * The head is the renewal check in EVERY state: the hero figure is
   * `paymentAfterRenewal`, the sentence is shockUp/shockDown/shockNone and the
   * second head stat is the shock. `isSectionOpen`'s rule is "the section whose
   * check produced the verdict", so renewal is that section whatever is stored.
   *
   * The old condition opened `payment` whenever no renewal rate had been set —
   * i.e. on every first visit, the one state whose sub-line tells the reader in
   * so many words to move the renewal rate, with the control that does it and
   * with riskTitle/riskBody behind a closed caret.
   */
  it("opens renewal on a first visit, not the payment", () => {
    renderPage();
    expect(screen.getByRole("button", { name: /Renewal/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: /The payment/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("puts the term-versus-amortization explanation on screen unprompted", () => {
    // The only place in the product that explains a Canadian term is not the
    // amortization. It was reachable on a first visit only by pressing a caret.
    renderPage();
    expect(
      screen.getByText(/Renewal risk is the largest unmodelled risk/),
    ).toBeInTheDocument();
  });

  it("still opens renewal once a renewal rate has been stored", () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ renewalRate: 7 }));
    renderPage();
    expect(screen.getByRole("button", { name: /Renewal/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("leads from the payment panel back to the renewal question", async () => {
    // A note under "Paid off in year 30", which is where the misreading is made:
    // a 30-year payoff beside one rate reads as a rate fixed for 30 years.
    const user = userEvent.setup();
    renderPage();
    await open(user, /The payment/);
    const jump = screen
      .getAllByRole("link")
      .filter((a) => a.getAttribute("href") === "#renewal");
    expect(jump).toHaveLength(1);
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

  it("marks the crossover row in the table, not only in the chart caption", async () => {
    // Thirty near-identical rows, one of which is the moment the loan turns from
    // mostly-interest to mostly-principal. The chart named it and the table did
    // not, so the row worth finding looked like the twenty-nine that were not.
    const user = userEvent.setup();
    renderPage();
    await open(user, /Year by year/);
    const marked = [...screen.getByRole("table").querySelectorAll("tbody tr")].filter((tr) =>
      /Principal overtakes interest/.test(tr.textContent ?? ""),
    );
    expect(marked).toHaveLength(1);
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

describe("Amortization — with no published price, it asks", () => {
  /**
   * Nobody publishes an MLS HPI benchmark for a territory, so `resolved.price` is 0
   * there. A payment schedule for a $0 mortgage is not a smaller answer than a real
   * one, it is a false one: it quoted "$0" as this reader's payment, in the same type
   * at the same size as Toronto's $6,387, with nothing on screen saying otherwise.
   */
  const inYukon = () =>
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "yt" }));

  it("replaces the payment with the ask, and prints no figure at all", () => {
    inYukon();
    renderPage();
    expect(screen.getByText(/Nobody publishes a benchmark price for Yukon/)).toBeInTheDocument();
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
    // The sections are the derivation of a payment there is no price to compute.
    expect(screen.queryAllByRole("button", { expanded: true })).toHaveLength(0);
  });

  it("asks on the price field itself, and suggests nothing in it", () => {
    inYukon();
    renderPage();
    const price = screen.getByLabelText("Purchase price");
    expect(price).toHaveValue("");
    expect(price).not.toHaveAttribute("placeholder", expect.stringContaining("0"));
    expect(screen.getByText(/No published price for Yukon/)).toBeInTheDocument();
  });

  it("asks in French too, with the place name correctly articled inside the sentence", () => {
    // The ask carries an ICU argument in both locales, and a French reader meeting
    // `Inputs.noPriceHead` instead of a sentence is the failure this catches.
    //
    // It asserted "pour Yukon" and so pinned a grammatical error rather than the fix: these
    // strings are reachable only on the six records that have no published price, and every
    // one of them takes an article — le Yukon, les Territoires du Nord-Ouest,
    // l'Île-du-Prince-Édouard. The article comes from `Jurisdictions.at.<id>`, a table rather
    // than a rule, because French articles are not derivable from spelling — and Terre-Neuve
    // takes none at all. The negative assertion is what stops the bare form coming back.
    inYukon();
    renderPage("fr");
    expect(
      screen.getByText(/Personne ne publie de prix de référence pour le Yukon/),
    ).toBeInTheDocument();
    expect(screen.getByText(/Aucun prix publié pour le Yukon/)).toBeInTheDocument();
    expect(screen.queryByText(/pour Yukon/)).not.toBeInTheDocument();
  });

  it("answers in full the moment the reader gives a price", async () => {
    inYukon();
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Purchase price"), "640000");
    await user.tab();
    expect(screen.getAllByText(/your payment never changes/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Nobody publishes a benchmark price/)).not.toBeInTheDocument();
  });
});
