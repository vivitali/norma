import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
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

  // Left as a todo rather than deleted, so the missing coverage is visible in
  // the run: the income control lands with the input groups in the next commit.
  it.todo("flips to 'your numbers' once income is given");

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
    expect(screen.getByLabelText("Funds available")).toBeVisible();
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
    const funds = screen.getByLabelText("Funds available");
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
