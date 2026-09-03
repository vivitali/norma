import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { closingTotal } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { jurisdictions } from "@/domain/jurisdictions";
import { resolveInputs } from "@/lib/resolve-inputs";
import { TOOL_DEFAULTS } from "@/lib/shared-inputs";
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

const renderPage = (locale: Locale = "en-CA") =>
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
    // Scoped to the HEAD, not counted across the document. The same label now names
    // the figure in three places — the head, the derivation's terminal line and its
    // caption — so `getAllByText(...).length > 0` would have gone on passing with the
    // head deleted outright, and this test is named for the lead.
    const figure = document.querySelector('[data-slot="answer-figure"]')!;
    expect(figure.parentElement!.textContent).toContain("Cash needed on closing day");
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

describe("Closing costs — the hero is the same figure as everything under it", () => {
  /**
   * C5. The hero was `total.cash` — down payment plus costs, BEFORE the credits
   * that land on closing day — while its own three stats, the cash-check panel and
   * that section's verdict were all measured against `total.net`. On a Toronto
   * first-time purchase that is $207,777 over $199,302: the largest figure on the
   * page was the only one on the page that disagreed with the page.
   *
   * Asserted on the digits rather than a formatted string, so the same test holds
   * in a locale that writes the currency mark on the other side.
   */
  const digits = (value: string | null | undefined) => (value ?? "").replace(/[^\d]/g, "");

  it("leads with net cash at closing, not the bill before credits", () => {
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "toronto", ftb: true }),
    );
    const toronto = jurisdictions.find((j) => j.id === "toronto")!;
    const expected = closingTotal(
      toronto,
      federal,
      resolveInputs({ ...TOOL_DEFAULTS, ftb: true }, toronto, federal),
    );
    // The test is only meaningful where the two differ, so the difference is
    // asserted rather than assumed: a jurisdiction with no closing-day credit
    // would make gross and net the same number and pass either way.
    expect(expected.creditsAtClosing).toBeGreaterThan(0);

    renderPage();
    const hero = document.querySelector('[data-slot="answer-figure"]')?.textContent;
    expect(digits(hero)).toBe(String(Math.round(expected.net)));
    expect(digits(hero)).not.toBe(String(Math.round(expected.cash)));
  });
});

describe("Closing costs — what the bill does not price", () => {
  it("names its omissions rather than staying silent about them", () => {
    renderPage();
    expect(screen.getByText("Not in this bill")).toBeInTheDocument();
    // The deposit: three reviewers found it independently, and the whole point is
    // that it carries no figure.
    expect(screen.getByText(/held in trust/)).toBeInTheDocument();
  });

  it("adds the builder's extras only for a new build", () => {
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "toronto", ptype: "newbuild" }),
    );
    renderPage();
    expect(screen.getByText(/Development levies/)).toBeInTheDocument();
    expect(screen.getByText(/resale house benchmark/)).toBeInTheDocument();
  });

  it("says nothing about builders to a resale buyer", () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "toronto" }));
    renderPage();
    expect(screen.queryByText(/Development levies/)).not.toBeInTheDocument();
    expect(screen.queryByText(/resale house benchmark/)).not.toBeInTheDocument();
  });

  it("reports the GST rebate as an omission, in words and with no amount", async () => {
    // C2. `credits()` used to pay this out as money against a tax `buildLines`
    // never charges, so a new build showed a resale's bill plus a five-figure
    // refund. It now arrives on `omitted`, and what must never come back is a
    // figure beside it.
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "toronto", ptype: "newbuild", ftb: true }),
    );
    const user = userEvent.setup();
    renderPage();
    await open(user, /Credits back/);

    expect(screen.getByText("Applies here, and not priced")).toBeInTheDocument();
    const rebate = screen.getByText("First-time home buyers’ GST/HST rebate");
    expect(rebate).toBeInTheDocument();
    // Its own row carries no currency at all — the label and the explanation only.
    expect(rebate.textContent).not.toMatch(/\$/);
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
    renderPage("fr-CA");
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
    renderPage("fr-CA");
    await user.click(screen.getByRole("button", { name: "Tout ouvrir" }));
    expect(screen.getAllByText("Comptant requis le jour de la clôture").length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toMatch(/ClosingCosts\./);
  });
});

/**
 * The control has to be REACHED, not merely to work.
 *
 * `purchase-inputs.test.tsx` proves the switch renders, writes both directions and
 * hides itself where no transfer line is gated on residency — and it proved all of
 * that while every page in the product omitted the prop, so the switch existed on no
 * screen in any locale. A component test cannot see that: it supplies the prop the
 * product was missing. This is the assertion that can, and it belongs on the page
 * whose bill the answer changes by $55,000 on the Halifax benchmark.
 */
describe("Closing costs — the residency question is on the page", () => {
  it("asks it in Halifax, where a transfer line is gated on it", async () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "halifax" }));
    renderPage();
    expect(await screen.findByLabelText(/Resident of this province/)).toBeInTheDocument();
  });

  it("moves the bill when it is answered", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "halifax", price: 550000, dpPct: 10, ftb: true }),
    );
    const { container } = renderPage();
    const hero = () => container.querySelector('[data-slot="answer-figure"]')?.textContent;
    // Nova Scotia's Provincial Deed Transfer Tax for a non-resident buyer is 10% of
    // the price — the largest single charge in the dataset, and $55,000 on this one.
    const resident = hero();
    await user.click(await screen.findByLabelText(/Resident of this province/));
    expect(hero()).not.toEqual(resident);
  });

  it("does not ask it where residency changes no charge", () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "toronto" }));
    renderPage();
    // Not because Ontario has no non-resident speculation tax — the NRST is real —
    // but because it is not in the dataset, and asking a question no figure consumes
    // teaches the reader that this app's answers do not depend on its questions.
    expect(screen.queryByLabelText(/Resident of this province/)).not.toBeInTheDocument();
  });
});
