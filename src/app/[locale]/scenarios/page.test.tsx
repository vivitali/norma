import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/lib/locales";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import ScenariosPage from "./page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: Locale = "en-CA") =>
  renderWithIntl(
    <JurisdictionProvider>
      <ScenariosPage />
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

describe("Scenarios — four columns, one recommendation", () => {
  it("compares four down payments as a real table, not a grid of divs", async () => {
    // The columns ARE the comparison, so the header cells have to be header
    // cells or a screen reader reads forty loose numbers.
    const user = userEvent.setup();
    renderPage();
    await open(user, /Monthly cost/);
    const table = screen.getAllByRole("table")[0];
    expect(within(table).getAllByRole("columnheader")).toHaveLength(5);
  });

  it("shows no premium tax in Manitoba, which dropped it in 2020", async () => {
    // Closing costs are recomputed per column precisely because this line varies
    // by jurisdiction AND by column. Manitoba is the case where the row is empty
    // across the board -- and an empty row here is a fact, not a gap.
    const user = userEvent.setup();
    renderPage();
    await open(user, /Can you fund it\?/);
    const row = screen.getByRole("row", { name: /Tax on the CMHC premium/ });
    for (const cell of within(row).getAllByRole("cell")) {
      expect(cell.textContent).toBe("—");
    }
  });

  it("marks the reader's own column, separately from the recommended one", async () => {
    // Four columns, and only the recommendation was marked -- so the one the
    // reader had actually chosen looked like two they had not. When the two
    // marks land on different columns, that gap is the finding.
    const user = userEvent.setup();
    renderPage();
    await open(user, /Monthly cost/);
    // Scoped to one table: a grid renders per open section, and every one of
    // them marks the reader's column, so an unscoped query counts it twice.
    const own = [
      ...screen.getAllByRole("table")[0].querySelectorAll('th[aria-current="true"]'),
    ];
    expect(own).toHaveLength(1);
    // 10% is the default down payment.
    expect(own[0].textContent).toContain("10%");
    expect(own[0].textContent).toContain("Your choice");
  });

  it("moves the mark when the reader changes their down payment", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Monthly cost/);
    const purchase = within(
      screen.getByRole("radiogroup", { name: /Down payment/ }),
    );
    await user.click(purchase.getByRole("radio", { name: "20%" }));
    const own = [
      ...screen.getAllByRole("table")[0].querySelectorAll('th[aria-current="true"]'),
    ];
    expect(own).toHaveLength(1);
    expect(own[0].textContent).toContain("20%");
  });

  it("raises a below-minimum column to the legal floor and labels it", async () => {
    // 5% is legal below $500,000 and not above it, so this only appears once the
    // price crosses the threshold -- which is the rule doing the work, not a flag.
    const user = userEvent.setup();
    renderPage();
    await open(user, /Monthly cost/);
    expect(screen.queryByText(/Below the legal minimum/)).not.toBeInTheDocument();

    const price = screen.getByLabelText("Purchase price");
    await user.clear(price);
    await user.type(price, "900000");
    await user.tab();

    expect(screen.getAllByText(/Below the legal minimum/).length).toBeGreaterThan(0);
  });
});

describe("Scenarios — the recommendation", () => {
  it("withholds a verdict until funds are given", () => {
    // Fundability is unknowable without them, and guessing would put a verdict
    // on screen the reader never supplied the input for.
    renderPage();
    expect(screen.queryByText(/saves .* over the life of the mortgage/)).not.toBeInTheDocument();
  });

  it("recommends 20% once it is both approvable and reachable", async () => {
    const user = userEvent.setup();
    renderPage();

    // Approval first: no deposit fixes an income problem, so the recommendation
    // stays silent until a lender would say yes.
    await open(user, /Qualification/);
    const income = screen.getByLabelText("Your annual income");
    await user.clear(income);
    await user.type(income, "180000");
    await user.tab();

    await open(user, /Can you fund it\?/);
    const funds = screen.getByLabelText("Funds available");
    await user.clear(funds);
    await user.type(funds, "300000");
    await user.tab();

    expect(screen.getAllByText(/over the life of the mortgage/).length).toBeGreaterThan(0);
    expect(screen.getAllByText("Recommended").length).toBeGreaterThan(0);
  });

  it("reconciles the saving against the cash it costs, in one sentence", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Qualification/);
    const income = screen.getByLabelText("Your annual income");
    await user.clear(income);
    await user.type(income, "180000");
    await user.tab();
    await open(user, /Can you fund it\?/);
    const funds = screen.getByLabelText("Funds available");
    await user.clear(funds);
    await user.type(funds, "300000");
    await user.tab();

    // The head says "saves $76,010" and the table says "0.91×". Shown together
    // with nothing connecting them, the reader has two magnitudes and no way to
    // relate them. Asserting the phrase alone passed either way, because both
    // the head and the old second branch carried "over the life of the mortgage".
    const sub = screen.getAllByText(/back per dollar of extra down payment/)[0];
    expect(sub).toBeInTheDocument();
    expect(sub.textContent).toMatch(/\$[\d,]+ of interest/);
    expect(sub.textContent).toMatch(/\$[\d,]+ more at closing/);
    expect(sub.textContent).toMatch(/\d\.\d\d×/);
  });

  it("says a bigger down payment cannot fix an income problem", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Qualification/);
    const income = screen.getByLabelText("Your annual income");
    await user.clear(income);
    await user.type(income, "20000");
    await user.tab();
    expect(
      screen.getAllByText(/would decline at this price, whatever you put down/).length,
    ).toBeGreaterThan(0);
  });
});

describe("Scenarios — how to read it", () => {
  it("states the counterweight against pushing past 20%", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Lifetime cost/);
    expect(screen.getByText(/Above 20% is a much weaker case/)).toBeInTheDocument();
    expect(screen.getByText(/not tax-deductible in Canada/)).toBeInTheDocument();
  });
});

describe("Scenarios — the row line says what the section found", () => {
  it("prices the dearest and cheapest columns instead of repeating the row's name", () => {
    // The line was the string "Monthly cost" and so was the name beside it: one
    // row printing its own name twice, spending the single line of explanation
    // the reader gets on two words they had already read.
    renderPage();
    const row = screen.getByRole("button", { name: /Monthly cost/ });
    const text = row.textContent ?? "";
    expect(text).toMatch(/\d+% down \$[\d,]+ · \d+% down \$[\d,]+/);
    expect(text.match(/Monthly cost/g)).toHaveLength(1);

    // Dearest first, cheapest second — a spread, not two numbers in any order.
    const [dearest, cheapest] = [...text.matchAll(/\$([\d,]+)/g)].map((m) =>
      Number(m[1].replace(/,/g, "")),
    );
    expect(dearest).toBeGreaterThan(cheapest);
  });

  it("answers the cash row once funds are known, rather than restating the why", async () => {
    // `gCashNote` is also the first sentence of `cashWhy`, so with the section
    // open the reader met the same sentence twice, one line apart, whether or
    // not the question it stands in for had been answered.
    const user = userEvent.setup();
    renderPage();
    await open(user, /Can you fund it\?/);
    expect(screen.getAllByText(/A cheaper scenario you cannot fund/).length).toBeGreaterThan(0);

    const funds = screen.getByLabelText("Funds available");
    await user.clear(funds);
    await user.type(funds, "300000");
    await user.tab();

    const row = screen.getByRole("button", { name: /Can you fund it\?/ });
    expect(row.textContent).toMatch(/You can fund it today/);
    expect(row.textContent).not.toMatch(/A cheaper scenario you cannot fund/);
  });
});

describe("Scenarios — French", () => {
  it("renders in French without leaking a message key, in every section", async () => {
    // Expanded first, deliberately. A missing ICU parameter makes next-intl
    // render the raw key, and a collapsed page hides every section where that
    // can happen -- which is exactly where Amortization.altText was hiding.
    const user = userEvent.setup();
    renderPage("fr-CA");
    await user.click(screen.getByRole("button", { name: "Tout ouvrir" }));
    expect(document.body.textContent).not.toMatch(/Scenarios\./);
  });
});

describe("Scenarios — the phone layout is a carousel of cards, not a narrowed table", () => {
  // The comparison shipped as one 560px table inside a horizontal scroller. At
  // 320px that shows a single column at a time, so reading one figure means
  // holding a row label in your head while you scroll sideways to find the
  // number under it. The reference is explicit: "on phone the grid becomes a
  // card carousel, never a horizontally-scrolling table."
  //
  // jsdom applies no layout, so none of this can be measured — it is asserted on
  // structure and on the class names that carry the breakpoint.
  const MONTHLY = "The mortgage · Monthly cost";

  const cardsFor = (caption: string) =>
    within(screen.getByRole("list", { name: caption })).getAllByRole("listitem");

  it("ships one card per scenario, and hands each layout the width the other gives up", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Monthly cost/);

    const cards = cardsFor(MONTHLY);
    expect(cards).toHaveLength(4);
    expect(cards.map((card) => card.textContent)).toEqual([
      expect.stringContaining("5% down"),
      expect.stringContaining("10% down"),
      expect.stringContaining("20% down"),
      expect.stringContaining("25% down"),
    ]);

    // The two layouts are mutually exclusive. Both rendering at once would read
    // every figure twice to a screen reader on one width or the other.
    const list = screen.getByRole("list", { name: MONTHLY });
    expect(list.className).toContain("sm:hidden");
    const scroller = screen.getAllByRole("table")[0].parentElement!;
    expect(scroller.className).toContain("hidden");
    expect(scroller.className).toContain("sm:block");
  });

  it("marks the reader's own scenario on the card, as the column already was", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Monthly cost/);

    // Scoped to one carousel: a grid renders per section, and every one of them
    // marks the reader's scenario.
    const own = cardsFor(MONTHLY).filter((card) => card.getAttribute("aria-current") === "true");
    expect(own).toHaveLength(1);
    // 10% is the default down payment.
    expect(own[0].textContent).toContain("10% down");
    expect(own[0].textContent).toContain("Your choice");
    // The tint is the visual half of the same mark, and it is the reason --acbg
    // was pulled into the contrast sweep.
    expect(own[0].className).toContain("bg-acbg");
  });

  it("moves the mark, and the card it starts on, when the reader changes their down payment", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Monthly cost/);
    await user.click(
      within(screen.getByRole("radiogroup", { name: /Down payment/ })).getByRole("radio", {
        name: "20%",
      }),
    );
    const own = cardsFor(MONTHLY).filter((card) => card.getAttribute("aria-current") === "true");
    expect(own).toHaveLength(1);
    expect(own[0].textContent).toContain("20% down");
  });

  it("drops no row from the phone, so the two layouts answer the same questions", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Monthly cost/);

    const table = screen.getAllByRole("table")[0];
    const bodyRows = within(table).getAllByRole("rowheader");
    for (const card of cardsFor(MONTHLY)) {
      expect(within(card).getAllByRole("definition")).toHaveLength(bodyRows.length);
    }

    // And the same figure, not merely the same count. Cells carry an sr-only
    // "best of the four" suffix, so this compares the leading figure only.
    const row = within(table).getByRole("row", { name: /True all-in monthly/ });
    const yoursColumn = within(row).getAllByRole("cell")[1].textContent ?? "";
    const own = cardsFor(MONTHLY).find((card) => card.getAttribute("aria-current") === "true")!;
    const value = within(own).getByText("True all-in monthly").parentElement!.querySelector("dd");
    expect(yoursColumn).toContain(value?.textContent?.replace(/ · .*/, "") ?? "");
  });

  it("adds no gesture and no control, so nothing is hidden behind one and nothing traps focus", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Monthly cost/);

    const list = screen.getByRole("list", { name: MONTHLY });
    // Every scenario is present and in order: this is a scroller, not a set of
    // tabs. DESIGN.md §8 allows no second way to reveal anything.
    expect(within(list).queryAllByRole("button")).toEqual([]);
    expect(within(list).queryAllByRole("tab")).toEqual([]);
    // The only links inside are the per-figure provenance marks the table
    // already carried, so there is nothing to trap; the scroller itself is
    // focusable because Safari does not make scroll containers focusable.
    expect(list.getAttribute("tabindex")).toBe("0");
    for (const link of within(list).getAllByRole("link")) {
      expect(link.getAttribute("href")).toMatch(/\/sources/);
    }
  });
});

describe("Scenarios — four columns of nothing is not a comparison", () => {
  // Every column here is the same price at a different deposit. With no price
  // published and none given, all four were $425 a month of insurance-free
  // nothing, presented as a recommendation.
  it("asks for a price instead of comparing four $0 purchases", () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "nt" }));
    renderPage();
    expect(
      screen.getByText(/Nobody publishes a benchmark price for Northwest Territories/),
    ).toBeInTheDocument();
    expect(screen.queryAllByRole("table")).toHaveLength(0);
  });

  it("compares in full once a price is given", async () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "nt" }));
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Purchase price"), "525000");
    await user.tab();
    expect(screen.queryByText(/Nobody publishes a benchmark price/)).not.toBeInTheDocument();
    expect(screen.getAllByRole("table").length).toBeGreaterThan(0);
  });
});

describe("Scenarios — the ratios reconcile with the fields beside them", () => {
  // "Household income" wrote income1 alone and "Monthly debts" wrote otherDebt
  // alone, while GDS and TDS were computed on all three income keys and all four
  // debt keys. A reader who had entered a car payment on /affordability typed a
  // figure here and watched approve flip to decline by more than they had typed,
  // with nothing on screen to reconcile it.
  it("prints the qualifying income and the debt total the ratios were computed on", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Qualification/);
    const table = screen.getAllByRole("table")[0];
    for (const label of [/Qualifying income/, /Monthly debts, all sources/]) {
      const row = within(table).getByRole("row", { name: label });
      for (const cell of within(row).getAllByRole("cell")) {
        expect(cell.textContent).toMatch(/\$[\d,]+/);
      }
    }
  });

  it("names the two fields after the single key each of them writes", async () => {
    // The labels claimed the household total and the debt total; each field
    // writes exactly one of the seven keys behind those totals.
    const user = userEvent.setup();
    renderPage();
    await open(user, /Qualification/);
    expect(screen.getByLabelText("Your annual income")).toBeInTheDocument();
    expect(screen.getByLabelText("Your other monthly debts")).toBeInTheDocument();
    expect(screen.queryByLabelText("Household income")).not.toBeInTheDocument();
  });

  it("adds to what was entered elsewhere rather than replacing it", async () => {
    // The behaviour the relabel and the two rows exist to make visible.
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "winnipeg", car: 400 }),
    );
    const user = userEvent.setup();
    renderPage();
    await open(user, /Qualification/);
    const debts = screen.getByLabelText("Your other monthly debts");
    await user.clear(debts);
    await user.type(debts, "100");
    await user.tab();

    const table = screen.getAllByRole("table")[0];
    const row = within(table).getByRole("row", { name: /Monthly debts, all sources/ });
    expect(within(row).getAllByRole("cell")[0].textContent).toContain("$500");
  });
});

describe("Scenarios — the minimum down payment rule, above and below the insured cap", () => {
  it("names the tiers below the cap", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Monthly cost/);
    expect(screen.getByText(/5% on the first \$500,000 and 10% on the portion above it/)).toBeInTheDocument();
  });

  it("stops claiming a tiered minimum at or above the insured cap", async () => {
    // At $1.5M and up no insurer will cover the mortgage, so the minimum is a
    // flat 20% and the tiered sentence is simply false. It rendered
    // unconditionally.
    const user = userEvent.setup();
    renderPage();
    await open(user, /Monthly cost/);
    const price = screen.getByLabelText("Purchase price");
    await user.clear(price);
    await user.type(price, "1600000");
    await user.tab();

    expect(screen.queryByText(/on the portion above it/)).not.toBeInTheDocument();
    // Scoped to the sentence, not the page: 20% of $1.6M is also the down payment
    // the reader is putting down, so $320,000 legitimately appears in all four
    // columns and in the raised-to-minimum note. The invariant is that the flat-20%
    // sentence names the figure ITSELF, which a page-wide match would not catch.
    const flat = screen.getByText(/no insurer will cover the mortgage/);
    expect(flat).toHaveTextContent("$320,000");
  });
});

describe("Scenarios — the all-in monthly total is one the reader can add up", () => {
  /**
   * The figure in a metric row's first data column, as a number.
   *
   * Matched on the row HEADER, not on `getByRole("row", { name })`: a row's
   * accessible name concatenates every cell in it, so a label matches rows it does
   * not head as soon as one of the four columns happens to contain the same text.
   */
  function cell(table: HTMLElement, label: string) {
    const headers = within(table).getAllByRole("rowheader");
    const header = headers.find((th) => th.textContent!.startsWith(label));
    if (!header) throw new Error(`no row "${label}" among: ${headers.map((h) => h.textContent).join(" | ")}`);
    const row = header.closest("tr")!;
    return Number(within(row).getAllByRole("cell")[0].textContent!.replace(/[^0-9.]/g, ""));
  }

  it("shows every component of it, not three of six", async () => {
    // The table listed P&I, property tax and maintenance and then a bold "True
    // all-in monthly" that also contains insurance, utilities and the whole strata
    // fee. In Toronto at $600,000 the visible rows summed to $3,386.67 under a total
    // of $3,811.67 — $425 unexplained, plus the condo fee on a condo.
    const user = userEvent.setup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({
        jurId: "toronto", price: 600000, dpPct: 10, amortYears: 30, ptype: "condo", condoFee: 550,
      }),
    );
    renderPage();
    await open(user, /Monthly cost/);
    const table = screen.getAllByRole("table")[0];

    const parts = [
      "Principal and interest",
      "Property tax",
      "Maintenance reserve",
      "Home insurance",
      "Utilities",
      "Condo fee",
    ].map((label) => cell(table, label));

    const total = cell(table, "True all-in monthly");
    // Rounded to the dollar in each cell, so six roundings can drift by at most $3.
    expect(Math.abs(parts.reduce((a, b) => a + b, 0) - total)).toBeLessThanOrEqual(3);
  });

  it("omits a component the household does not pay, rather than showing it as zero", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "toronto", price: 600000, ptype: "house", condoFee: 0 }),
    );
    renderPage();
    await open(user, /Monthly cost/);
    const table = screen.getAllByRole("table")[0];
    expect(
      within(table).getAllByRole("rowheader").some((th) => th.textContent!.startsWith("Condo fee")),
    ).toBe(false);
  });
});

describe("Scenarios — the ledger shows a column only when it says something", () => {
  const openCalc = async (user: ReturnType<typeof userEvent.setup>) => {
    const b = screen.getByRole("button", { name: /Як це обчислено|How this was calculated/ });
    if (b.getAttribute("aria-expanded") === "false") await user.click(b);
    return within(document.getElementById("calc")!);
  };

  it("omits the 'modelled at' column when no scenario was raised to the floor", async () => {
    // Four em-dashes under a heading is a rendering fault wearing a column, and this
    // codebase's convention is that an absent row beats a dash row.
    const user = userEvent.setup();
    renderPage();
    const calc = await openCalc(user);
    expect(calc.queryByText("Modelled at")).not.toBeInTheDocument();
  });

  it("shows it, and the raised figure, when a scenario IS below the legal minimum", async () => {
    // 5% down on a price above $500,000 is not allowed; the column is what says the
    // row was modelled at something other than its own label.
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "toronto", ptype: "condo", funds: 400000 }),
    );
    const user = userEvent.setup();
    renderPage();
    const calc = await openCalc(user);
    expect(calc.getByText("Modelled at")).toBeInTheDocument();
  });

  it("labels rows by the requested percentage, matching the grid above", async () => {
    // Two tables of the same four scenarios on one page have to be matchable. The
    // effective percentage is disclosed in its own column instead.
    const user = userEvent.setup();
    renderPage();
    const calc = await openCalc(user);
    const rows = [...calc.getByRole("table").querySelectorAll("tbody tr th")];
    expect(rows.map((th) => th.textContent)).toEqual([
      "5% down",
      "10% down",
      "20% down",
      "25% down",
    ]);
  });
});
