import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import AffordabilityPage from "./page";

const renderPage = (locale: "en" | "fr" = "en") =>
  renderWithIntl(
    <JurisdictionProvider>
      <AffordabilityPage />
    </JurisdictionProvider>,
    { locale },
  );

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  window.location.hash = "";
});

describe("Affordability — the answer comes first", () => {
  it("shows a real figure before any input is touched", async () => {
    // No screen in this product opens on an empty form.
    renderPage();
    const verdict = await screen.findByRole("region", { name: /lender would decline|comfortably afford|above what you would be comfortable|not yet enough cash/i });
    expect(verdict).toBeInTheDocument();
  });

  it("tags the untouched answer as typical, not as the user's", () => {
    renderPage();
    expect(screen.getByText("Typical for your city")).toBeInTheDocument();
  });

  it("flips to 'your numbers' once income is given", async () => {
    const user = userEvent.setup();
    renderPage();
    const income = screen.getByLabelText("Applicant 1, gross annual");
    await user.clear(income);
    await user.type(income, "95000");
    await user.tab();
    expect(screen.getByText("Your numbers")).toBeInTheDocument();
  });

  it("renders all four stat-strip figures", () => {
    renderPage();
    // "True all-in monthly" is deliberately the label of both the stat and the
    // comfort check's total row — the same figure, named the same way.
    for (const label of [
      "Comfortable price",
      "Lender ceiling",
      "True all-in monthly",
      "Cash needed at closing",
    ]) {
      expect(screen.getAllByText(label).length, label).toBeGreaterThan(0);
    }
  });
});

describe("Affordability — the parity checklist", () => {
  // Each registry section, asserted present, so dropping one fails the suite
  // rather than quietly shipping a thinner screen.
  it("renders every section present at the default depth", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "The three checks" })).toBeInTheDocument();
    for (const name of ["Verdict", "The three checks", "The gap", "Adjust your numbers"]) {
      expect(screen.getByRole("link", { name })).toBeInTheDocument();
    }
  });

  it("does not render the math section at the default depth", () => {
    renderPage();
    expect(
      screen.queryByRole("link", { name: "The math, line by line" }),
    ).not.toBeInTheDocument();
  });
});

describe("Affordability — depth", () => {
  it("leaves the three checks collapsed at 'the answer'", () => {
    renderPage();
    for (const name of [/Approval/, /Comfort/, /Cash/]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-expanded", "false");
    }
  });

  it("opens the three checks at 'why'", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("radio", { name: /Why/ }));
    for (const name of [/Approval/, /Comfort/, /Cash/]) {
      expect(screen.getByRole("button", { name })).toHaveAttribute("aria-expanded", "true");
    }
  });

  it("adds the math jump link at 'the math'", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("radio", { name: /The math/ }));
    expect(screen.getByRole("link", { name: "The math, line by line" })).toBeInTheDocument();
  });

  it("survives a remount", async () => {
    const user = userEvent.setup();
    const { unmount } = renderPage();
    await user.click(screen.getByRole("radio", { name: /The math/ }));
    unmount();
    renderPage();
    expect(await screen.findByRole("radio", { name: /The math/ })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("lets a check be opened at 'the answer' and closed at 'the math'", async () => {
    // The reference's own defect, asserted against: it pins every check open at
    // depth >= 1 and leaves the toggle inoperative.
    const user = userEvent.setup();
    renderPage();
    const comfort = () => screen.getByRole("button", { name: /Comfort/ });
    await user.click(comfort());
    expect(comfort()).toHaveAttribute("aria-expanded", "true");

    await user.click(screen.getByRole("radio", { name: /The math/ }));
    await user.click(comfort());
    expect(comfort()).toHaveAttribute("aria-expanded", "false");
  });
});

describe("Affordability — deep links", () => {
  it("opens the check the hash names", async () => {
    window.location.hash = "#check-comfort";
    renderPage();
    expect(await screen.findByRole("button", { name: /Comfort/ })).toHaveAttribute(
      "aria-expanded",
      "true",
    );
    expect(screen.getByRole("button", { name: /Approval/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  it("is inert for an unknown hash", () => {
    window.location.hash = "#not-a-section";
    renderPage();
    expect(screen.getByRole("button", { name: /Comfort/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });
});

describe("Affordability — the unanswered cash check", () => {
  it("still shows the cash required, and asks for the one field it wants", async () => {
    // Nothing is gated: cc.net is fully computable from defaults.
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /Cash/ }));
    expect(screen.getByText("Net cash at closing, after credits applied that day")).toBeVisible();
    expect(screen.getByLabelText("Funds available for this purchase")).toBeVisible();
  });

  it("never reports shortCash while funds are unknown", () => {
    renderPage();
    expect(
      screen.queryByText("You have enough income, but not yet enough cash to close."),
    ).not.toBeInTheDocument();
  });

  it("reports a shortfall once funds are given and fall short", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /Cash/ }));
    const funds = screen.getByLabelText("Funds available for this purchase");
    await user.type(funds, "1000");
    await user.tab();
    expect(screen.getByRole("button", { name: /Cash.*Blocked/ })).toBeInTheDocument();
  });
});

describe("Affordability — the disclosure stays", () => {
  it("keeps the unverified-figures wording visible", () => {
    renderPage();
    expect(screen.getByText("Placeholder figures — verify before relying on them")).toBeVisible();
    expect(screen.getByText(/Rules last verified/)).toBeVisible();
  });
});

describe("Affordability — number formatting end to end", () => {
  it("never renders a sign inside the currency symbol in French", () => {
    // money() emits "− 340 $" in fr and "− $340" in en. Never "$-340".
    renderPage("fr");
    expect(document.body.textContent).not.toMatch(/\$\s?-\d/);
  });
});

describe("Affordability — the gap band", () => {
  it("names exactly one of the two zones, and never clamps the inverted case", () => {
    renderPage();
    // Whichever way round the two numbers land, exactly one of the two
    // sentences must be on screen — never a clamped zero and no explanation.
    const zone = screen.queryByText(/Lenders will approve into this zone/);
    const inverted = screen.queryByText(/comfortable carrying more than a lender will approve/);
    expect([zone, inverted].filter(Boolean)).toHaveLength(1);
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

  it("assumes no second applicant, and offers to add one", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.queryByLabelText("Applicant 2, gross annual")).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Add a second applicant" }));
    expect(screen.getByLabelText("Applicant 2, gross annual")).toBeInTheDocument();
  });

  it("gives the haircut a real control, ending its life as dead state", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(
      within(screen.getByRole("group", { name: "Income" })).getByRole("button", {
        name: "Advanced",
      }),
    );
    const slider = screen.getByRole("slider", {
      name: "Lender income recognition haircut",
    });
    expect(slider).toHaveAttribute("aria-valuetext", "0%");
  });

  it("says every field is pre-filled and overwritable", () => {
    renderPage();
    expect(screen.getByText(/Pre-filled from your city/)).toBeInTheDocument();
  });

  it("returns a blanked field to its derived default rather than to zero", async () => {
    const user = userEvent.setup();
    renderPage();
    const price = screen.getByLabelText("Purchase price you're considering");
    const derived = (price as HTMLInputElement).value;
    await user.clear(price);
    await user.type(price, "600000");
    await user.tab();
    expect(price).toHaveValue("600,000");
    await user.clear(price);
    await user.tab();
    expect(price).toHaveValue(derived);
  });
});

describe("Affordability — consequence", () => {
  it("prices $100 of monthly debt when no debt is entered", () => {
    renderPage();
    expect(screen.getByText(/No monthly debts entered/)).toBeInTheDocument();
  });

  it("prices the entered debt in purchase-price terms", async () => {
    const user = userEvent.setup();
    renderPage();
    const car = screen.getByLabelText("Car loan or lease");
    await user.type(car, "550");
    await user.tab();
    expect(screen.getByText(/reduces what a lender will approve/)).toBeInTheDocument();
  });
});

describe("Affordability — the math", () => {
  it("shows both derivation columns and both ratio gauges at 'the math'", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("radio", { name: /The math/ }));
    expect(screen.getByText("What a lender would approve")).toBeInTheDocument();
    expect(screen.getByText("What you could comfortably carry")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^GDS/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /^TDS/ })).toBeInTheDocument();
  });

  it("explains the heat allowance only where the ratios are shown", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(screen.queryByText(/standard heating allowance/)).not.toBeInTheDocument();
    await user.click(screen.getByRole("radio", { name: /The math/ }));
    expect(screen.getByText(/standard heating allowance/)).toBeInTheDocument();
  });
});
