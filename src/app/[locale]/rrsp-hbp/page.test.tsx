import { beforeEach, describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import type { Locale } from "@/lib/locales";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { ca } from "@/domain/rules/ca";
import { money } from "@/domain/engine";
import RrspHbpPage from "./page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

const renderPage = (locale: Locale = "en-CA") =>
  renderWithIntl(
    <JurisdictionProvider>
      <RrspHbpPage />
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

/** The page's own formatter, so the assertion cannot drift from the rendered string. */
const fmtCap = (n: number) => money(n, "en-CA", false);

beforeEach(() => window.localStorage.clear());

describe("RRSP → HBP — the refund leads", () => {
  it("puts the refund at the scale of an answer", () => {
    renderPage();
    expect(screen.getAllByText("Refund at your marginal rate").length).toBeGreaterThan(0);
  });

  it("caps the contribution at the federal maximum", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The refund/);
    const field = screen.getByLabelText("Your RRSP contribution");
    await user.clear(field);
    await user.type(field, "200000");
    await user.tab();
    expect(screen.getAllByText("Federal HBP maximum").length).toBeGreaterThan(0);
    // The engine caps it; the screen must show the capped figure, not the entry.
    expect(screen.queryByText("$200,000")).not.toBeInTheDocument();
  });
});

describe("RRSP → HBP — no verdict it cannot support", () => {
  it("ships no worth-it verdict", async () => {
    // The reference computed one as `refund + growth > 0 && withdraw > 0`, true
    // whenever anything is withdrawn at all. A verdict that can only say yes is
    // worse than no verdict, on the screen whose job is to say whether this is wise.
    const user = userEvent.setup();
    renderPage();
    await open(user, /What a missed year costs/);
    expect(screen.queryByText(/Worth it/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Not worth it/)).not.toBeInTheDocument();
    expect(screen.getByText(/the decision is yours/)).toBeInTheDocument();
  });

  it("prices the actual risk instead: a missed repayment year", () => {
    renderPage();
    const row = screen.getByRole("button", { name: /What a missed year costs/ });
    expect(row.textContent).toMatch(/Added to your income for each year missed/);
  });

  it("does not label the tax on a missed year as the income added", () => {
    // The phrase names what is ADDED TO INCOME; the section's figure is the TAX
    // on it, which is that amount times the marginal rate. The row used to put
    // the phrase directly beside the tax, describing it as a number it is not,
    // so the two must now be distinct amounts on the same row.
    renderPage();
    const row = screen.getByRole("button", { name: /What a missed year costs/ });
    const amounts = [...(row.textContent ?? "").matchAll(/\$[\d,]+/g)].map((m) => m[0]);
    expect(amounts.length).toBe(2);
    expect(amounts[0]).not.toBe(amounts[1]);
  });
});

describe("RRSP → HBP — the clamp is explained, not printed as $0", () => {
  /**
   * `hbpPlay` models "contribute, then withdraw what you contributed", so a
   * reader who already holds the money in an RRSP — contribution left at 0,
   * withdrawal typed in — is clamped to nothing. The page answered that with
   * $0 in every slot and the line "Enter a withdrawal amount to see what this
   * is worth", told to someone who had just entered one.
   */
  const alreadyInTheRrsp = () =>
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ hbpContribution: 0, hbpWithdraw: 60000 }),
    );

  it("stops telling a reader who entered a withdrawal to enter a withdrawal", () => {
    alreadyInTheRrsp();
    renderPage();
    expect(screen.queryByText(/Enter a withdrawal amount/)).not.toBeInTheDocument();
  });

  it("says which of the two inputs bound the answer", async () => {
    const user = userEvent.setup();
    alreadyInTheRrsp();
    renderPage();
    await open(user, /The refund/);
    expect(screen.getByText(/cut back to/)).toBeInTheDocument();
  });

  it("says nothing about a clamp when the withdrawal fits the contribution", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The refund/);
    expect(screen.queryByText(/cut back to/)).not.toBeInTheDocument();
  });
});

describe("RRSP → HBP — the room the reader may not have", () => {
  it("shows the RRSP dollar limit beside the HBP maximum", async () => {
    // The contribution field defaults to the $60,000 HBP maximum, which is 78%
    // above the most anyone's room can grow in a year — a figure the app already
    // held at conf `high` and no screen had ever displayed.
    const user = userEvent.setup();
    renderPage();
    await open(user, /The refund/);
    expect(screen.getAllByText("Federal HBP maximum").length).toBeGreaterThan(0);
    expect(screen.getByText(fmtCap(ca.rrspCap))).toBeInTheDocument();
  });

  it("points at the Notice of Assessment rather than stating an accrual rate", async () => {
    // 18% of earned income, and the $2,000 over-contribution cushion, have no
    // provenance entry in src/domain, so neither may travel. The document does.
    const user = userEvent.setup();
    renderPage();
    await open(user, /The refund/);
    expect(screen.getByText(/Notice of Assessment/)).toBeInTheDocument();
    expect(document.body.textContent).not.toMatch(/18%/);
  });
});

describe("RRSP → HBP — the rules", () => {
  it("states the waiting rule as absolute, because it is", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The five steps/);
    expect(screen.getByText(/no exception and no appeal/)).toBeInTheDocument();
  });

  it("discloses the 2022-2025 cohort's extra three years beside the grace note", async () => {
    // `graceYears` is 2 for everyone the engine computes for, and rules/ca.ts
    // records the exception. Disclosed rather than computed: deriving it needs
    // the withdrawal year, which is a persisted input this page does not have.
    const user = userEvent.setup();
    renderPage();
    await open(user, /The repayment/);
    expect(screen.getByText(/three more years/)).toBeInTheDocument();
  });

  it("repays the whole withdrawal, to zero, over the statutory years", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The repayment/);
    expect(screen.getByText(`Year ${ca.hbp.repayYears}`)).toBeInTheDocument();
  });
});

describe("RRSP → HBP — French", () => {
  it("renders in French without leaking a message key, in every section", async () => {
    // Expanded first, deliberately. A missing ICU parameter makes next-intl
    // render the raw key, and a collapsed page hides every section where that
    // can happen -- which is exactly where Amortization.altText was hiding.
    const user = userEvent.setup();
    renderPage("fr-CA");
    await user.click(screen.getByRole("button", { name: "Tout ouvrir" }));
    expect(document.body.textContent).not.toMatch(/RrspHbp\./);
    expect(screen.getAllByText(/Régime d’accession|RAP/).length).toBeGreaterThan(0);
  });
});
