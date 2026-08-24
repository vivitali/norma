import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import ScenariosPage from "./page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: "en" | "fr" = "en") =>
  renderWithIntl(
    <JurisdictionProvider>
      <ScenariosPage />
    </JurisdictionProvider>,
    { locale },
  );

async function open(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  await user.click(screen.getByRole("button", { name }));
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
    const own = screen
      .getAllByRole("columnheader")
      .filter((th) => th.getAttribute("aria-current") === "true");
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
    const own = screen
      .getAllByRole("columnheader")
      .filter((th) => th.getAttribute("aria-current") === "true");
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
    const income = screen.getByLabelText("Household income");
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
    const income = screen.getByLabelText("Household income");
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
    const sub = screen.getAllByText(/back per dollar of extra deposit/)[0];
    expect(sub).toBeInTheDocument();
    expect(sub.textContent).toMatch(/\$[\d,]+ of interest/);
    expect(sub.textContent).toMatch(/\$[\d,]+ more at closing/);
    expect(sub.textContent).toMatch(/\d\.\d\d×/);
  });

  it("says a deposit cannot fix an income problem", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Qualification/);
    const income = screen.getByLabelText("Household income");
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
    renderPage("fr");
    await user.click(screen.getByRole("button", { name: "Tout ouvrir" }));
    expect(document.body.textContent).not.toMatch(/Scenarios\./);
  });
});
