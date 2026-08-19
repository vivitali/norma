import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DisclosureSection } from "./disclosure-section";

describe("DisclosureSection", () => {
  it("wires aria-expanded and aria-controls to the panel", () => {
    render(
      <DisclosureSection id="check-comfort" label="Comfort" open onToggle={vi.fn()}>
        <p>rows</p>
      </DisclosureSection>,
    );
    const toggle = screen.getByRole("button", { name: /Comfort/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(document.getElementById(toggle.getAttribute("aria-controls")!)).toHaveTextContent("rows");
  });

  it("hides the panel content when closed", () => {
    render(
      <DisclosureSection id="check-comfort" label="Comfort" open={false} onToggle={vi.fn()}>
        <p>rows</p>
      </DisclosureSection>,
    );
    expect(screen.getByRole("button", { name: /Comfort/ })).toHaveAttribute("aria-expanded", "false");
    // The panel stays in the DOM so aria-controls keeps pointing at a real
    // element; `hidden` is what takes it out of the accessibility tree and off
    // the screen, so visibility is the thing to assert.
    expect(screen.getByText("rows")).not.toBeVisible();
  });

  it("calls onToggle on click", async () => {
    const onToggle = vi.fn();
    const user = userEvent.setup();
    render(
      <DisclosureSection id="check-comfort" label="Comfort" open onToggle={onToggle}>
        <p>rows</p>
      </DisclosureSection>,
    );
    await user.click(screen.getByRole("button", { name: /Comfort/ }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it("gives the heading a programmatic focus target", () => {
    // Jump-rail links move focus here. Scrolling without moving focus leaves a
    // keyboard user exactly where they started.
    render(
      <DisclosureSection id="check-cash" label="Cash" open onToggle={vi.fn()}>
        <p>rows</p>
      </DisclosureSection>,
    );
    expect(document.getElementById("check-cash")).toHaveAttribute("tabindex", "-1");
  });

  it("keeps the always-visible why line outside the panel", () => {
    render(
      <DisclosureSection id="check-cash" label="Cash" open={false} onToggle={vi.fn()} why="Not enough yet.">
        <p>rows</p>
      </DisclosureSection>,
    );
    expect(screen.getByText("Not enough yet.")).toBeInTheDocument();
  });
});
