import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/lib/locales";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { getJurisdiction } from "@/domain/jurisdictions";
import AffordabilityPage from "./page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: Locale = "en-CA") =>
  renderWithIntl(
    <JurisdictionProvider>
      <AffordabilityPage />
    </JurisdictionProvider>,
    { locale },
  );

const SECTIONS = ["Approval", "Comfort", "Cash", "The gap", "The math, line by line"];

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  window.location.hash = "";
});

describe("Affordability — the answer comes first", () => {
  it("leads with a real figure before any input is touched", () => {
    // The comfortable price is the hero: it is the answer, at the scale of an
    // answer, and it is on screen before anyone types.
    renderPage();
    expect(screen.getAllByText(/^\$[\d,]+$/).length).toBeGreaterThan(0);
  });

  it("names the assumptions behind the untouched answer, then hands the tag over", async () => {
    // "Typical for your city" was false twice over. The hero is driven by
    // DEFAULT_COMFORT_CEILING, DEFAULT_INSURANCE_ANNUAL and DEFAULT_UTILITIES —
    // national prototype carry-overs that no city derived and no publisher
    // produced — so the tag claimed a provenance the figure does not have and
    // attached it to a place that had nothing to do with it.
    //
    // Asserted on the FIGURES rather than the sentence: what the tag has to do is
    // name the two assumptions the reader can act on, and both are read off the
    // resolved inputs so a translator cannot pin a stale one into the copy.
    const user = userEvent.setup();
    renderPage();
    // The tag is the one leaf naming BOTH assumptions. Matched that way rather
    // than by its wording, and rather than by /\$75,000/ alone — the qualifying
    // income row in the open approval panel carries that figure too.
    const tag = screen.getAllByText(
      (_, el) =>
        el?.children.length === 0 &&
        (el.textContent ?? "").includes("$75,000") &&
        (el.textContent ?? "").includes("$2,700"),
    );
    expect(tag, "the tag names the income and the budget it assumed").toHaveLength(1);
    const income = screen.getByLabelText("Applicant 1, gross annual");
    await user.clear(income);
    await user.type(income, "95000");
    await user.tab();
    expect(screen.getByText("Your numbers")).toBeInTheDocument();
  });

  it("shows the three secondary figures beside the answer", () => {
    renderPage();
    for (const label of ["Lender ceiling", "True all-in monthly", "Cash needed at closing"]) {
      expect(screen.getAllByText(label).length, label).toBeGreaterThan(0);
    }
  });
});

describe("Affordability — one disclosure gesture", () => {
  it("renders all five sections, checks and derivation alike, in one list", () => {
    // The whole thesis of v2: the gap and the math are reached by the same
    // gesture as a check, so there is nothing else to learn.
    renderPage();
    for (const name of SECTIONS) {
      expect(screen.getByRole("button", { name: new RegExp(name) }), name).toBeInTheDocument();
    }
  });

  it("opens exactly the section that decided the answer, and no other", () => {
    // The marking IS being open. Every closed row looked alike, so the section
    // whose check produced the verdict was indistinguishable from the four that
    // decided nothing — and PRODUCT.md's fourth principle, that the binding
    // constraint is the insight, sat behind a caret. On the placeholder figures
    // a lender declines, so Approval is the deciding section.
    renderPage();
    const open = SECTIONS.filter(
      (name) =>
        screen.getByRole("button", { name: new RegExp(name) }).getAttribute("aria-expanded") ===
        "true",
    );
    expect(open).toEqual(["Approval"]);
  });

  it("lets the reader close the section that opened itself", async () => {
    // A default the reader cannot dismiss is chrome. An explicit click wins in
    // both directions, for the rest of the session.
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /Approval/ }));
    expect(screen.getByRole("button", { name: /Approval/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("opens one section in place, leaving the others closed", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /Comfort/ }));
    expect(screen.getByRole("button", { name: /Comfort/ })).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("button", { name: /The gap/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("offers to expand until there is nothing left to expand", async () => {
    // Keyed off ALL sections, not any: with one open on arrival, an any-test made
    // the control read "Collapse all" on first paint, offering to undo something
    // the reader had not done.
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByRole("button", { name: "Expand all" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getByRole("button", { name: "Collapse all" })).toBeInTheDocument();
  });

  it("reaches the derivation with the same gesture as a check", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /The math, line by line/ }));
    expect(screen.getByText("What a lender would approve")).toBeVisible();
    expect(screen.getByText("What you could comfortably carry")).toBeVisible();
  });

  it("opens and collapses everything from one control", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    for (const name of SECTIONS) {
      expect(screen.getByRole("button", { name: new RegExp(name) })).toHaveAttribute(
        "aria-expanded",
        "true",
      );
    }
    await user.click(screen.getByRole("button", { name: "Collapse all" }));
    expect(screen.getByRole("button", { name: /Approval/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("has no depth control and no jump rail", () => {
    // Both were deleted, not hidden. Four mechanisms became one.
    renderPage();
    expect(screen.queryByRole("radiogroup", { name: /Detail/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("navigation", { name: /Jump to/ })).not.toBeInTheDocument();
  });
});

describe("Affordability — deep links", () => {
  it("opens the section the hash names", async () => {
    window.location.hash = "#comfort";
    renderPage();
    expect(await screen.findByRole("button", { name: /Comfort/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: /Approval/ })).toHaveAttribute("aria-expanded", "false");
  });

  it("is inert for an unknown hash", () => {
    window.location.hash = "#not-a-section";
    renderPage();
    expect(screen.getByRole("button", { name: /Comfort/ })).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Affordability — the unanswered cash check", () => {
  it("still shows the cash required, and asks for the one field it wants", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /Cash/ }));
    expect(screen.getByText("Net cash at closing, after credits applied that day")).toBeVisible();
    expect(screen.getByLabelText("Funds available")).toBeVisible();
  });

  it("calls a cash shortfall short, not over", async () => {
    // "over" is the comfort word — money you are spending past a ceiling. A cash
    // gap is money you do not have yet, and the two are not the same fact.
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /Cash/ }));
    const funds = screen.getByLabelText("Funds available");
    await user.type(funds, "1000");
    await user.tab();
    const cash = screen.getByRole("button", { name: /Cash/ });
    expect(cash.textContent).toMatch(/short/);
    expect(cash.textContent).not.toMatch(/over/);
  });

  it("never reports shortCash while funds are unknown", () => {
    renderPage();
    expect(
      screen.queryByText("You have enough income, but not yet enough cash to close."),
    ).not.toBeInTheDocument();
  });
});

describe("Affordability — inputs", () => {
  it("groups the controls under four labelled headings", () => {
    renderPage();
    for (const name of ["Income", "Monthly debts", "The purchase", "Your limits"]) {
      expect(screen.getByRole("group", { name })).toBeInTheDocument();
    }
  });

  it("splits debts into four named fields", () => {
    renderPage();
    for (const label of [
      "Car loan or lease",
      "Student loan",
      "Card or credit line minimum",
      "Other obligations",
    ]) {
      expect(screen.getByLabelText(label)).toBeInTheDocument();
    }
  });

  it("gives the haircut a real control, with no second disclosure to open first", () => {
    // v2 has one gesture and it belongs to the sections; the inputs no longer
    // hide half their fields behind a panel of their own.
    renderPage();
    expect(
      within(screen.getByRole("group", { name: "Income" })).getByRole("slider", {
        name: "Lender income recognition haircut",
      }),
    ).toHaveAttribute("aria-valuetext", "0%");
  });

  it("returns a blanked field to its derived default rather than to zero", async () => {
    const user = userEvent.setup();
    renderPage();
    const price = screen.getByLabelText("Purchase price you're considering");
    const derived = (price as HTMLInputElement).placeholder;
    await user.type(price, "600000");
    await user.tab();
    expect(price).toHaveValue("600,000");
    await user.clear(price);
    await user.tab();
    expect(price).toHaveValue("");
    expect(price).toHaveAttribute("placeholder", derived);
  });
});

describe("Affordability — what the app applied on the reader's behalf", () => {
  /**
   * The quiet consequence line: what the page did that the reader did not.
   *
   * Not an `ImpactRow` — DESIGN.md:115 records one 3px accent, singular, and
   * replicating it spends the signal. This is a note in the same treatment as
   * `heatNote`, and it introduces no figure: every branch prints a DIFFERENCE the
   * engine already computes and the page already renders somewhere else.
   */
  const openApproval = async (user: ReturnType<typeof userEvent.setup>) => {
    const row = screen.getByRole("button", { name: /Approval/ });
    if (row.getAttribute("aria-expanded") === "false") await user.click(row);
  };

  it("names the household's own budget when that is the tighter of the two limits", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "winnipeg", income1: 500000 }),
    );
    renderPage();
    await openApproval(user);
    // "this" was the whole defect. The sentence sits directly under "Maximum price a
    // lender would approve", and `gap > 0` means the comfort ceiling is BELOW that
    // row — so the comfort ceiling is precisely not what limits it. English was
    // ambiguous enough to survive; fr, uk and es each resolved the antecedent to the
    // number above and stated it outright ("ce chiffre", "esta cifra", "Це число").
    // The two sibling branches DO mean the row above and say "this ceiling", so one
    // slot pointed at two different figures depending on which branch rendered.
    expect(
      screen.getByText(/what limits what you can buy/),
    ).toBeInTheDocument();
  });

  it("names the debts when total debt service is what binds", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "winnipeg", income1: 75000, car: 1500 }),
    );
    renderPage();
    await openApproval(user);
    expect(screen.getByText(/Your other debts are what limit this ceiling/)).toBeInTheDocument();
  });

  it("names housing cost against income when nothing else has bound yet", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "winnipeg", income1: 40000, income2: 30000 }),
    );
    renderPage();
    await openApproval(user);
    expect(screen.getByText(/Housing cost against your income/)).toBeInTheDocument();
  });

  it("says the condo fee counts twice over, and only where there is one", async () => {
    // Half of it in the lender's ratios, all of it in the household's budget.
    // Both are correct and they are not the same figure, which is exactly the
    // class of thing the page used to apply in silence.
    const user = userEvent.setup();
    renderPage();
    await openApproval(user);
    expect(screen.queryByText(/condo fee behaves two ways/)).not.toBeInTheDocument();
    cleanup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "winnipeg", ptype: "condo", condoFee: 450 }),
    );
    renderPage();
    await openApproval(user);
    expect(screen.getByText(/condo fee behaves two ways/)).toBeInTheDocument();
  });
});

describe("Affordability — one field per value", () => {
  /**
   * `funds` shipped twice, under two different labels, and `condoFee` twice under
   * one. Each ask fires on exactly the condition that leaves its grid twin empty,
   * so one press of Expand all put both on screen at once.
   *
   * The in-place ask is the endorsed placement (DESIGN.md §5.3), so the grid copies
   * are gone — but the ask alone would have been write-once, since it is gated on
   * the value being ABSENT. Hence the second test: the survivor has to outlive its
   * own prompt.
   */
  it("asks for the funds available exactly once", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getAllByLabelText(/Funds available/)).toHaveLength(1);
  });

  it("keeps the funds field reachable once it has been answered", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /Cash/ }));
    const funds = screen.getByLabelText("Funds available");
    await user.type(funds, "1000");
    await user.tab();
    // The prompt has done its job and goes; the field it introduced does not, or a
    // typo would be permanent.
    expect(screen.queryByText(/Tell us what you have/)).not.toBeInTheDocument();
    expect(screen.getByLabelText("Funds available")).toHaveValue("1,000");
  });

  it("asks for the condo fee exactly once, and only where one can exist", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "winnipeg", ptype: "condo" }),
    );
    renderPage();
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.getAllByLabelText("Condo or strata fee, monthly")).toHaveLength(1);
    cleanup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "winnipeg", ptype: "house" }),
    );
    renderPage();
    await user.click(screen.getByRole("button", { name: "Expand all" }));
    expect(screen.queryByLabelText("Condo or strata fee, monthly")).not.toBeInTheDocument();
  });
});

describe("Affordability — a 30-year amortization is not always on offer", () => {
  /**
   * `financing()` charges `cmhc.longAmortSurcharge` for a 30-year loan without ever
   * asking whether the borrower may have one, and `maxAmortYears` is the predicate
   * that closes it: 20% or more down, a price at or above the insured cap, or CMHC
   * Home Start's first-time-buyer-OR-new-build test.
   *
   * The control is GATED, not clamped. Nothing recomputes behind the reader.
   */
  it("offers it to a first-time buyer", () => {
    renderPage();
    expect(screen.getByRole("radio", { name: "30" })).not.toHaveAttribute("aria-disabled");
  });

  it("withdraws it from a repeat buyer of a resale home with less than 20% down", () => {
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "winnipeg", ftb: false, ptype: "house", dpPct: 10 }),
    );
    renderPage();
    expect(screen.getByRole("radio", { name: "30" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText(/first-time buyer or a newly built home/i)).toBeInTheDocument();
  });

  it("keeps it for a repeat buyer of a new build, which is the other half of the or", () => {
    // Dropping the newbuild clause would deny a 30-year amortization to a repeat
    // buyer of a new home, who is entitled to it.
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "winnipeg", ftb: false, ptype: "newbuild", dpPct: 10 }),
    );
    renderPage();
    expect(screen.getByRole("radio", { name: "30" })).not.toHaveAttribute("aria-disabled");
  });

  it("keeps it for a repeat buyer putting 20% down, where no insurer is involved", () => {
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "winnipeg", ftb: false, ptype: "house", dpPct: 20 }),
    );
    renderPage();
    expect(screen.getByRole("radio", { name: "30" })).not.toHaveAttribute("aria-disabled");
  });
});

describe("Affordability — what 'first-time buyer' actually means", () => {
  it("says beside the switch that the test is stricter than the phrase", () => {
    // The switch defaults to TRUE and drives every rebate on the closing bill plus
    // every tax-time credit. Someone eighteen months into Canada who owned a flat
    // abroad was shown thousands of dollars of ineligible relief on defaults, with
    // nothing on the page to make them check.
    renderPage();
    const note = screen.getByText(/permanent residence/i);
    expect(note).toBeInTheDocument();
    // Qualitative only: the look-back period is not in src/domain, so it may not
    // travel as a figure.
    expect(note.textContent).not.toMatch(/\d/);
  });
});

describe("Affordability — the disclosure stays", () => {
  it("keeps the figure disclosure visible, in its mixed-state wording", () => {
    // NOT "placeholder figures" any more: most figures in src/domain/ now cite a
    // dated published document, and a blanket line saying otherwise buried them and
    // taught the reader to discount the sourced and the invented alike.
    //
    // It also makes no PROPORTION claim. An earlier wording said "most figures", which
    // was true at 162 of 288 but thin, and counted conf "low" — which this app's own
    // legend defines as derived rather than read. A footer on every page should not rest
    // on a ratio that a few records could tip.
    //
    // Nor does it universally quantify over FIGURES, which the wording before this one
    // did ("Every figure names where it came from") and which was false: 26 of the 373
    // numeric leaves in src/domain/jurisdictions carry no provenance entry of their own —
    // transfer-line parameters covered in prose by a sibling entry, and nt/nu's property
    // tax inputs. It quantifies over the SOURCING RECORD instead, which is exactly what
    // provenance-view.test.ts can and does check entry by entry.
    renderPage();
    expect(
      screen.getByText(
        "Every figure that carries a sourcing record names where it came from: a dated published source, an estimate we disclose, or nothing at all where nothing is published.",
      ),
    ).toBeVisible();
    expect(screen.getByText(/Rules last verified/)).toBeVisible();
  });
});

describe("Affordability — property tax provenance", () => {
  it("names the source behind the property tax figure", () => {
    // The default jurisdiction is Winnipeg, whose propTax.publishedRate is sourced.
    renderPage();
    expect(
      screen.getByText(/City of Winnipeg Assessment and Taxation, 2026 Combined Mill Rates/),
    ).toBeVisible();
  });

  it("carries the source's own date, so the figure is not undated", () => {
    renderPage();
    expect(screen.getByText(/Combined Mill Rates[\s\S]*\(2026\)/)).toBeVisible();
  });

  it("says the figure is an estimate where the assessment base is not market value", () => {
    // Winnipeg taxes a PORTIONED assessment, so the effective rate is derived
    // against market value and the caveat renders.
    renderPage();
    expect(screen.getByText(/estimates the rate against market value/i)).toBeVisible();
  });

  it("drops the caveat where the assessment base IS market value", () => {
    // Calgary assesses at market value, so there is nothing to caveat — and a
    // caveat that renders everywhere says nothing about anywhere.
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "calgary" }));
    renderPage();
    expect(screen.queryByText(/estimates the rate against market value/i)).not.toBeInTheDocument();
    expect(screen.getByText(/City of Calgary, 2026 property tax rates/)).toBeVisible();
  });

  it("keeps the caveat where we could not establish the assessment base at all", () => {
    // NT's basis is `unknown` — not a fifth kind of base, an admission that the question is
    // open. It used to say `market` with a ratio of 1, purely to satisfy a data invariant,
    // and that mislabel silently switched this caveat OFF on the one record with nothing
    // sourced behind its rate. `basis !== "market"` is the limb that must keep it on: NT's
    // rate provenance is also `assumption` today, but the day someone sources a Yellowknife
    // mill rate, the base will still be unknown and the caveat must survive that.
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "nt" }));
    renderPage();
    expect(getJurisdiction("nt")!.propTax.basis).toBe("unknown");
    expect(screen.getByText(/estimates the rate against market value/i)).toBeVisible();
  });
});

describe("Affordability — number formatting end to end", () => {
  it("never renders a sign inside the currency symbol in French", () => {
    renderPage("fr-CA");
    expect(document.body.textContent).not.toMatch(/\$\s?-\d/);
  });
});

describe("Affordability — with no published price, it keeps the ceiling and asks for the price", () => {
  /**
   * This page is the only one that still answers where nobody publishes a benchmark,
   * and the split is the point: the hero is the price the reader's INCOME supports and
   * no benchmark stands behind it, while every check on the page compares something to
   * `resolved.price`, which is 0 in a territory.
   *
   * The defect was the second half wearing the first half's clothes: a $0 monthly cost,
   * $0 cash to close, and an approval check reporting that $0 is within reach.
   */
  const inYukon = () =>
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ jurId: "yt" }));

  it("still leads with the ceiling the income supports", () => {
    inYukon();
    renderPage();
    expect(getJurisdiction("yt")!.bench.house).toBeNull();
    expect(screen.getAllByText(/^\$[\d,]+$/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/You can comfortably afford about/).length).toBeGreaterThan(0);
  });

  it("says why nothing is being checked, and drops the checks rather than answering them", () => {
    inYukon();
    renderPage();
    expect(
      screen.getByText(/Nobody publishes a benchmark price for Yukon/),
    ).toBeInTheDocument();
    for (const name of SECTIONS) {
      expect(screen.queryByRole("button", { name: new RegExp(name) })).not.toBeInTheDocument();
    }
    // The two price-derived stats — the monthly cost of the price, and the cash to
    // close on it — go with them. The lender ceiling stays: it is a price too.
    expect(screen.queryByText("True all-in monthly")).not.toBeInTheDocument();
    expect(screen.queryByText("Cash needed at closing")).not.toBeInTheDocument();
    expect(screen.getByText("Lender ceiling")).toBeInTheDocument();
  });

  it("checks the price the reader gives, in the same jurisdiction", async () => {
    inYukon();
    const user = userEvent.setup();
    renderPage();
    await user.type(screen.getByLabelText("Purchase price you're considering"), "640000");
    await user.tab();
    expect(screen.getByRole("button", { name: /Approval/ })).toBeInTheDocument();
    expect(screen.queryByText(/Nobody publishes a benchmark price/)).not.toBeInTheDocument();
  });

  it("stops asking for a price on the field that now has one", async () => {
    // The ask under the price field is the same gesture PurchaseInputs makes on the other
    // four pages, and it branched on a different fact: whether a PUBLISHER produces a
    // benchmark, rather than whether a price resolves. So the identical state — 640,000
    // entered at `yt` — dropped the note on Amortization and kept it here, under the
    // reader's own figure, telling them to enter the one they are considering.
    inYukon();
    const user = userEvent.setup();
    renderPage();
    // Present first, so the assertion below cannot pass by querying nothing.
    expect(screen.getByText(/No published price for Yukon/)).toBeInTheDocument();
    await user.type(screen.getByLabelText("Purchase price you're considering"), "640000");
    await user.tab();
    expect(screen.queryByText(/No published price for Yukon/)).not.toBeInTheDocument();
  });
});

describe("Affordability — the headline is the comfort price, never the lower ceiling", () => {
  /**
   * A DELIBERATE choice, pinned here because the product's own home page used to promise
   * the opposite and nothing caught it.
   *
   * `page.tsx` puts `result.comfort` in the hero unconditionally. That price has no
   * income term at all — it is `(the monthly all-in you state − insurance/12 − utilities
   * − condo fee) ÷ carrying cost` — so income never moves it, and at a low enough income
   * it sits ABOVE the lender ceiling. Reported from production as "$371,930 always the
   * same and not changing", which is exactly how it looks from outside: income is the
   * first thing a reader edits here, and it is the one input that cannot move the answer.
   *
   * The alternative — headline = min(comfort, lender) — was considered and not taken. The
   * comfort price answers "what can I carry", which is the question this product exists
   * for, and the lender ceiling is shown beside it with the binding constraint named.
   * What had to change was the copy: the home page said "the lower ceiling sets the
   * price", and that claim is gone in all four locales.
   *
   * Asserted as a RELATIONSHIP rather than against fixed figures. Hardcoding "$371,930"
   * would pin today's default comfort ceiling, rate and property tax as well, so the test
   * would go red for reasons that have nothing to do with the rule it exists to protect.
   */
  const figure = (label: string) => {
    const labelEl = [...document.querySelectorAll("div")].find(
      (d) => (d.textContent ?? "").trim().startsWith(label) && d.children.length <= 1,
    );
    return labelEl?.nextElementSibling?.querySelector("span")?.textContent ?? "";
  };
  const hero = () => document.querySelector('[data-slot="answer-figure"]')?.textContent ?? "";
  const amount = (text: string) => Number(text.replace(/[^0-9]/g, ""));

  const poorEnoughToBeDeclined = () =>
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "winnipeg", income1: 40000, income2: 30000 }),
    );

  it("keeps the comfort price in the hero even when a lender would approve less", () => {
    poorEnoughToBeDeclined();
    renderPage();
    const lender = amount(figure("Lender ceiling"));
    expect(lender, "the lender ceiling should be the binding one at this income").toBeGreaterThan(0);
    // The hero and the ceiling beside it disagree, and the hero is the HIGHER of the two.
    expect(amount(hero())).toBeGreaterThan(lender);
  });

  it("says a lender would decline, rather than letting the figure stand unqualified", () => {
    // The headline being un-financeable is only defensible because the page says so.
    poorEnoughToBeDeclined();
    renderPage();
    expect(screen.getByText(/a lender would decline/i)).toBeInTheDocument();
  });

  it("captions the hero in the two states where nothing used to", () => {
    // `comfortable` and `over` both describe the comfort price, which is what the
    // figure above them is. `declined` and `shortCash` were about the TARGET price
    // and the cash gap, so the largest number on the page had no sentence attached
    // to it in half of its states and the reader could only assume it was whatever
    // the sentence was about — the one thing it is not.
    //
    // Fixed in the caption, not the arithmetic: putting `result.ceiling` in the
    // hero here would reverse the decision the block above pins.
    poorEnoughToBeDeclined();
    renderPage();
    const heroFigure = hero();
    const caption = document.querySelector('[data-slot="answer-figure"]')?.nextElementSibling;
    expect(caption?.textContent, "the sentence under the hero names the hero").toContain(heroFigure);
  });

  it("does not move when income changes, which is the surprising part", async () => {
    const user = userEvent.setup();
    renderPage();
    const heroBefore = hero();
    const lenderBefore = figure("Lender ceiling");
    const income = screen.getByLabelText("Applicant 1, gross annual");
    await user.clear(income);
    await user.type(income, "500000");
    await user.tab();
    expect(hero(), "the comfort price has no income term").toBe(heroBefore);
    expect(figure("Lender ceiling"), "the lender ceiling does").not.toBe(lenderBefore);
  });
});

describe("Affordability — the math column labels its figures with the reader's own deposit", () => {
  /**
   * Both labels read "at 20% down" in all four catalogues, left over from the flat
   * `0.8` the engine used before `financedFraction`. Once the deposit control started
   * moving the size of the loan, the page named a deposit it had not used — and
   * `mComfortPrice` is the page's HERO. At the shipped defaults (Toronto, 10% down,
   * 30 years, $75,000 income) it printed $403,050 under the words "at 20% down",
   * where the real 20%-down figure is $440,156.
   */
  async function openMath(user: ReturnType<typeof userEvent.setup>) {
    const button = screen.getByRole("button", { name: /The math, line by line/ });
    if (button.getAttribute("aria-expanded") === "false") await user.click(button);
  }

  it("names the deposit the figures were computed at, not a fixed 20%", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "toronto", dpPct: 10, income1: 75000 }),
    );
    renderPage();
    await openMath(user);
    expect(screen.getByText("Comfortable purchase price at 10% down")).toBeInTheDocument();
    expect(screen.getByText("Implied mortgage at 10% down")).toBeInTheDocument();
  });

  it("follows the control rather than the copy", async () => {
    const user = userEvent.setup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ jurId: "toronto", dpPct: 25, income1: 75000 }),
    );
    renderPage();
    await openMath(user);
    expect(screen.getByText("Comfortable purchase price at 25% down")).toBeInTheDocument();
    expect(screen.queryByText(/at 20% down/)).not.toBeInTheDocument();
  });
});
