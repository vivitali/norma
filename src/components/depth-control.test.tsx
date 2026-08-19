import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { DepthControl } from "./depth-control";

const LABELS = ["The answer", "Why", "The math"] as const;

describe("DepthControl", () => {
  it("is a labelled radiogroup, not three toggle buttons", () => {
    // One choice among three. aria-pressed on three independent buttons would
    // misdescribe it to a screen reader.
    render(<DepthControl value={0} onChange={vi.fn()} label="Detail" optionLabels={LABELS} />);
    expect(screen.getByRole("radiogroup", { name: "Detail" })).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
  });

  it("marks the current depth checked", () => {
    render(<DepthControl value={1} onChange={vi.fn()} label="Detail" optionLabels={LABELS} />);
    expect(screen.getByRole("radio", { name: /Why/ })).toHaveAttribute("aria-checked", "true");
    expect(screen.getByRole("radio", { name: /The answer/ })).toHaveAttribute("aria-checked", "false");
  });

  it("uses roving tabindex", () => {
    render(<DepthControl value={1} onChange={vi.fn()} label="Detail" optionLabels={LABELS} />);
    expect(screen.getByRole("radio", { name: /Why/ })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("radio", { name: /The math/ })).toHaveAttribute("tabindex", "-1");
  });

  it("moves with arrow keys", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DepthControl value={0} onChange={onChange} label="Detail" optionLabels={LABELS} />);
    screen.getByRole("radio", { name: /The answer/ }).focus();
    await user.keyboard("{ArrowRight}");
    expect(onChange).toHaveBeenLastCalledWith(1);
  });

  it("does not wrap past the ends", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DepthControl value={0} onChange={onChange} label="Detail" optionLabels={LABELS} />);
    screen.getByRole("radio", { name: /The answer/ }).focus();
    await user.keyboard("{ArrowLeft}");
    expect(onChange).not.toHaveBeenCalled();
  });

  it("selects on click", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<DepthControl value={0} onChange={onChange} label="Detail" optionLabels={LABELS} />);
    await user.click(screen.getByRole("radio", { name: /The math/ }));
    expect(onChange).toHaveBeenLastCalledWith(2);
  });
});
