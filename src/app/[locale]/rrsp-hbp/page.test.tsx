import { beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, within } from "@testing-library/react";
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

/** The head stat whose label starts with `label` (the section rows repeat the same words). */
const statOf = (label: string) =>
  [...document.querySelectorAll("[data-slot=answer-stat]")].find((el) =>
    el.previousElementSibling?.textContent?.startsWith(label),
  )!;

describe("RRSP → HBP — the refund leads", () => {
  it("puts the refund at the scale of an answer", () => {
    renderPage();
    expect(screen.getAllByText("Estimated refund on this contribution").length).toBeGreaterThan(0);
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
    // The contribution default is now min(annual limit, 18% of income), so it never
    // exceeds the annual limit printed here; the limit was once contradicted by a
    // $60,000 default, 78% above what anyone's room can grow in a year.
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
    // The NOTE types no rate. (The rate does appear elsewhere on the page — as the sourced
    // `rrspRoomRate`, bound as an argument in the tag and the contribution label.)
    expect(screen.getByText(/Notice of Assessment/).textContent).not.toMatch(/18%/);
  });
});

describe("RRSP → HBP — the rules", () => {
  it("states the rule with CRA's own \"part or all\" wording, not as a no-exception absolute", async () => {
    // CRA's rule restricts the DEDUCTIBILITY of a contribution made in the window — "may not be
    // able to deduct part or all" of it — never the withdrawal. "This rule is absolute. There is
    // no exception" overstated that, so this test now asserts the softened, CRA-accurate wording
    // is present and the old overstatement is gone.
    const user = userEvent.setup();
    renderPage();
    await open(user, /The five steps/);
    expect(screen.getByText(/never blocked/)).toBeInTheDocument();
    expect(screen.getByText(/may not be able to deduct part or all/)).toBeInTheDocument();
    expect(screen.queryByText(/no exception and no appeal/)).not.toBeInTheDocument();
  });

  it("says the 89-day rule once, without contradicting itself", async () => {
    // The panel said "one of these steps has no exception", the step said "not an absolute rule with
    // no exception", and a third line insisted on "89 days. Not approximately 89 days." Three
    // statements of one rule, two of which disagreed.
    const user = userEvent.setup();
    renderPage();
    await open(user, /The five steps/);
    const panel = document.getElementById("rules")!;
    expect(panel.textContent).not.toMatch(/no exception/);
    expect(panel.textContent).not.toMatch(/Not approximately/);
    expect(within(panel).getByText(/can lose its deduction/)).toBeInTheDocument();
    expect(within(panel).getByText(/the order is what protects the refund/i)).toBeInTheDocument();
  });

  it("sets CRA's caveat as a quiet note, not in the blocked colour", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The five steps/);
    const caveat = screen.getByText(/may not be able to deduct part or all/);
    expect(caveat.closest("[data-slot=note]")).not.toBeNull();
    expect(caveat.className).not.toMatch(/text-blocked/);
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
    expect(screen.getByText(`Repayment year ${ca.hbp.repayYears}`)).toBeInTheDocument();
    // The note and the rows count the same thing: year 1 is the first repayment year.
    expect(screen.getByText(/year 1 is your first repayment year/)).toBeInTheDocument();
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

describe("RRSP → HBP — the default contribution and the refund's method", () => {
  it("opens on a contribution below the annual limit, not the $60,000 HBP maximum", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /The refund/);
    const field = document.getElementById("hbpContribution") as HTMLInputElement;
    expect(field.value).toBe("");
    expect(field.placeholder.replace(/[^\d]/g, "")).toBe("13500");
  });

  it("says in the calculation that the refund is an estimate from combined rates", async () => {
    const user = userEvent.setup();
    renderPage();
    await open(user, /How this was calculated/);
    expect(screen.getByText(/worked out bracket by bracket/)).toBeInTheDocument();
  });
});

describe("RRSP → HBP — nothing opens, and the assumptions are named", () => {
  it("opens no section on a first visit, and one once the reader has given something", () => {
    renderPage();
    expect(screen.queryAllByRole("button", { expanded: true })).toHaveLength(0);
    cleanup();
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ hbpContribution: 8000 }));
    renderPage();
    expect(screen.getByRole("button", { name: /The refund/ })).toHaveAttribute("aria-expanded", "true");
  });

  it("names the assumed contribution in the tag and jumps to its field", async () => {
    const user = userEvent.setup();
    renderPage();
    const tag = screen.getByRole("button", {
      name: /Assuming a \$13,500 contribution: 18% of income, up to the annual limit/,
    });
    await user.click(tag);
    expect(screen.getByLabelText("Your RRSP contribution")).toHaveFocus();
  });

  it("names the assumed income once the contribution is given", async () => {
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ hbpContribution: 8000 }));
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("button", { name: /Assuming \$75,000 of taxable income/ }));
    expect(screen.getByLabelText("Taxable income")).toHaveFocus();
  });

  it("says \"Your figures\" only when neither the contribution nor the income is assumed", () => {
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ hbpContribution: 8000, taxIncome: 90000 }),
    );
    renderPage();
    expect(document.querySelector("[data-slot=answer-tag]")!.textContent).toBe("Your figures");
  });

  it("does not assert a contribution the reader never made", async () => {
    // "Your RRSP contribution $13,500" claimed a fact the reader had not given.
    const user = userEvent.setup();
    renderPage();
    await open(user, /The refund/);
    const panel = document.getElementById("refund")!;
    expect(
      within(panel).getByText("Assumed contribution: 18% of income, up to the annual limit"),
    ).toBeInTheDocument();
    expect(within(panel).queryByText("Your RRSP contribution")).not.toBeInTheDocument();
    cleanup();
    window.localStorage.setItem("norma.inputs.v2", JSON.stringify({ hbpContribution: 8000 }));
    renderPage();
    await open(user, /The refund/);
    expect(within(document.getElementById("refund")!).getByText("Your RRSP contribution")).toBeInTheDocument();
  });

  it("marks the withdrawn amount an estimate until the reader gives it, then a rule", () => {
    renderPage();
    const label = () => statOf("Amount withdrawn tax-free").previousElementSibling!;
    expect(label().textContent).toMatch(/estimate/);
    cleanup();
    window.localStorage.setItem(
      "norma.inputs.v2",
      JSON.stringify({ hbpContribution: 8000, hbpWithdraw: 8000 }),
    );
    renderPage();
    expect(label().textContent).toMatch(/rule/);
  });

  it("keeps its inputs in the block the head jumps to, outside every section", () => {
    renderPage();
    expect(screen.getByRole("link", { name: "Adjust your numbers" })).toHaveAttribute("href", "#adjust");
    const adjust = document.getElementById("adjust")!;
    for (const id of ["hbpContribution", "hbpWithdraw", "taxIncome"]) {
      expect(adjust.querySelector(`#${id}`)).not.toBeNull();
    }
  });

  it("gives the repayment stat the caution tone of the section that owns it", () => {
    renderPage();
    expect(statOf("Repayment schedule").querySelector(".text-caution")).not.toBeNull();
  });
});
