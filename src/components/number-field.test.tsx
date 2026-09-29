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

  it.each(["abc", "1e9", "1.5.5", "-"])("keeps %j, flags it and commits nothing", async (text) => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithIntl(<NumberField id="price" label="Price" value={350000} onCommit={onCommit} />);
    const input = screen.getByLabelText("Price");
    await user.clear(input);
    await user.type(input, text);
    await user.tab();
    expect(onCommit).not.toHaveBeenCalled();
    // The reader's text stays, instead of vanishing and the old figure coming back.
    expect(input).toHaveValue(text);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Not a number — try 75,000");
    expect(input).toHaveAccessibleDescription(/Not a number/);
  });

  it("gives the example in the locale's own format", async () => {
    const user = userEvent.setup();
    renderWithIntl(<NumberField id="prix" label="Prix" value={1} onCommit={vi.fn()} />, {
      locale: "fr-CA",
    });
    const input = screen.getByLabelText("Prix");
    await user.clear(input);
    await user.type(input, "abc");
    await user.tab();
    expect(screen.getByRole("alert").textContent).toMatch(/75\s000/);
  });

  it("clears the message once the reader types again, and commits a valid entry", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithIntl(<NumberField id="price" label="Price" value={350000} onCommit={onCommit} />);
    const input = screen.getByLabelText("Price");
    await user.clear(input);
    await user.type(input, "abc");
    await user.tab();
    await user.click(input);
    // Refocusing keeps the entry so it can be fixed rather than retyped.
    expect(input).toHaveValue("abc");
    await user.type(input, "{Backspace}{Backspace}{Backspace}500");
    expect(screen.queryByRole("alert")).toBeNull();
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith(500);
    expect(input).not.toHaveAttribute("aria-invalid");
  });

  it("shows a derived default in a quieter, lighter face than typed text", () => {
    renderWithIntl(
      <NumberField id="price" label="Price" value={null} placeholder={400000} onCommit={vi.fn()} />,
    );
    const cls = screen.getByLabelText("Price").className;
    expect(cls).toContain("placeholder:text-ink3");
    expect(cls).toContain("placeholder:font-normal");
  });

  it("shows the derived default as a placeholder, not as a value", () => {
    // "Absent means derived": an untouched field still shows a real, correct
    // number -- the city benchmark -- but as a hint, so it cannot be mistaken
    // for something the user typed.
    renderWithIntl(
      <NumberField id="price" label="Price" value={null} placeholder={400000} onCommit={vi.fn()} />,
    );
    const input = screen.getByLabelText("Price");
    expect(input).toHaveValue("");
    expect(input).toHaveAttribute("placeholder", "400,000");
  });

  it("commits NOTHING when a derived field is focused and left untouched", async () => {
    // The bug this guards: focus materialised the placeholder into the draft and
    // blur committed it, so tabbing through a form silently converted every
    // derived default into an explicit user edit -- pinning price to one city's
    // benchmark and the rate across the 20% boundary.
    const onCommit = vi.fn();
    renderWithIntl(
      <NumberField id="price" label="Price" value={null} placeholder={400000} onCommit={onCommit} />,
    );
    const user = userEvent.setup();
    await user.click(screen.getByLabelText("Price"));
    await user.tab();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("still commits null when an EDITED field is blanked", async () => {
    const onCommit = vi.fn();
    renderWithIntl(
      <NumberField id="price" label="Price" value={512000} placeholder={400000} onCommit={onCommit} />,
    );
    const user = userEvent.setup();
    await user.clear(screen.getByLabelText("Price"));
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith(null);
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
      locale: "fr-CA",
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

describe("NumberField — what is shown is what is used", () => {
  it("never displays fewer decimals than the committed value carries", () => {
    renderWithIntl(<NumberField id="r" label="Rate" value={5.25} onCommit={vi.fn()} />);
    expect(screen.getByLabelText("Rate")).toHaveValue("5.25");
  });

  it("uses the locale's decimal mark for those decimals", () => {
    renderWithIntl(<NumberField id="r" label="Taux" value={5.25} onCommit={vi.fn()} />, {
      locale: "fr-CA",
    });
    expect(screen.getByLabelText("Taux")).toHaveValue("5,25");
  });

  it("honours dp as a minimum, so a whole rate still reads as a rate", () => {
    renderWithIntl(<NumberField id="r" label="Rate" value={5} dp={2} onCommit={vi.fn()} />);
    expect(screen.getByLabelText("Rate")).toHaveValue("5.00");
  });

  it("clamps an absurd entry to MAX_AMOUNT when the caller gives no max", async () => {
    const user = userEvent.setup();
    const onCommit = vi.fn();
    renderWithIntl(<NumberField id="p" label="Price" value={null} onCommit={onCommit} />);
    await user.type(screen.getByLabelText("Price"), "12345678901234567890");
    await user.tab();
    expect(onCommit).toHaveBeenLastCalledWith(1_000_000_000);
  });
});
