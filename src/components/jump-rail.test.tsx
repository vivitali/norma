import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { JumpRail } from "./jump-rail";

describe("JumpRail", () => {
  it("renders real anchors so the links can be copied and shared", () => {
    render(<JumpRail label="Jump to" links={[{ id: "gap", label: "The gap" }]} />);
    expect(screen.getByRole("link", { name: "The gap" })).toHaveAttribute("href", "#gap");
  });

  it("moves focus to the target heading, not only the scroll position", async () => {
    const user = userEvent.setup();
    render(
      <>
        <JumpRail label="Jump to" links={[{ id: "gap", label: "The gap" }]} />
        <h2 id="gap" tabIndex={-1}>
          The gap
        </h2>
      </>,
    );
    await user.click(screen.getByRole("link", { name: "The gap" }));
    expect(document.getElementById("gap")).toHaveFocus();
  });

  it("is a labelled navigation landmark", () => {
    render(<JumpRail label="Jump to" links={[{ id: "gap", label: "The gap" }]} />);
    expect(screen.getByRole("navigation", { name: "Jump to" })).toBeInTheDocument();
  });
});
