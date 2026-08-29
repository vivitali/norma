import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/lib/locales";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import RentVsBuyPage from "./page";
import { FAVOURS_BUYING, FAVOURS_RENTING } from "./omissions";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: Locale = "en") =>
  renderWithIntl(
    <JurisdictionProvider>
      <RentVsBuyPage />
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

describe("Rent vs buy — the horizon decides", () => {
  it("leads with a verdict tied to a holding period, not an abstract one", () => {
    renderPage();
    expect(screen.getAllByText(/wins for your horizon/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Your horizon:/).length).toBeGreaterThan(0);
  });

  it("shows the verdict at several holding periods, not just one", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The verdict/);
    const table = screen.getAllByRole("table")[0];
    expect(table.querySelectorAll("tbody tr").length).toBe(6);
  });

  it("flips the verdict on the rent being compared against", async () => {
    // The comparison has to be sensitive to the one input it is ABOUT. At the
    // placeholder rent for this city the numbers favour renting and there is no
    // break-even inside forty years; against a rent twice as high, buying pulls
    // ahead within a few years. A page that answered the same either way would
    // be decoration.
    const user = userEvent.setup();
    renderPage();
    expect(screen.getAllByText(/Renting wins/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/never pulls ahead/).length).toBeGreaterThan(0);

    const rent = screen.getByLabelText("Rent you are comparing against, monthly");
    await user.clear(rent);
    await user.type(rent, "3200");
    await user.tab();

    expect(screen.getAllByText(/Buying wins/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/never pulls ahead/)).not.toBeInTheDocument();
  });

  it("signs the advantage column instead of printing its absolute value", async () => {
    // The header says "Advantage of buying". Printing Math.abs meant a row where
    // buying TRAILS by $648,135 read as an advantage OF $648,135 -- a wrong
    // number under a correct label, which is worse than either alone.
    const user = userEvent.setup();
    renderPage();
    await open(user, /The verdict/);
    const table = screen.getAllByRole("table")[0];
    const advantages = [...table.querySelectorAll("tbody tr")].map(
      (tr) => tr.children[3].textContent ?? "",
    );
    // On the placeholder figures buying never pulls ahead, so every row is negative.
    expect(advantages.every((v) => v.includes("−"))).toBe(true);
  });

  it("marks the reader's own horizon among the rows that are not theirs", async () => {
    // Six holding periods, one of which answers the question actually asked.
    const user = userEvent.setup();
    renderPage();
    await open(user, /The verdict/);
    const current = [...screen.getAllByRole("table")[0].querySelectorAll("tbody tr")].filter(
      (tr) => tr.getAttribute("aria-current") === "true",
    );
    expect(current).toHaveLength(1);
    expect(current[0].textContent).toContain("10 years");

    // And it follows the control rather than being pinned to the default.
    const horizon = within(
      screen.getByRole("radiogroup", { name: "How long you expect to stay" }),
    );
    await user.click(horizon.getByRole("radio", { name: "25 years" }));
    const moved = [...screen.getAllByRole("table")[0].querySelectorAll("tbody tr")].filter(
      (tr) => tr.getAttribute("aria-current") === "true",
    );
    expect(moved).toHaveLength(1);
    expect(moved[0].textContent).toContain("25 years");
  });

  it("respects the horizon control", async () => {
    // Scoped to the holding group: amortization offers "25 years" too, and an
    // unscoped query silently picks whichever comes first in the DOM.
    const user = userEvent.setup();
    renderPage();
    const horizon = within(
      screen.getByRole("radiogroup", { name: "How long you expect to stay" }),
    );
    await user.click(horizon.getByRole("radio", { name: "3 years" }));
    expect(screen.getAllByText(/Your horizon: 3 years/).length).toBeGreaterThan(0);
  });
});

describe("Rent vs buy — the flat-market counterweight", () => {
  it("says whether a winning buy verdict survives appreciation being switched off", async () => {
    // The one question the headline cannot carry: is buying winning on shelter
    // costs, or only on a forecast of the housing market? The caveat only exists
    // on the buyWins path, so the test has to drive the page there first --
    // accepting "Renting wins" as a pass made this assert nothing at all.
    const user = userEvent.setup();
    renderPage();
    const rent = screen.getByLabelText("Rent you are comparing against, monthly");
    await user.clear(rent);
    await user.type(rent, "3200");
    await user.tab();

    expect(screen.getAllByText(/Buying wins/).length).toBeGreaterThan(0);
    const text = document.body.textContent ?? "";
    expect(/appreciation switched off|depends on appreciation/.test(text)).toBe(true);
  });

  it("frames the appreciation switch as a forecast, not a setting", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /Where you end up/);
    expect(screen.getByText(/forecasting the housing market/)).toBeInTheDocument();
  });
});

describe("Rent vs buy — what the model leaves out", () => {
  it("names the omissions on both sides, rather than only the ones that flatter buying", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /What is not captured/);
    expect(screen.getAllByText(/these favour buying/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/these favour renting/).length).toBeGreaterThan(0);
    // On the collapsed row too. The line named only the buying side, so a
    // reader who never opened this came away believing every omission favours
    // buying — the opposite of what the section is for.
    //
    // The counts are asserted against the arrays rather than against literals:
    // the sentence is generated from them, so a hardcoded "4" here would pass
    // while the copy silently drifted out of step with the list it describes.
    const row = screen.getByRole("button", { name: /What is not captured/ });
    expect(row.textContent).toContain(`${FAVOURS_BUYING.length} favour buying`);
    expect(row.textContent).toContain(`${FAVOURS_RENTING.length} favour renting`);
    expect(screen.getByText(/Concentration risk/)).toBeInTheDocument();
    expect(screen.getByText(/Forced savings/)).toBeInTheDocument();
  });
});

describe("Rent vs buy — an absent break-even is a finding, not a blank", () => {
  it("puts the answer in the stat's value instead of a dash with a note beside it", () => {
    // "Buying pulls ahead — · Buying never pulls ahead within 40 years" read as
    // a rendering fault: an em-dash where the figure goes, and a note that
    // contradicted the label above it. `note` is a short qualifier, never the
    // answer. At the placeholder rent for this city there is no break-even.
    renderPage();
    // Innermost match: getAllByText matches ancestors too, in document order.
    const label = screen.getAllByText(/Buying pulls ahead/).at(-1)!;
    const stat = label.parentElement!;
    // The short form, because the value slot is 22px and whitespace-nowrap.
    // The full sentence still carries the same fact in the chart caption, where
    // there is room for it.
    expect(stat.textContent).toContain("Not within 40 years");
    expect(stat.textContent).not.toContain("—");
  });

  it("leaves the verdict row's figure empty rather than dashing it", () => {
    // The figure slot is whitespace-nowrap and cannot carry the sentence that
    // says there is no break-even, so it carries nothing — the contract's
    // marker for a section with no single number.
    renderPage();
    const row = screen.getByRole("button", { name: /The verdict/ });
    expect(row.textContent).not.toContain("—");
    expect(row.textContent).toMatch(/Your horizon: \d+ years/);
  });

  it("names the winning side and the horizon it wins at", () => {
    // The line was the single word "Buy" or "Rent", which said less than the
    // figure beside it. The advantage is only true at a stated horizon.
    renderPage();
    const row = screen.getByRole("button", { name: /Where you end up/ });
    expect(row.textContent).toMatch(/Rent · at year 10/);
  });
});

describe("Rent vs buy — French", () => {
  it("renders in French without leaking a message key, in every section", async () => {
    // Expanded first, deliberately. A missing ICU parameter makes next-intl
    // render the raw key, and a collapsed page hides every section where that
    // can happen -- which is exactly where Amortization.altText was hiding.
    const user = userEvent.setup();
    renderPage("fr");
    await user.click(screen.getByRole("button", { name: "Tout ouvrir" }));
    expect(document.body.textContent).not.toMatch(/RentVsBuy\./);
  });
});

describe("the rent placeholder names the jurisdiction the way a reader writes it", () => {
  it("renders the translated jurisdiction name, not the lowercase record key", () => {
    // `jurisdiction.city` is the record key ("winnipeg"), and it used to reach the reader raw.
    // sources-content.tsx had already hit this and resolved it via the Jurisdictions namespace;
    // this asserts the same page does. Regression guard, not a style preference: it became more
    // visible when the territorial records gained a `city`, because the old
    // `city ?? prov` fallback had been hiding it behind "YT".
    renderPage();
    expect(screen.getByText(/Typical for Winnipeg/)).toBeInTheDocument();
    expect(screen.queryByText(/Typical for winnipeg/)).not.toBeInTheDocument();
  });
});

describe("Rent vs buy — it will not compare against a rent nobody published", () => {
  /**
   * Six jurisdiction records carry no rent: CMHC suppresses every Yukon cell and does
   * not survey Nunavut. The fallback behind them is a national placeholder — nobody's
   * rent, and least of all this place's — and this page had been printing a verdict
   * against it while the field UNDER the verdict called it "typical for New Brunswick".
   *
   * New Brunswick is the record that isolates the rent: it publishes both benchmark
   * prices, so the price is real and the rent is the only thing missing.
   */
  const inNewBrunswick = () =>
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "nb" }));

  it("asks for the rent instead of naming a verdict", () => {
    inNewBrunswick();
    renderPage();
    expect(screen.getByText(/Nobody publishes a rent for New Brunswick/)).toBeInTheDocument();
    expect(screen.queryByText(/wins for your horizon/)).not.toBeInTheDocument();
  });

  it("never calls a rent typical for the place that did not publish it", () => {
    inNewBrunswick();
    renderPage();
    expect(screen.queryByText(/Typical for New Brunswick/)).not.toBeInTheDocument();
    expect(screen.getByText(/No published rent for New Brunswick/)).toBeInTheDocument();
    // And it suggests nothing in the field either: a placeholder IS a suggestion.
    expect(screen.getByLabelText("Rent you are comparing against, monthly")).toHaveValue("");
    expect(
      screen.getByLabelText("Rent you are comparing against, monthly"),
    ).not.toHaveAttribute("placeholder", expect.stringContaining("1"));
  });

  it("compares in full once the reader gives their own rent", async () => {
    inNewBrunswick();
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Rent you are comparing against, monthly"), "1650");
    await user.tab();
    expect(screen.getAllByText(/wins for your horizon/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Nobody publishes a rent/)).not.toBeInTheDocument();
  });

  it("keeps the city's own rent where the survey does publish one", () => {
    // The tag is not deleted, it is made true: Toronto's rent IS a published figure.
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "toronto" }));
    renderPage();
    expect(screen.getByText(/Typical for Toronto/)).toBeInTheDocument();
  });
});

describe("Rent vs buy — the money the model spends and never showed", () => {
  it("prints the selling cost it nets off equity, as a dollar amount", async () => {
    // `equity = homeValue * (1 - sellingCost) - balance` is the largest single
    // one-time figure in the model, and it appeared nowhere: `cEquity` said "net
    // of selling cost" and `wealthWhy` said it again, while the omissions list
    // one section down claimed selling costs were NOT captured. Two of those
    // three statements were true and the reader had no way to tell which.
    const user = userEvent.setup();
    renderPage();
    await open(user, /Where you end up/);
    // A regex, not the exact string: a PanelRow's label span also contains the
    // provenance mark, so its textContent is "Cost of sellingEstimate".
    const row = screen.getByText(/^Cost of selling/).parentElement!;
    expect(row.textContent).toMatch(/\$[\d,]+/);
  });

  it("prints the two owner costs it charges every year", async () => {
    // propTax, insurance, utilities and maintenance are on every row of the
    // schedule and none was rendered. Maintenance is the acute one -- 1% of value
    // is close to a thousand dollars a month on a $1.2M home, and it showed up
    // only inside a collapsed caveat about it possibly being too low.
    const user = userEvent.setup();
    renderPage();
    await open(user, /What each costs each year/);
    for (const label of [/^Property tax/, /^Maintenance reserve/]) {
      const row = screen.getByText(label).parentElement!;
      expect(row.textContent).toMatch(/\$[\d,]+/);
    }
  });

  it("does not add a utilities row, which would be mislabelled on a condo", async () => {
    // engine.ts folds the condo fee into the `utilities` figure, so a row using
    // the page's own "Utilities and heat" wording would be a wrong label over a
    // right number wherever a strata fee is set.
    const user = userEvent.setup();
    renderPage();
    await open(user, /What each costs each year/);
    // Once, as the field's own label further down the page -- never a second
    // time as a row in this panel.
    expect(screen.getAllByText(/Utilities and heat/)).toHaveLength(1);
  });
});

describe("Rent vs buy — the assumptions name their own rates", () => {
  it("shows what each appreciation and return tier selects", () => {
    // Six rates drive the verdict and not one of them was on the page, while
    // federal.ts's own note says the three tiers exist "so the reader can see
    // how much the answer depends on it".
    renderPage();
    expect(screen.getByText(/Inflation 2\.1% a year/)).toBeInTheDocument();
    expect(screen.getByText(/shelter growth 3\.1%/)).toBeInTheDocument();
    expect(screen.getByText(/Cash 2\.4% a year/)).toBeInTheDocument();
    expect(screen.getByText(/growth 5\.8%/)).toBeInTheDocument();
  });

  it("marks them as estimates rather than rules", () => {
    // They are conf: "assumption" in federal.ts. Showing them IS the disclosure,
    // but only if the mark says which kind of figure they are.
    renderPage();
    const note = screen.getByText(/Inflation 2\.1% a year/);
    expect(within(note).getByRole("link").getAttribute("href")).toMatch(/\/sources/);
  });
});

describe("Rent vs buy — breaking the mortgage early", () => {
  it("names the prepayment penalty, without pricing it", async () => {
    // The horizon control opens at three years against a five-year default term
    // -- precisely the case that breaks a mortgage mid-term -- and nothing in the
    // product mentioned a penalty, an IRD or a discharge. It stays qualitative:
    // every lender computes the differential differently, which is the point.
    const user = userEvent.setup();
    renderPage();
    await open(user, /What is not captured/);
    const bullet = screen.getByText(/prepayment penalty/);
    expect(bullet).toBeInTheDocument();
    expect(bullet.textContent).not.toMatch(/\$|%/);
  });
});
