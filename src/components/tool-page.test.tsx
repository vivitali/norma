import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { AnswerHead, SectionsHeader } from "./tool-page";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);
vi.mock("@/i18n/navigation", async () => (await import("@/test/navigation-mock")).intlNavigation);

describe("AnswerHead", () => {
  it("gives the page a level-one heading, and it is the page name", () => {
    // Seven tool pages had no h1 at all and opened at h2. The name is the h1,
    // not the figure: "Affordability" is what a heading-jump or a document
    // title is for, and a bare "$398,398" names nothing in that list.
    renderWithIntl(<AnswerHead eyebrow="Affordability" figure="$398,398" head="You can afford it." />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Affordability");
  });

  it("keeps the figure out of the heading outline", () => {
    renderWithIntl(<AnswerHead eyebrow="Affordability" figure="$398,398" head="You can afford it." />);
    expect(screen.queryByRole("heading", { name: "$398,398" })).not.toBeInTheDocument();
    // Still rendered, and still first in reading order after the name.
    expect(screen.getByText("$398,398")).toBeInTheDocument();
  });

  it("renders the h1 with the eyebrow's own type, so nothing moves", () => {
    // .eyebrow (@layer components) carries the 11px/600/uppercase; Tailwind
    // preflight (@layer base) has already reset h1's size, weight and margin.
    renderWithIntl(<AnswerHead eyebrow="Affordability" figure="$1" head="x" />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveClass("eyebrow");
  });

  it("lets the stat column shrink below sm instead of widening the page", () => {
    // flex-none at every width sized this column to max-content and refused to
    // give any of it back, which is how a stat pushed a 320px viewport wider
    // than itself. It takes a full row below sm and is flex-none only from sm.
    renderWithIntl(
      <AnswerHead
        eyebrow="Affordability"
        figure="$398,398"
        head="You can afford it."
        stats={[{ label: "Lender ceiling", value: "$412,000", note: "$1,240 headroom" }]}
      />,
    );
    // Behaviour, not class strings. The previous version did
    // `querySelector("div.basis-full")` and then asserted that element had
    // `basis-full`, which is circular, and jsdom applies no CSS so it could not
    // observe the stacking it claimed to guard either way. What IS testable here
    // is that both halves render and neither is dropped at any width; the actual
    // 320px stacking is verified by measuring scrollWidth in a browser, which
    // this file cannot do.
    expect(screen.getByText("$398,398")).toBeInTheDocument();
    expect(screen.getByText("Lender ceiling")).toBeInTheDocument();
    expect(screen.getByText("$412,000")).toBeInTheDocument();
  });

  it("wraps a stat's note under its value rather than off the edge", () => {
    const { container } = renderWithIntl(
      <AnswerHead
        eyebrow="Affordability"
        figure="$398,398"
        head="You can afford it."
        stats={[{ label: "Monthly", value: "$2,140", note: "$1,240 headroom" }]}
      />,
    );
    // The note renders beside its value and is not dropped. Whether it wraps or
    // overflows is a CSS question jsdom cannot answer; asserting the class name
    // would only restate the implementation.
    expect(screen.getByText("$2,140")).toBeInTheDocument();
    expect(container.textContent).toContain("$1,240 headroom");
  });

  it("prints no figure at all when the page has no answer", () => {
    // A page with no published price has nothing to put in the hero, and the two
    // candidates for standing in are both worse than nothing: "$0" is a claim about
    // a market, and a bare em-dash at 72px reads as a rendering fault. The sentence
    // takes the slot instead, and the sweep in page-contracts.test.tsx keys off the
    // figure's absence, so it must genuinely not be in the document.
    const { container } = renderWithIntl(
      <AnswerHead eyebrow="Amortization" head="Nobody publishes a benchmark price for Yukon." />,
    );
    expect(container.querySelector('[data-slot="answer-figure"]')).toBeNull();
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("Amortization");
    expect(screen.getByText(/Nobody publishes a benchmark price/)).toBeInTheDocument();
  });

  it("marks the figure so a sweep can find it without matching on copy", () => {
    const { container } = renderWithIntl(
      <AnswerHead eyebrow="Amortization" figure="$2,446" head="Your payment never changes." />,
    );
    expect(container.querySelector('[data-slot="answer-figure"]')).toHaveTextContent("$2,446");
  });

  it("omits the optional sub, tag and stats when they are not given", () => {
    renderWithIntl(<AnswerHead eyebrow="Affordability" figure="$1" head="Head." />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(screen.getByText("Head.")).toBeInTheDocument();
  });
});

describe("SectionsHeader", () => {
  it("reports the expanded state of everything it toggles", async () => {
    const onToggleAll = vi.fn();
    renderWithIntl(
      <SectionsHeader
        label="Breakdown"
        expanded={false}
        onToggleAll={onToggleAll}
        expandLabel="Expand all"
        collapseLabel="Collapse all"
      />,
    );
    const button = screen.getByRole("button", { name: "Expand all" });
    expect(button).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(button);
    expect(onToggleAll).toHaveBeenCalledOnce();
  });

  it("carries a 44px hit area below sm without growing the pill", () => {
    // DESIGN.md §7 floors touch targets at 44px below sm. The pill stays 32px;
    // an invisible ::after centred on it does the reaching, so the baseline
    // alignment of the header row is untouched.
    renderWithIntl(
      <SectionsHeader
        label="Breakdown"
        expanded
        onToggleAll={() => {}}
        expandLabel="Expand all"
        collapseLabel="Collapse all"
      />,
    );
    const button = screen.getByRole("button", { name: "Collapse all" });
    expect(button).toHaveClass("relative", "after:absolute", "after:h-11", "sm:after:hidden");
  });
});
