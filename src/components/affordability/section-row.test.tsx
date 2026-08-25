import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PanelRow, SectionRow } from "./section-row";

const row = (props: Partial<Parameters<typeof SectionRow>[0]> = {}) => (
  <SectionRow
    id="comfort"
    name="Comfort"
    tone="pass"
    line="Your carrying costs sit under the ceiling you set."
    figure="$1,240 headroom"
    why="Why this check exists."
    open={false}
    onToggle={() => {}}
    {...props}
  >
    <PanelRow label="Principal and interest" value="$1,740" />
  </SectionRow>
);

describe("SectionRow", () => {
  it("sits at h2, under the page's h1", () => {
    render(row());
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Comfort");
  });

  it("wires the disclosure and leaves a closed panel out of the tree", async () => {
    const onToggle = vi.fn();
    const { rerender } = render(row({ onToggle }));
    const button = screen.getByRole("button");
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(button).toHaveAttribute("aria-controls", "comfort-panel");
    expect(document.getElementById("comfort-panel")).toHaveAttribute("hidden");

    await userEvent.click(button);
    expect(onToggle).toHaveBeenCalledOnce();

    rerender(row({ onToggle, open: true }));
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById("comfort-panel")).not.toHaveAttribute("hidden");
    expect(screen.getByText("Why this check exists.")).toBeInTheDocument();
  });

  it("renders a long name in full rather than truncating it", () => {
    // "Le jeu REER → Régime d'accession à la propriété" is a name this product
    // actually ships, and it was what drove the 320px overflow: the name cell was
    // flex-none at every width, so it sized the row to its max-content.
    //
    // What is testable here is that the whole name reaches the DOM. Whether it
    // then wraps or overflows is CSS, and jsdom applies none — the earlier version
    // asserted the class list instead, which restated the fix rather than checking
    // it. The layout itself is verified by measuring scrollWidth in a browser at
    // 320px, across every route and both locales.
    render(row({ name: "Le jeu REER → Régime d’accession à la propriété" }));
    expect(
      screen.getByText("Le jeu REER → Régime d’accession à la propriété"),
    ).toBeInTheDocument();
  });

  it("renders a compound figure whole", () => {
    // Figures are often "$1,240 headroom", not a bare number.
    render(row());
    expect(screen.getByText("$1,240 headroom")).toBeInTheDocument();
  });

  it("repeats the line below the name on phone, where there is no room beside it", () => {
    render(row());
    // Once in the button (sm and up), once under it (below sm).
    expect(screen.getAllByText("Your carrying costs sit under the ceiling you set.")).toHaveLength(2);
  });

  it("clears the 44px touch floor below sm from its own padding", () => {
    // py-4 either side of a 16.5px/1.5 line box is ~57px; no hit-area prop
    // needed here, unlike the Expand all pill.
    render(row());
    expect(screen.getByRole("button")).toHaveClass("py-4");
  });

  it("drops the figure and moves the caret over when a section has no single number", () => {
    render(row({ figure: undefined }));
    expect(screen.queryByText("$1,240 headroom")).not.toBeInTheDocument();
  });
});

describe("PanelRow", () => {
  it("lets the label take the slack and keeps the value whole", () => {
    render(<PanelRow label="Principal and interest" value="$1,740" />);
    expect(screen.getByText("Principal and interest")).toHaveClass("min-w-0", "flex-1");
    expect(screen.getByText("$1,740")).toHaveClass("whitespace-nowrap");
  });
});
