import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SegmentedGroup } from "./segmented-group";

const OPTIONS = [
  { value: "house" as const, label: "Resale house" },
  { value: "condo" as const, label: "Resale condo" },
  { value: "newbuild" as const, label: "New build" },
];

type Ptype = (typeof OPTIONS)[number]["value"];

const renderGroup = (value: Ptype = "house", onChange: (v: Ptype) => void = () => {}) =>
  render(
    <SegmentedGroup value={value} onChange={onChange} label="Property type" options={OPTIONS} />,
  );

describe("SegmentedGroup", () => {
  it("names the group with its label, so the options are not read bare", () => {
    renderGroup();
    expect(screen.getByRole("radiogroup", { name: "Property type" })).toBeInTheDocument();
  });

  it("marks exactly one option checked", () => {
    renderGroup("condo");
    const checked = screen.getAllByRole("radio").filter((r) => r.getAttribute("aria-checked") === "true");
    expect(checked.map((r) => r.textContent)).toEqual(["Resale condo"]);
  });

  it("moves the selection with the arrow keys, as a radiogroup must", async () => {
    const chosen: string[] = [];
    const user = userEvent.setup();
    renderGroup("house", (v) => void chosen.push(v));
    screen.getByRole("radio", { name: "Resale house" }).focus();
    await user.keyboard("{ArrowRight}");
    expect(chosen).toEqual(["condo"]);
  });

  it("puts only the checked option in the tab order", () => {
    // Roving tabindex: a radiogroup is one tab stop, not three.
    renderGroup("condo");
    const tabbable = screen.getAllByRole("radio").filter((r) => r.getAttribute("tabindex") === "0");
    expect(tabbable.map((r) => r.textContent)).toEqual(["Resale condo"]);
  });

  /**
   * The layout invariant, pinned as a class because jsdom has no layout engine.
   *
   * These buttons sit in one row, and a flex item defaults to `min-width: auto` — it
   * refuses to shrink below its own min-content. For this control min-content is the sum
   * of the longest single WORD in each option, since a word cannot break. English never
   * reaches the limit. Ukrainian did, on two controls, measured in a browser at a real
   * 320px viewport: property type at 278px and investment return at 286px, against a
   * 256px budget (a 320px phone less the page's px-5 and the card's p-3). Both pushed the
   * whole page wider than the viewport on four pages.
   *
   * `min-w-0` lets the row give way, and the global `overflow-wrap: break-word` in
   * globals.css breaks the word only when it would otherwise overflow — so a line that
   * already fits is untouched. Together they make the overflow unrepresentable rather
   * than a length budget every future translator has to be told about.
   *
   * A rendering test cannot see this and neither can a character count: French passes at
   * 31 characters where Ukrainian failed at 36, because Cyrillic runs wider per character.
   * Measuring in a browser is the only real check; this stops the fix being deleted.
   */
  it("lets a long label shrink rather than widen the page, and centres it when it wraps", () => {
    renderGroup();
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.className, radio.textContent ?? "").toContain("min-w-0");
      // `justify-center` centres the anonymous flex item, not the lines inside it, so a
      // label that wraps to two lines is start-aligned without this — which French
      // ("Construction neuve") and Spanish ("Condominio de reventa") both do at 320px.
      expect(radio.className, radio.textContent ?? "").toContain("text-center");
    }
  });
});
