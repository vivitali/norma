import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { closingTotal } from "@/domain/engine";
import { ca } from "@/domain/rules/ca";
import { jurisdictions } from "@/domain/jurisdictions";
import { resolveInputs } from "@/lib/resolve-inputs";
import { TOOL_DEFAULTS } from "@/lib/shared-inputs";
import { CATALOGUES } from "@/test/catalogues";
import type { Locale } from "@/lib/locales";
import { languageOf, localesForCountry } from "@/i18n/countries";
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

/**
 * A BC first-time buyer of a $500,000 new build. Both PTT exemptions fully forgive the same
 * tax at this price — an exact tie, not a rival with a bigger number — per the note in
 * `credits()` in `src/domain/engine.ts`.
 */
function seedVancouverTiedNewBuild() {
  window.localStorage.setItem(
    "norma.inputs.v2",
    JSON.stringify({ jurId: "vancouver", price: 500000, ftb: true, ptype: "newbuild" }),
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
  it("leads with the closing costs, before anyone types, and keeps cash to close beside it", () => {
    renderPage();
    // Scoped to the HEAD, not counted across the document, so the assertion cannot go on passing
    // with the head deleted outright. The hero is the CLOSING COSTS — not the cash to close,
    // which is Down Payment's hero to the dollar; the cash to close is the first stat.
    const figure = document.querySelector('[data-slot="answer-figure"]')!;
    expect(figure.parentElement!.textContent).toContain("Closing costs, after the credits applied that day");
    expect(figure.parentElement!.textContent).not.toContain("Cash needed on closing day");
    const stats = [...document.querySelectorAll('[data-slot="answer-stat"]')].map(
      (el) => el.previousElementSibling?.textContent ?? "",
    );
    expect(stats[0]).toMatch(/^Cash needed on closing day/);
    expect(screen.getAllByText(/^\$[\d,]+$/).length).toBeGreaterThan(0);
  });

  it("describes the headline as the bill on top of the down payment, not as the cash to close", () => {
    // The hero EXCLUDES the down payment; the sub-line says what to add to it to get the cash.
    renderPage();
    expect(
      screen.getByText(
        "The bill on top of the down payment. Add the two for the cash you need on closing day — shown beside it.",
      ),
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

  it("leads with the costs net of closing-day credits, and the cash to close is the net stat", () => {
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "toronto", ftb: true }),
    );
    const toronto = jurisdictions.find((j) => j.id === "toronto")!;
    const expected = closingTotal(
      toronto,
      ca,
      resolveInputs({ ...TOOL_DEFAULTS, ftb: true }, toronto, ca),
    );
    // The test is only meaningful where the two differ, so the difference is
    // asserted rather than assumed: a jurisdiction with no closing-day credit
    // would make gross and net the same number and pass either way.
    expect(expected.creditsAtClosing).toBeGreaterThan(0);

    renderPage();
    const hero = document.querySelector('[data-slot="answer-figure"]')?.textContent;
    // Costs after credits, excluding the down payment; neither the gross bill nor the cash.
    expect(digits(hero)).toBe(String(Math.round(expected.net - expected.fin.down)));
    expect(digits(hero)).not.toBe(String(Math.round(expected.total)));
    expect(digits(hero)).not.toBe(String(Math.round(expected.net)));
    // The cash to close — net, never gross — is the stat the cash check is measured against.
    const cashStat = [...document.querySelectorAll('[data-slot="answer-stat"]')].find((el) =>
      el.previousElementSibling?.textContent?.startsWith("Cash needed on closing day"),
    )!;
    expect(digits(cashStat.textContent)).toBe(String(Math.round(expected.net)));
    expect(digits(cashStat.textContent)).not.toBe(String(Math.round(expected.cash)));
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
    // A bracket band at 0% (e.g. the first $30,000) is a real row inside a fee, not a fee.
    for (const el of screen.queryAllByText("$0")) {
      expect(el.parentElement!.textContent).toMatch(/on the (first|portion)/);
    }
  });

  it("shows the bracket breakdown inline, with no second show/hide toggle", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Taxes and government fees/);
    expect(screen.getAllByText(/on the first/).length).toBeGreaterThan(0);
    expect(screen.queryByRole("button", { name: /bracket breakdown|hide breakdown/i })).not.toBeInTheDocument();
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
      screen.getByText(/only one rebate here can be claimed/),
    ).toBeInTheDocument();
    expect(screen.queryByText(NONE)).not.toBeInTheDocument();
  });

  it.each(localesForCountry("en-CA"))(
    "keeps both BC PTT exemptions visible and calls them tied, not superseded, at the 500,000-dollar exact-tie price — %s",
    async (locale) => {
      // At $500,000 both exemptions forgive the identical tax — see the note in `credits()` in
      // `src/domain/engine.ts`. Neither row is dropped, and the loser is not told a rival
      // rebate was worth MORE, because it was not. One case per locale, driven off the
      // catalogue itself rather than a hand-written string per language, so a locale added
      // later is covered automatically.
      // Canadian locales only: the seed is a BC record, and a US locale would fall back to
      // Houston. The catalogue is per LANGUAGE, hence `languageOf`.
      const cc = CATALOGUES[languageOf(locale)].ClosingCosts;
      seedVancouverTiedNewBuild();
      const user = userEvent.setup();
      renderPage(locale);
      await open(user, new RegExp(cc.secCredits));

      expect(screen.getByText(cc.rebTied)).toBeInTheDocument();
      expect(screen.queryByText(cc.rebSuperseded)).not.toBeInTheDocument();
    },
  );

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
    expect(
      screen.getByText(/un seul remboursement offert ici peut être réclamé/),
    ).toBeInTheDocument();
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

describe("Closing costs — explanations that must be true where they render", () => {
  it("does not tell Manitoba it charges no transfer tax, and calls its registration fee flat", () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "winnipeg" }));
    renderPage();
    expect(screen.queryByText(/charges no transfer tax/)).not.toBeInTheDocument();
    expect(screen.queryByText(/No land transfer tax is charged here/)).not.toBeInTheDocument();
    expect(screen.getAllByText(/A flat fee, the same at every price/).length).toBe(2);
  });

  it("prints no $0 mortgage where nobody publishes a price", () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "nu" }));
    renderPage();
    expect(screen.queryByText("Mortgage amount")).not.toBeInTheDocument();
    expect(screen.queryByText("$0")).not.toBeInTheDocument();
  });
});

describe("Closing costs — nothing opens, and the assumption is named", () => {
  it("opens no section on a first visit, and opens the government fees once personalised", () => {
    renderPage();
    expect(screen.queryAllByRole("button", { expanded: true })).toHaveLength(0);
    cleanup();
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ income1: 90000 }));
    renderPage();
    expect(screen.getByRole("button", { name: /Taxes and government fees/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
  });

  it("names the assumed price in the tag and jumps to the price field", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(
      screen.getByRole("button", { name: /Assuming the typical price for Winnipeg, \$[\d,]+/ }),
    );
    expect(screen.getByLabelText("Purchase price")).toHaveFocus();
  });

  it("names the reader's price once given", () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ price: 500000 }));
    renderPage();
    expect(document.querySelector("[data-slot=answer-tag]")!.textContent).toBe(
      "Based on your price, $500,000",
    );
  });

  it("carries the id its head links to, around the inputs", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Adjust your numbers" })).toHaveAttribute("href", "#adjust");
    expect(document.getElementById("adjust")!.querySelector("#price")).not.toBeNull();
  });

  it("gives the cash stat the colour of the cash check that judges it", async () => {
    const user = userEvent.setup();
    renderPage();
    const cashStat = () =>
      [...document.querySelectorAll('[data-slot="answer-stat"]')].find((el) =>
        el.previousElementSibling?.textContent?.startsWith("Cash needed on closing day"),
      )!;
    expect(cashStat().querySelector(".text-blocked, .text-caution")).toBeNull();
    const funds = screen.getByLabelText("Funds available for this purchase");
    await user.type(funds, "1000");
    await user.tab();
    expect(cashStat().querySelector(".text-blocked")).not.toBeNull();
  });
});

describe("Closing costs — the same thing is not said twice", () => {
  it("does not open the cash panel by repeating the row's own line", async () => {
    const user = userEvent.setup();
    renderPage();
    const row = screen.getByRole("button", { name: /Do you have the cash\?/ });
    const line = "Measured against net cash at closing — after the credits that actually arrive that day.";
    expect(row.textContent).toContain(line);
    await open(user, /Do you have the cash\?/);
    const why = document.querySelector("#cash-panel > p")!.textContent!;
    expect(why).not.toBe(line);
    expect(why).not.toMatch(/Measured against net cash at closing/);
  });

  it("does not print a 'Funds available' row over a field of the same name", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Do you have the cash\?/);
    const panel = document.getElementById("cash-panel")!;
    expect(within(panel).getAllByText("Funds available for this purchase")).toHaveLength(1);
  });
});

describe("Closing costs — a US page names only what is true where it renders", () => {
  const inCity = (jurId: string) =>
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId }));

  it("does not say Texas on Seattle's page, and says the transfer tax is the seller's", async () => {
    inCity("seattle");
    const user = userEvent.setup();
    renderPage("en-US");
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    expect(document.body.textContent).not.toMatch(/Texas/);
    // Washington's REET exists; the row and its explanation say it is the seller's.
    expect(screen.getByText(/Real estate excise tax \(paid by the seller\)/)).toBeInTheDocument();
    expect(screen.getByText(/By state law it is the seller's obligation/)).toBeInTheDocument();
  });

  it("keeps Houston's page free of Washington's tax, and free of a stray claim about it", async () => {
    inCity("houston");
    const user = userEvent.setup();
    renderPage("en-US");
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    expect(document.body.textContent).not.toMatch(/REET|excise/);
  });

  it("uses the US word for the money that cannot be a deposit: a CD, not a term deposit", () => {
    inCity("seattle");
    renderPage("en-US");
    const deposit = screen.getByText(/The deposit\. Within days of an accepted offer/);
    expect(deposit.textContent).toMatch(/certificate of deposit \(CD\)/);
    expect(deposit.textContent).not.toMatch(/term deposit/);
  });

  it("keeps a Canadian page's term deposit", () => {
    renderPage();
    expect(screen.getByText(/The deposit\. Within days of an accepted offer/).textContent).toMatch(/term deposit/);
  });
});

describe("Closing costs — a tax on the CMHC premium exists only where it is charged", () => {
  it("prints no such row in Manitoba, and one where the province charges it", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.queryByText("Provincial tax on the CMHC premium")).not.toBeInTheDocument();
    cleanup();
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "saskatoon", dpPct: 5 }));
    renderPage();
    await userEvent.setup().click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByText("Provincial tax on the CMHC premium")).toBeInTheDocument();
  });
});
