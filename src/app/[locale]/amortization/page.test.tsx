import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/lib/locales";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import AmortizationPage from "./page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: Locale = "en-CA") =>
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
  it("opens on no change, and points at the control that shows what a renewal does", () => {
    // Defaulting to a shock would be inventing a rate forecast. Defaulting to no
    // shock and saying so is the honest starting position — with the way to try one
    // one click away, IN the sentence, rather than as an instruction to "move" a rate.
    renderPage();
    expect(screen.getAllByText(/your payment never changes/).length).toBeGreaterThan(0);
    const link = screen.getByRole("link", { name: "Try a higher renewal rate" });
    expect(link).toHaveAttribute("href", "#renewal");
    expect(screen.queryByText(/nobody models/)).not.toBeInTheDocument();
  });

  it("opens the renewal panel and focuses the scenario control from the hero link", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByRole("button", { name: /Renewal/ })).toHaveAttribute("aria-expanded", "false");
    await user.click(screen.getByRole("link", { name: "Try a higher renewal rate" }));
    expect(screen.getByRole("button", { name: /Renewal/ })).toHaveAttribute("aria-expanded", "true");
    await waitFor(() =>
      expect(screen.getByRole("radio", { name: "Today’s rate" })).toHaveFocus(),
    );
  });

  it("turns a renewal rate into a payment shock", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Renewal/);
    await user.click(screen.getByRole("radio", { name: "+4 pts" }));
    expect(screen.getAllByText(/your payment rises by/).length).toBeGreaterThan(0);
  });

  it("shows a falling payment as a relief but warns against budgeting on it", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Renewal/);
    // The rate field belongs to "Custom" and appears only when it is chosen.
    expect(screen.queryByLabelText("Custom renewal rate")).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "Custom" }));
    const field = screen.getByLabelText("Custom renewal rate");
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
    await user.click(screen.getByRole("radio", { name: "+2 pts" }));
    expect(
      screen.getAllByText("Extra interest versus renewing at today’s rate").length,
    ).toBeGreaterThan(0);
  });
});

describe("Amortization — nothing opens until the reader has said something", () => {
  /**
   * The head is the renewal check in EVERY state: the hero figure is
   * `paymentAfterRenewal`, the sentence is shockUp/shockDown/shockNone and the
   * second head stat is the shock. So renewal is the section that opens — but only
   * once the reader has personalised the page or chosen a renewal rate. A first-time
   * visitor is not greeted by an open derivation of figures they never gave; the head
   * and its stats carry the verdict.
   */
  it("opens no section on a first visit", () => {
    renderPage();
    expect(screen.queryAllByRole("button", { expanded: true })).toHaveLength(0);
  });

  it("still opens renewal once a renewal rate has been stored", () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ renewalRate: 7 }));
    renderPage();
    expect(screen.getByRole("button", { name: /Renewal/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("opens renewal for a personalised reader, and puts the mechanism on screen", () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ income1: 90000 }));
    renderPage();
    expect(screen.getByRole("button", { name: /Renewal/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    // The only place in the product that explains a Canadian term is not the amortization.
    expect(screen.getByText("The rate is reset at every renewal")).toBeInTheDocument();
    expect(screen.queryByText(/breaks household budgets/)).not.toBeInTheDocument();
  });

  it("leads from the payment panel back to the renewal question", async () => {
    // A note under "Paid off in year 30", which is where the misreading is made:
    // a 30-year payoff beside a single rate reads as a rate fixed for 30 years.
    const user = userEvent.setup();
    renderPage();
    await open(user, /The payment/);
    const jump = [...document.getElementById("payment")!.querySelectorAll("a")].filter(
      (a) => a.getAttribute("href") === "#renewal",
    );
    expect(jump).toHaveLength(1);
  });
});

describe("Amortization — the renewal panel leads with its controls", () => {
  it("puts one scenario control, then the term, before any result row", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Renewal/);
    const groups = screen.getAllByRole("radiogroup");
    const scenario = groups.find((g) => g.closest("#renewal"))!;
    expect(
      [...scenario.querySelectorAll("[role=radio]")].map((r) => r.textContent),
    ).toEqual(["Today’s rate", "Stress floor", "+2 pts", "+4 pts", "Custom"]);
    // The first result row comes AFTER the controls in document order.
    const firstRow = within(document.getElementById("renewal")!).getByText("Payment for the first term");
    expect(scenario.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    const term = screen.getByRole("radiogroup", { name: "Term length" });
    expect(term.compareDocumentPosition(firstRow) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it("shows Custom as chosen for a stored rate that matches no preset", async () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ renewalRate: 6.13 }));
    const user = userEvent.setup();
    renderPage();
    await open(user, /Renewal/);
    expect(screen.getByRole("radio", { name: "Custom" })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByLabelText("Custom renewal rate")).toHaveValue("6.13");
  });

  it("names no higher payment and no extra interest when nothing changes", async () => {
    // "A year, at the higher payment" over a payment that is not higher, and an extra-interest
    // row measuring a renewal against itself, were both printed at no change.
    const user = userEvent.setup();
    renderPage();
    await open(user, /Renewal/);
    const panel = document.getElementById("renewal")!;
    expect(within(panel).queryByText("A year, at the higher payment")).not.toBeInTheDocument();
    expect(
      within(panel).queryByText("Extra interest versus renewing at today’s rate"),
    ).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: "+4 pts" }));
    expect(within(panel).getByText("A year, at the higher payment")).toBeInTheDocument();
  });

  it("does not wear a state colour for no change", () => {
    // "No change" in the caution colour called a fine outcome a risk.
    renderPage();
    const row = screen.getByRole("button", { name: /Renewal/ });
    expect(row.querySelector(".bg-caution")).toBeNull();
    expect(row.textContent).toMatch(/No change/);
  });

  it("gives the payment shock its own tone on the stat that shows it", async () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ renewalRate: 10 }));
    renderPage();
    const stat = screen.getByText("Monthly change").closest("div")!.nextElementSibling!;
    expect(stat.querySelector(".text-blocked")).not.toBeNull();
  });
});

describe("Amortization — the assumption is named, and the way to replace it is one tap", () => {
  it("names the assumed price, and jumps to the price field", async () => {
    const user = userEvent.setup();
    renderPage();
    const tag = screen.getByRole("button", { name: /Assuming the typical price for Winnipeg, \$[\d,]+/ });
    await user.click(tag);
    expect(screen.getByLabelText("Purchase price")).toHaveFocus();
  });

  it("says the figures rest on the reader's price once they give one", () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ price: 500000 }));
    renderPage();
    expect(document.querySelector("[data-slot=answer-tag]")!.textContent).toBe(
      "Based on your price, $500,000",
    );
    expect(screen.queryByRole("button", { name: /Assuming the typical price/ })).not.toBeInTheDocument();
  });

  it("offers a jump to the inputs block, which carries the id it jumps to", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Adjust your numbers" })).toHaveAttribute("href", "#adjust");
    expect(document.getElementById("adjust")).not.toBeNull();
    expect(document.getElementById("adjust")!.querySelector("#price")).not.toBeNull();
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
    renderPage("fr-CA");
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
    renderPage("fr-CA");
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

describe("Amortization — the derivation ends where the page begins", () => {
  it("terminates in the hero once a renewal rate is given", async () => {
    // The hero on this page is the payment AFTER renewal. A trace that stopped at
    // the first payment left the figure at the top of the page underived — which is
    // the one thing this section exists to prevent.
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ termYears: 5, renewalRate: 7 }),
    );
    const user = userEvent.setup();
    renderPage();
    const button = screen.getByRole("button", { name: /How this was calculated/ });
    if (button.getAttribute("aria-expanded") === "false") await user.click(button);

    const hero = document.querySelector('[data-slot="answer-figure"]')!.textContent!.trim();
    const values = [...document.getElementById("calc")!.querySelectorAll("dd")]
      .map((dd) => dd.textContent!.trim());
    expect(values).toContain(hero);
  });

  it("shows no renewal step when no renewal rate was given", async () => {
    // With none, the payment after renewal IS the first payment, and a second
    // identical row would assert a step that never happened.
    const user = userEvent.setup();
    renderPage();
    const button = screen.getByRole("button", { name: /How this was calculated/ });
    if (button.getAttribute("aria-expanded") === "false") await user.click(button);
    const calc = document.getElementById("calc")!;
    expect(calc.textContent).not.toMatch(/Balance at renewal/);
    // And it still lands on the hero, because the two figures are the same number.
    const hero = document.querySelector('[data-slot="answer-figure"]')!.textContent!.trim();
    expect([...calc.querySelectorAll("dd")].map((d) => d.textContent!.trim())).toContain(hero);
  });
});

describe("Amortization — the trace multiplies out", () => {
  /** Read every operand of the calc trace as [label, value] pairs, in order. */
  const traceRows = () =>
    [...document.getElementById("calc")!.querySelectorAll("dl > div")].map((row) => [
      // The operator is restated for screen readers inside the label; drop it.
      row.querySelector("dt")!.textContent!.replace(/^[\s\u00A0]*[+−×÷=]?\s*[+−×÷=]?\s*/, "").trim(),
      row.querySelector("dd")!.textContent!.trim(),
    ]);
  const num = (text: string) => Number(text.replace(/[^\d.]/g, ""));

  it("is mortgage × payment factor = payment, not rate × years", async () => {
    // "Mortgage × Rate × Amortization" did not equal the payment ($408,339 × 3.94% × 30 ≠
    // $1,928), so the derivation the section exists to give could not be checked by hand.
    const user = userEvent.setup();
    renderPage();
    await open(user, /How this was calculated/);
    const rows = traceRows();
    const labels = rows.map(([label]) => label);
    expect(labels.some((l) => /^Payment factor · [\d.]+%, 30 years, compounded semi-annually$/.test(l))).toBe(true);
    expect(labels).not.toContain("Amortization");
    const mortgage = num(rows.find(([l]) => l === "Mortgage")![1]);
    const factor = num(rows.find(([l]) => l.startsWith("Payment factor"))![1]);
    const payment = num(rows.find(([l]) => l === "Monthly payment")![1]);
    expect(Math.abs(mortgage * factor - payment)).toBeLessThan(1);
  });

  it("does the same for the renewed payment", async () => {
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ termYears: 5, renewalRate: 7 }),
    );
    const user = userEvent.setup();
    renderPage();
    await open(user, /How this was calculated/);
    const rows = traceRows();
    const balance = num(rows.find(([l]) => l === "Balance at renewal")![1]);
    const factor = num(rows.find(([l]) => /^Payment factor · 7\.00%, 25 years left/.test(l))![1]);
    const after = num(rows.find(([l]) => l === "Payment after the first renewal")![1]);
    expect(Math.abs(balance * factor - after)).toBeLessThan(1);
  });
});

describe("Amortization — the schedule table on a phone", () => {
  it("leads with the columns that change, and is a named, focusable scroll region", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Year by year/);
    const region = screen.getByRole("region", { name: "Year by year" });
    expect(region).toHaveAttribute("tabindex", "0");
    const heads = [...screen.getByRole("table").querySelectorAll("thead th")];
    expect(heads.map((th) => th.textContent)).toEqual([
      "Yr",
      "Balance at year end",
      "Interest",
      "Principal",
      "Rate",
      "Monthly payment",
    ]);
    // Rate and payment are constant for years at a time and hide below sm.
    expect(heads.slice(4).every((th) => th.className.includes("hidden") && th.className.includes("sm:table-cell"))).toBe(true);
    expect(heads.slice(1, 4).every((th) => !th.className.includes("hidden"))).toBe(true);
  });

  it("uses no text below 11.5px in the table's tags", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Year by year/);
    expect(document.getElementById("schedule")!.innerHTML).not.toMatch(/text-\[10\.5px\]/);
  });
});

describe("Amortization — the chart has a scale and marks its events in ink", () => {
  it("draws three dollar gridlines and a year tick every ten years", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Year by year/);
    const figure = document.querySelector("#schedule figure")!;
    const yAxis = [...figure.querySelectorAll("span.tabular-nums")].map((e) => e.textContent);
    expect(yAxis.filter((t) => /^\$/.test(t ?? ""))).toHaveLength(3);
    expect(yAxis).toEqual(expect.arrayContaining(["Year 10", "Year 20", "Year 30"]));
  });

  it("labels the renewal and the crossover on the chart, never in a state colour", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Year by year/);
    const plot = document.querySelector("#schedule figure [role=img]")!;
    expect(plot.querySelectorAll("[data-marker=renewal]").length).toBeGreaterThan(0);
    expect(plot.querySelector("[data-marker=flip]")).not.toBeNull();
    expect(plot.textContent).toContain("Renewal");
    expect(plot.textContent).toContain("Principal overtakes interest");
    expect(document.querySelector("#schedule figure")!.innerHTML).not.toMatch(/bg-caution|text-caution|bg-pass|bg-blocked/);
    // The text alternative still names the crossover.
    expect(plot.getAttribute("aria-label")).toMatch(/Principal overtakes interest in year \d+/);
  });
});

describe("Amortization — a US loan term", () => {
  const inHouston = (extra: object = {}) =>
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "houston", ...extra }));

  it("asks for a loan term of 15 or 30 years, not an amortization of 25 or 30", () => {
    inHouston();
    renderPage("en-US");
    const group = screen.getByRole("radiogroup", { name: "Loan term" });
    expect([...group.querySelectorAll("[role=radio]")].map((r) => r.textContent)).toEqual([
      "15 years",
      "30 years",
    ]);
    expect(screen.queryByRole("radiogroup", { name: "Amortization" })).not.toBeInTheDocument();
  });

  it("keeps a 25-year length carried over from a Canadian page as its own, named option", () => {
    // The stored length is shared across countries. With options of 15 and 30 and 25 stored,
    // NOTHING would be checked and — with a roving tabindex — nothing tabbable either.
    inHouston({ amortYears: 25 });
    renderPage("en-US");
    const group = screen.getByRole("radiogroup", { name: "Loan term" });
    const radios = [...group.querySelectorAll<HTMLElement>("[role=radio]")];
    expect(radios.map((r) => r.textContent)).toEqual(["15 years", "25 years", "30 years"]);
    expect(radios.filter((r) => r.getAttribute("aria-checked") === "true")).toHaveLength(1);
    expect(radios.find((r) => r.tabIndex === 0)!.textContent).toBe("25 years");
    expect(screen.getByText(/Modelling a 25-year loan, carried over from an earlier choice/)).toBeInTheDocument();
  });

  it("keeps Canada's 25 and 30, and calls it an amortization", () => {
    renderPage();
    const group = screen.getByRole("radiogroup", { name: "Amortization" });
    expect([...group.querySelectorAll("[role=radio]")].map((r) => r.textContent)).toEqual([
      "25 years",
      "30 years",
    ]);
  });

  it("puts the US payment factor on the trace, compounded monthly", async () => {
    inHouston();
    const user = userEvent.setup();
    renderPage("en-US");
    await open(user, /How this was calculated/);
    expect(document.getElementById("calc")!.textContent).toMatch(/compounded monthly/);
  });
});
