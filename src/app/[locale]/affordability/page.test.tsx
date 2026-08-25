import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { getJurisdiction } from "@/domain/jurisdictions";
import AffordabilityPage from "./page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: "en" | "fr" = "en") =>
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

  it("tags the untouched answer as typical, then as the user's", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.getByText("Typical for your city")).toBeInTheDocument();
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
    expect(screen.getByLabelText("Funds available for this purchase")).toBeVisible();
  });

  it("calls a cash shortfall short, not over", async () => {
    // "over" is the comfort word — money you are spending past a ceiling. A cash
    // gap is money you do not have yet, and the two are not the same fact.
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /Cash/ }));
    const funds = screen.getByLabelText("Funds available for this purchase");
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
    renderPage("fr");
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
