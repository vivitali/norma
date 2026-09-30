import { describe, expect, it } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { gapBand } from "@/lib/scale";
import type { AffordabilityResult } from "@/domain/engine";
import { GapBand, labelMaxWidth } from "./gap-band";

const result = (comfort: number, ceiling: number) => ({ comfort, ceiling }) as AffordabilityResult;

describe("GapBand — the lender ceiling sits where its value puts it", () => {
  it.each([
    // The default Winnipeg shape: the ceiling is the LOWEST of the three.
    [400000, 346776, 454264],
    // The default Toronto shape: comfort above the ceiling.
    [520000, 450000, 430000],
    // Ceiling is the top of the scale: it may still be at the edge.
    [300000, 500000, 350000],
  ])("comfort %i, ceiling %i, target %i", (comfort, ceiling, price) => {
    renderWithIntl(<GapBand result={result(comfort, ceiling)} price={price} />);
    const marker = screen.getByTestId("gap-ceiling");
    expect(marker.style.left).toBe(`${gapBand(comfort, ceiling, price).ceilingPct}%`);
  });

  it("does not pin the ceiling right when another figure is higher", () => {
    renderWithIntl(<GapBand result={result(400000, 346776)} price={454264} />);
    expect(screen.getByTestId("gap-ceiling").style.left).not.toBe("100%");
    expect(screen.getByTestId("gap-ceiling").className).not.toContain("right-0");
  });
});

describe("labelMaxWidth — a label may not leave the band", () => {
  it("allows a centred label half its room either side of the nearer edge", () => {
    expect(labelMaxWidth("center", 84)).toBe(32);
    expect(labelMaxWidth("center", 50)).toBe(100);
  });
  it("runs an end-aligned label back from the marker and a start-aligned one forward", () => {
    expect(labelMaxWidth("end", 95)).toBe(95);
    expect(labelMaxWidth("start", 5)).toBe(95);
  });
  it("never squeezes a label below a readable width", () => {
    expect(labelMaxWidth("start", 99)).toBe(20);
  });
  it("caps every rendered marker", () => {
    renderWithIntl(<GapBand result={result(380828, 366989)} price={439216} />);
    expect(screen.getByTestId("gap-ceiling").style.maxWidth).toMatch(/%$/);
  });
});
