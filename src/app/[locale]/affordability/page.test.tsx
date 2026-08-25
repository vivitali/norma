import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
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
    // NOT "placeholder figures" any more. Most figures in src/domain/ now cite a
    // dated published document; a blanket line saying otherwise buried them and
    // taught the reader to discount the sourced and the invented alike.
    renderPage();
    expect(
      screen.getByText(
        "Most figures now name a dated published source; the rest are estimates we disclose, or are left unknown where nothing is published.",
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
});

describe("Affordability — number formatting end to end", () => {
  it("never renders a sign inside the currency symbol in French", () => {
    renderPage("fr");
    expect(document.body.textContent).not.toMatch(/\$\s?-\d/);
  });
});
