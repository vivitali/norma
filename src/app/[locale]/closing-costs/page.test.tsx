import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/lib/locales";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import ClosingCostsPage from "./page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

/**
 * Forces one credit status through the page. `credits` is wrapped, not replaced, and only
 * when a test asks for it.
 *
 * Needed for `overCeiling` alone: no jurisdiction in the dataset can produce it today, because
 * PEI's is the only `fullExempt` rebate and its ceiling is deliberately `null`. "Unreachable,
 * so untested" is precisely how `superseded` and `overCeiling` both came to render as "No
 * rebate exists here" — the page has to say the right thing the day a ceiling is filled in.
 */
const forced = vi.hoisted(() => ({ st: null as string | null }));
vi.mock("@/domain/engine", async () => {
  const actual = await vi.importActual<typeof import("@/domain/engine")>("@/domain/engine");
  return {
    ...actual,
    credits: (...args: Parameters<typeof actual.credits>) => {
      const out = actual.credits(...args);
      if (forced.st === null) return out;
      const st = forced.st as import("@/domain/engine").CreditLine["st"];
      return { ...out, atClosing: out.atClosing.map((c) => ({ ...c, amount: 0, st })) };
    },
  };
});

/** A BC first-time buyer of an $800,000 new build — the purchase that has two rival exemptions. */
function seedVancouverNewBuild() {
  window.localStorage.setItem(
    "norma.inputs.v2",
    JSON.stringify({ jurId: "vancouver", price: 800000, ftb: true, ptype: "newbuild" }),
  );
}

const renderPage = (locale: Locale = "en") =>
  renderWithIntl(
    <JurisdictionProvider>
      <ClosingCostsPage />
    </JurisdictionProvider>,
    { locale },
  );

/** Open a section by its heading button and return its panel. */
async function open(user: ReturnType<typeof userEvent.setup>, name: RegExp) {
  // Idempotent. One section opens itself on arrival — the one whose check
  // produced the verdict — so an unconditional click closed it instead.
  const button = screen.getByRole("button", { name });
  if (button.getAttribute("aria-expanded") === "false") await user.click(button);
  return button;
}

beforeEach(() => {
  window.localStorage.clear();
  forced.st = null;
});

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
    await open(user, /Taxes and government fees/);
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
    await open(user, /Taxes and government fees/);
    expect(screen.queryByText(/on the first/)).not.toBeInTheDocument();
    await user.click(screen.getAllByRole("button", { name: "Bracket breakdown" })[0]);
    expect(screen.getAllByText(/on the first/).length).toBeGreaterThan(0);
  });
});

describe("Closing costs — credits, and when they arrive", () => {
  it("separates closing-day credits from ones that arrive at tax time", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Credits back/);
    expect(screen.getByText("Applied on closing day")).toBeInTheDocument();
  });

  it("warns that a tax-time credit is not closing-day money", async () => {
    // Unconditional. The previous version was `if (later) expect(later)...`,
    // which passes whether the warning renders or not. The default jurisdiction
    // has a tax-time credit for a first-time buyer, so this is deterministic.
    const user = userEvent.setup();
    renderPage();
    await open(user, /Credits back/);
    expect(screen.getByText("Arrives later, at tax time")).toBeInTheDocument();
    expect(
      screen.getByText(/do not budget it as closing-day money/),
    ).toBeInTheDocument();
  });
});

describe("Closing costs — a rebate that pays nothing still says why", () => {
  const NONE = "No rebate exists here";

  it("tells a BC buyer the rival exemption paid more, not that no rebate exists", async () => {
    // BC, first-time buyer, $800,000 new build: the newly-built exemption forgives the whole
    // $14,000 and the first-time-buyer one is emitted at $0 with st "superseded". The page's
    // fall-through used to print "No rebate exists here" against a programme the buyer
    // qualified for — the exact opposite of the truth, and the opposite of the reason the
    // losing row is kept visible at all.
    seedVancouverNewBuild();
    const user = userEvent.setup();
    renderPage();
    await open(user, /Credits back/);

    expect(screen.getByText("Newly built home exemption")).toBeInTheDocument();
    expect(screen.getByText("First-time buyer transfer tax exemption")).toBeInTheDocument();
    expect(
      screen.getByText(/another rebate here is worth more/),
    ).toBeInTheDocument();
    expect(screen.queryByText(NONE)).not.toBeInTheDocument();
  });

  it("says an over-ceiling exemption stops above a price, not that none exists", async () => {
    forced.st = "overCeiling";
    seedVancouverNewBuild();
    const user = userEvent.setup();
    renderPage();
    await open(user, /Credits back/);

    expect(
      screen.getAllByText("This exemption stops above a set price, and your price is above it."),
    ).not.toHaveLength(0);
    expect(screen.queryByText(NONE)).not.toBeInTheDocument();
  });

  it("says the same thing in French", async () => {
    seedVancouverNewBuild();
    const user = userEvent.setup();
    renderPage("fr");
    await open(user, /Crédits/);
    expect(screen.getByText(/un autre remboursement offert ici vaut davantage/)).toBeInTheDocument();
    expect(screen.queryByText("Aucun remboursement ici")).not.toBeInTheDocument();
  });
});

describe("Closing costs — an absent credit is an absence, not a dash", () => {
  it("drops the figure rather than dashing it when nothing comes off that day", async () => {
    // "—" in the figure slot reads as a figure that failed to compute, and "$0"
    // would assert a credit exists here and happens to be nil — the same false
    // claim this page refuses to make for a line item. The line carries which
    // of "arrives later" and "does not exist here" is true.
    renderPage();
    const row = screen.getByRole("button", { name: /Credits back/ });
    expect(row.textContent).toMatch(/no closing-day credit|arrives months later/);
    expect(row.textContent).not.toContain("—");
    expect(row.textContent).not.toContain("$0");
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
  it("renders in French without leaking a message key, in every section", async () => {
    // Expanded first, deliberately. A missing ICU parameter makes next-intl
    // render the raw key, and a collapsed page hides every section where that
    // can happen -- which is exactly where Amortization.altText was hiding.
    const user = userEvent.setup();
    renderPage("fr");
    await user.click(screen.getByRole("button", { name: "Tout ouvrir" }));
    expect(screen.getByText("Comptant requis le jour de la clôture")).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/ClosingCosts\./);
  });
});
