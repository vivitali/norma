import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { NumberField } from "./number-field";

describe("NumberField", () => {
  it("is a text input with a decimal keypad, not type=number", () => {
    // type=number brings spinners, valueAsNumber's NaN, and no way to hold a
    // locale-formatted string mid-edit.
    renderWithIntl(<NumberField id="price" label="Price" value={350000} onCommit={vi.fn()} />);
    const input = screen.getByLabelText("Price");
    expect(input).toHaveAttribute("type", "text");
    expect(input).toHaveAttribute("inputmode", "decimal");
  });

  it("carries the 16px control class", () => {
    renderWithIntl(<NumberField id="price" label="Price" value={1} onCommit={vi.fn()} />);
    expect(screen.getByLabelText("Price").className).toContain("control");
  });

  it("shows the value formatted while unfocused", () => {
    renderWithIntl(<NumberField id="price" label="Price" value={350000} onCommit={vi.fn()} />);
    expect(screen.getByLabelText("Price")).toHaveValue("350,000");
  });

  it("shows raw digits while focused, so typing is not fought", async () => {
    const user = userEvent.setup();
    renderWithIntl(<NumberField id="price" label="Price" value={350000} onCommit={vi.fn()} />);
    const input = screen.getByLabelText("Price");
    await user.click(input);
    expect(input).toHaveValue("350000");
  });

  it("commits on blur, not on every keystroke", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithIntl(<NumberField id="price" label="Price" value={350000} onCommit={onCommit} />);
    const input = screen.getByLabelText("Price");
    await user.clear(input);
    await user.type(input, "425000");
    expect(onCommit).not.toHaveBeenCalled();
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith(425000);
  });

  it("commits null when blanked, not 0", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithIntl(<NumberField id="price" label="Price" value={350000} onCommit={onCommit} />);
    await user.clear(screen.getByLabelText("Price"));
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith(null);
  });

  it("does not commit 0 for a partial entry", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithIntl(
      <NumberField id="price" label="Price" value={null} placeholder={400000} onCommit={onCommit} />,
    );
    const input = screen.getByLabelText("Price");
    await user.click(input);
    await user.type(input, "-");
    await user.tab();
    expect(onCommit).not.toHaveBeenCalledWith(0);
  });

  it("renders the derived placeholder when the value is null", () => {
    // "Absent means derived": an untouched field still shows a real, correct
    // number -- the city benchmark -- rather than an empty box.
    renderWithIntl(
      <NumberField id="price" label="Price" value={null} placeholder={400000} onCommit={vi.fn()} />,
    );
    expect(screen.getByLabelText("Price")).toHaveValue("400,000");
  });

  it("clamps to min on commit, so negative income is impossible", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithIntl(<NumberField id="income" label="Income" value={70000} min={0} onCommit={onCommit} />);
    const input = screen.getByLabelText("Income");
    await user.clear(input);
    await user.type(input, "-5000");
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith(0);
  });

  it("parses a French figure it was just shown", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithIntl(<NumberField id="price" label="Prix" value={350000} onCommit={onCommit} />, {
      locale: "fr",
    });
    const input = screen.getByLabelText("Prix");
    const shown = (input as HTMLInputElement).value;
    await user.clear(input);
    await user.type(input, shown);
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith(350000);
  });

  it("associates a unit suffix with the control instead of putting it inside", () => {
    renderWithIntl(
      <NumberField id="dp" label="Down payment" value={10} suffix="%" onCommit={vi.fn()} />,
    );
    expect(screen.getByLabelText("Down payment")).toHaveAccessibleDescription("%");
  });
});
