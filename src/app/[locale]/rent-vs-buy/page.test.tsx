import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/lib/locales";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { getJurisdiction } from "@/domain/jurisdictions";
import RentVsBuyPage from "./page";
import { FAVOURS_BUYING, FAVOURS_RENTING } from "./omissions";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: Locale = "en-CA") =>
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

/**
 * A CONDO, deliberately, in every test that expects a verdict.
 *
 * Every rent in the dataset is a CMHC two-bedroom apartment average, so it can
 * answer a condo purchase and nothing else. On the default `ptype: "house"` this
 * page now asks for a rent rather than weighing a detached house against an
 * apartment — the state the last describe block below covers.
 */
function seedAnswerable(extra: Record<string, unknown> = {}) {
  // A house WITH a rent the reader supplied. This is the state these tests were
  // always about — the default jurisdiction is Winnipeg, so a $454,264 house
  // weighed against $1,570 a month — except that the rent used to arrive
  // silently from CMHC's two-bedroom APARTMENT survey. Stating it here changes
  // nothing these tests observe and everything about whether the page was
  // entitled to assume it.
  window.localStorage.setItem(
    "norma.inputs.v2",
    JSON.stringify({ ptype: "house", rent: 1570, ...extra }),
  );
}

/**
 * A section's own subtree.
 *
 * `SectionRow` renders every body into the DOM and hides the closed ones with the
 * `hidden` attribute, which `getByText` does not filter on — so once the calc
 * section renders the same labels the panels above it use ("Cost of selling",
 * "Property tax"), an unscoped query matches both. Scope to the section under
 * test rather than reaching for `getAllByText(...)[0]`, which would pass for the
 * wrong reason the moment the order changed.
 */
function panel(id: string) {
  return within(document.getElementById(id)!);
}

/**
 * A rent low enough that buying never pulls ahead within forty years at Winnipeg's benchmark.
 * These tests used to get that case from the city's defaults; the 2026-09-28 re-verification
 * (August prices, the $1,600 Homeowners Affordability Tax Credit) moved the default break-even
 * inside forty years, so the case is now seeded explicitly rather than inherited by accident.
 */
const seedRentingAlwaysWins = () =>
  window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ rent: 1100 }));

beforeEach(() => {
  window.localStorage.clear();
  seedAnswerable();
});

describe("Rent vs buy — the horizon decides", () => {
  it("leads with a verdict tied to a holding period, not an abstract one", () => {
    renderPage();
    expect(screen.getAllByText(/wins at year \d+/).length).toBeGreaterThan(0);
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
    // The comparison has to be sensitive to the one input it is ABOUT. At a low
    // rent the numbers favour renting and there is no break-even inside forty
    // years; against a rent roughly three times as high, buying pulls ahead within
    // a few years. A page that answered the same either way would be decoration.
    const user = userEvent.setup();
    seedRentingAlwaysWins();
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
    seedRentingAlwaysWins();
    renderPage();
    await open(user, /The verdict/);
    const table = screen.getAllByRole("table")[0];
    const advantages = [...table.querySelectorAll("tbody tr")].map(
      (tr) => tr.children[3].textContent ?? "",
    );
    // At the seeded rent buying never pulls ahead, so every row is negative.
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
    // answer. At the seeded low rent there is no break-even.
    seedRentingAlwaysWins();
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
    renderPage("fr-CA");
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
    // A CONDO with no stored rent: the only state in which the page offers the
    // city's published figure as a placeholder at all, now that an apartment
    // average is not allowed to stand in for a house.
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ ptype: "condo" }));
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
    expect(screen.queryByText(/wins at year \d+/)).not.toBeInTheDocument();
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
    expect(screen.getAllByText(/wins at year \d+/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/Nobody publishes a rent/)).not.toBeInTheDocument();
  });

  it("keeps the city's own rent where the survey does publish one", () => {
    // The tag is not deleted, it is made true: Toronto's rent IS a published figure.
    // For a CONDO, which is the purchase a two-bedroom apartment average can price.
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "toronto", ptype: "condo" }));
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
    const row = panel("wealth").getByText(/^Cost of selling/).parentElement!;
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
      const row = panel("outlay").getByText(label).parentElement!;
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


describe("Rent vs buy — an apartment rent cannot price a house", () => {
  // PINNED ASSERTION CHANGED (decision 4): a house at an apartment-basis published rent used to
  // open on an ASK with no verdict. It now answers on arrival, using the published apartment rent
  // as a clearly LABELLED default, and asks for the reader's own rent in place. The rule it
  // preserves is unchanged and is asserted below for the places nobody publishes a rent.
  it("answers a house on arrival with the published apartment rent, labelled as such", () => {
    // Toronto publishes a rent — CMHC's two-bedroom apartment average — and prices a
    // detached house beside it.
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "toronto", ptype: "house" }));
    renderPage();
    expect(screen.getAllByText(/wins at year \d+/).length).toBeGreaterThan(0);
    expect(screen.getByText("Uses CMHC’s apartment rent")).toBeInTheDocument();
    expect(screen.getByText(/CMHC’s average two-bedroom apartment rent for Toronto/)).toBeInTheDocument();
    expect(screen.getByText(/not what a house like the one above would rent for/)).toBeInTheDocument();
  });

  it("keeps asking for the reader's own rent in place, and typing replaces the default", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "toronto", ptype: "house" }));
    renderPage();
    const inline = document.getElementById("rent-inline") as HTMLInputElement;
    expect(inline.placeholder.replace(/[^\d]/g, "")).toBe(String(getJurisdiction("toronto")!.rent));
    await user.type(inline, "4200");
    await user.tab();
    expect(screen.queryByText("Uses CMHC’s apartment rent")).not.toBeInTheDocument();
    expect(document.getElementById("rent-inline")).toBeNull();
  });

  it("does not offer a labelled default where nobody publishes a rent", () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "yt", ptype: "condo" }));
    renderPage();
    expect(screen.queryByText("Uses CMHC’s apartment rent")).not.toBeInTheDocument();
    expect(document.getElementById("rent-inline")).toBeNull();
  });

  it("answers again as soon as the reader gives a rent of their own", () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ ptype: "house", rent: 4200 }));
    renderPage();
    expect(screen.getAllByText(/wins at year \d+/).length).toBeGreaterThan(0);
  });

  it("still answers for a condo, which is the purchase an apartment rent can price", () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ ptype: "condo" }));
    renderPage();
    expect(screen.getAllByText(/wins at year \d+/).length).toBeGreaterThan(0);
  });
});

describe("Rent vs buy — showing the work", () => {
  it("derives the headline at the reader's own horizon, not an abstract year", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /How this was calculated/);
    const calc = panel("calc");
    expect(calc.getByText(/Year 10 — how this figure was built/)).toBeInTheDocument();
  });

  it("shows the operands that make up the equity figure, in the order the engine uses", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /How this was calculated/);
    const calc = panel("calc");
    // Home value, less the cost of selling, less what is still owed.
    // getAllByText: several of these labels are BOTH a trace line and a ledger
    // column header, which is correct — the same figure, once derived and once
    // per year.
    for (const label of [/^Home value/, /^Cost of selling/, /^Mortgage balance/, /^Home equity/]) {
      expect(calc.getAllByText(label).length).toBeGreaterThan(0);
    }
  });

  it("reconciles: the trace's last line IS the figure in the hero", async () => {
    // The whole point of a trace. One that did its own arithmetic could agree
    // with itself while disagreeing with the answer above it, so every line here
    // reads off the same `result` the verdict does.
    const user = userEvent.setup();
    renderPage();
    await open(user, /How this was calculated/);
    const calc = panel("calc");
    // The `<dt>` holding the label and the `<dd>` immediately after it holding the
    // value — not `parentElement.textContent`, which sweeps up the operator gutter
    // and would go on passing on a row whose figure had gone missing entirely.
    const term = calc.getByText(/^Difference/).closest("dt")!;
    const value = term.nextElementSibling!.textContent!.trim();
    // It IS the hero. A trace that recomputed could agree with itself while
    // disagreeing with the answer above it, which is the one failure this cannot have.
    const hero = document.querySelector('[data-slot="answer-figure"]')!.textContent!.trim();
    // The hero is unsigned — the head says which side wins — so compare the digits,
    // then assert the sign separately: renting wins on the seeded figures.
    expect(value.replace(/^−\s?/, "")).toBe(hero);
    expect(value).toMatch(/^−/);
  });

  it("prints a row for every year the model runs, not a sample of them", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /How this was calculated/);
    const table = panel("calc").getByRole("table");
    expect(table.querySelectorAll("tbody tr")).toHaveLength(40);
  });

  it("marks the reader's own horizon in the ledger", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /How this was calculated/);
    const rows = [...panel("calc").getByRole("table").querySelectorAll("tbody tr")];
    // Year 10 is the default holding period; its row header carries the accent.
    expect(rows[9].querySelector("th")?.className).toMatch(/text-ac/);
  });

  it("carries the rate in the ledger, so a renewal is visible where it lands", async () => {
    // A5 and A1 together: the page honours the reader's own rate and re-prices at
    // each term boundary. Neither is legible unless the rate is on the row.
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ ptype: "house", rent: 1570, termYears: 5, renewalRate: 7 }),
    );
    const user = userEvent.setup();
    renderPage();
    await open(user, /How this was calculated/);
    const rows = [...panel("calc").getByRole("table").querySelectorAll("tbody tr")];
    const rateOf = (i: number) => rows[i].children[1].textContent;
    // Year 5 is still on the opening rate; year 6 opens the second term at 7%.
    expect(rateOf(4)).not.toBe(rateOf(5));
    expect(rateOf(5)).toMatch(/7\.00/);
  });
});

describe("Rent vs Buy — the trace is real arithmetic and the chart marks the horizon", () => {
  it("ends in Buying − Renting = Difference, with Renting as its own subtotal", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /How this was calculated/);
    const calc = panel("calc");
    const labels = calc.getAllByRole("term").map((dt) => dt.textContent ?? "");
    const tail = labels.slice(-4);
    expect(tail[0]).toMatch(/Renting/);
    expect(tail[1]).toMatch(/Buying/);
    expect(tail[2]).toMatch(/Renting/);
    expect(tail[3]).toMatch(/Difference/);
  });

  it("keys the horizon rule in the chart legend", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The verdict/);
    expect(screen.getAllByText(/Your horizon: 10 years/).length).toBeGreaterThan(1);
  });
});

describe("Rent vs buy — round 3: one rent field, a named comparator, a horizon that is not asserted", () => {
  const seedDefaultHouse = (extra: Record<string, unknown> = {}) =>
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ ptype: "house", ...extra }));

  it("never shows two fields with the rent's name while the in-place ask stands", () => {
    seedDefaultHouse();
    renderPage();
    expect(screen.getAllByLabelText("Rent you are comparing against, monthly")).toHaveLength(1);
    expect(document.getElementById("rent-inline")).not.toBeNull();
    expect(document.getElementById("rent")).toBeNull();
    // ...and the inputs block says where the rent is, with a way back to it.
    expect(within(document.getElementById("adjust")!).getByText(/Compared against \$[\d,]+ a month/)).toBeInTheDocument();
  });

  it("brings the rent field back into the inputs block once the reader types their own", async () => {
    seedDefaultHouse();
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Rent you are comparing against, monthly"), "1650");
    await user.tab();
    expect(screen.getAllByLabelText("Rent you are comparing against, monthly")).toHaveLength(1);
    expect(document.getElementById("rent")).not.toBeNull();
  });

  it("names the apartment rent as the comparator while it is the default for a house", () => {
    seedDefaultHouse();
    renderPage();
    expect(screen.getByText(/two-bedroom apartment rent, not a rent for a house/)).toBeInTheDocument();
  });

  it("says what the figures cover, not what the reader plans, unless they set the horizon", () => {
    seedDefaultHouse();
    const { unmount } = renderPage();
    expect(screen.getAllByText(/Over a 10-year stay/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/You plan to stay/)).not.toBeInTheDocument();
    unmount();
    seedDefaultHouse({ holding: 5 });
    renderPage();
    expect(screen.getAllByText(/You plan to stay 5 years/).length).toBeGreaterThan(0);
  });

  it("opens no section on a first visit, and the verdict once the reader has given something", () => {
    seedDefaultHouse();
    const { unmount } = renderPage();
    for (const button of screen.getAllByRole("button", { name: /^The verdict|Where you end up|What each costs/ })) {
      expect(button).toHaveAttribute("aria-expanded", "false");
    }
    unmount();
    seedDefaultHouse({ rent: 1800 });
    renderPage();
    expect(screen.getByRole("button", { name: /^The verdict/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("names the assumption in the tag and offers the way to replace it", () => {
    seedDefaultHouse();
    renderPage();
    expect(screen.getByRole("button", { name: /Uses CMHC.s apartment rent/ })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Adjust your numbers" })).toBeInTheDocument();
    expect(document.getElementById("adjust")).not.toBeNull();
  });

  it("labels the outlay figures with their year", async () => {
    seedAnswerable();
    const user = userEvent.setup();
    renderPage();
    await open(user, /What each costs each year/);
    expect(panel("outlay").getByText(/In year 10, the horizon assumed/)).toBeInTheDocument();
    expect(panel("outlay").getByText(/Owner outlay in year \d+, the payoff year/)).toBeInTheDocument();
  });

  it("scrolls the verdict table as a keyboard-reachable region and drops the wealth columns on a phone", async () => {
    seedAnswerable();
    const user = userEvent.setup();
    renderPage();
    await open(user, /^The verdict/);
    const region = screen.getByRole("region", { name: "The verdict by holding period" });
    expect(region).toHaveAttribute("tabindex", "0");
    for (const name of ["Buy wealth", "Rent wealth"]) {
      expect(within(region).getByRole("columnheader", { name })).toHaveClass("hidden", "sm:table-cell");
    }
    for (const name of ["Advantage of buying", "Winner"]) {
      expect(within(region).getByRole("columnheader", { name })).not.toHaveClass("hidden");
    }
  });
});

describe("Rent vs buy — Seattle's REET is the seller's, and the sale deducts it", () => {
  it("shows the excise tax as its own row in the sale derivation, and not in Houston's", async () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "seattle", rent: 2600 }));
    const user = userEvent.setup();
    const { unmount } = renderPage("en-US");
    await open(user, /Where you end up/);
    expect(panel("wealth").getByText("Excise tax on the sale, paid by the seller")).toBeInTheDocument();
    unmount();
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "houston", rent: 2200 }));
    renderPage("en-US");
    await open(user, /Where you end up/);
    expect(panel("wealth").queryByText("Excise tax on the sale, paid by the seller")).not.toBeInTheDocument();
  });
});

/**
 * Reads the calc trace as the arithmetic it claims to be: a line with no operator starts a sum,
 * "+" and "−" lines move it, and every "=" line must equal it — within a dollar per operand,
 * since each line is rounded for display. An operand the engine nets but the page does not
 * show (the US tax on investment gains, before it was reported) fails here.
 */
function assertTraceAddsUp() {
  const calc = document.getElementById("calc-panel")!;
  const lines = [...calc.querySelector("dl")!.children].map((row) => ({
    op: row.querySelector("dt > span[aria-hidden]")!.textContent!.trim(),
    // Less the screen-reader copy of the operator, which leads the label cell.
    label: row.querySelector("dt > span.min-w-0")!.textContent!.replace(/^[+\u2212\u00d7\u00f7=] /, ""),
    value: Number(
      row.querySelector("dd")!.textContent!.replace(/[\u2212-]/, "-").replace(/[^\d-]/g, ""),
    ),
  }));
  let acc = 0;
  let operands = 0;
  const checked: string[] = [];
  for (const line of lines) {
    if (line.op === "") {
      acc = line.value;
      operands = 1;
    } else if (line.op === "+") {
      acc += line.value;
      operands += 1;
    } else if (line.op === "\u2212") {
      acc -= line.value;
      operands += 1;
    } else if (line.op === "=") {
      expect(Math.abs(acc - line.value), `${line.label}: ${acc} vs ${line.value}`).toBeLessThanOrEqual(operands);
      checked.push(line.label);
      acc = line.value;
      operands = 1;
    }
  }
  return checked;
}

describe("Rent vs buy — the calc trace adds up", () => {
  it("US, with a home-sale gain above the exclusion: every tax the answer nets is a line", async () => {
    // A $2,000,000 Houston home held 40 years gains far more than the federal exclusion, and
    // both sides' portfolios grow enough to owe tax on their gains.
    const user = userEvent.setup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "houston", price: 2000000, holding: 40, rent: 2500 }),
    );
    renderPage("en-US");
    await user.click(screen.getByRole("button", { name: /Expand all/ }));
    const calc = within(document.getElementById("calc-panel")!);
    expect(calc.getByText("Tax on the gain above the home-sale exclusion")).toBeInTheDocument();
    expect(calc.getAllByText("Tax on investment gains").length).toBeGreaterThan(0);
    // The same figure in the panel above, where the reader meets it first.
    const wealth = within(document.getElementById("wealth-panel")!);
    expect(wealth.getByText("Tax on the gain above the home-sale exclusion")).toBeInTheDocument();
    expect(assertTraceAddsUp()).toEqual(["Home equity, net of selling cost", "Buying", "Renting", "Difference"]);
  });

  it("US, with the gain inside the exclusion: no home-sale tax line, and still adds up", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "houston", price: 300000, holding: 10, rent: 2000 }),
    );
    renderPage("en-US");
    await user.click(screen.getByRole("button", { name: /Expand all/ }));
    expect(screen.queryByText("Tax on the gain above the home-sale exclusion")).toBeNull();
    expect(assertTraceAddsUp().length).toBe(4);
  });

  it("Canada: no US tax lines, and still adds up", async () => {
    const user = userEvent.setup();
    seedAnswerable();
    renderPage("en-CA");
    await user.click(screen.getByRole("button", { name: /Expand all/ }));
    expect(screen.queryByText("Tax on the gain above the home-sale exclusion")).toBeNull();
    expect(screen.queryByText("Tax on investment gains")).toBeNull();
    expect(assertTraceAddsUp().length).toBe(4);
  });
});
