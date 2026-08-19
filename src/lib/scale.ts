/**
 * Presentation geometry: percentages for bars, bands and gauges. Never money —
 * every figure on screen comes from src/domain/. This module exists so the page
 * contains no arithmetic in JSX and so the awkward cases (the inverted band, a
 * target off the end of the scale, a zero denominator) are tested rather than
 * eyeballed.
 */

const clamp = (v: number) => Math.max(0, Math.min(100, v));

export interface GapBand {
  comfortPct: number;
  ceilingPct: number;
  targetPct: number;
  bandLeft: number;
  bandWidth: number;
  /** comfort > ceiling: the lender is the binding limit. Different copy, different colour. */
  inverted: boolean;
  /** Below this the band is a hairline and is not drawn. */
  hasBand: boolean;
}

export function gapBand(comfort: number, ceiling: number, price: number): GapBand {
  const lo = Math.min(comfort, ceiling);
  const hi = Math.max(comfort, ceiling);
  const scale = Math.max(hi, price) * 1.03 || 1;
  const pct = (v: number) => clamp((v / scale) * 100);
  const bandLeft = pct(lo);
  const bandWidth = clamp(pct(hi) - bandLeft);
  return {
    comfortPct: pct(comfort),
    ceilingPct: pct(ceiling),
    targetPct: pct(price),
    bandLeft,
    bandWidth,
    inverted: comfort > ceiling,
    hasBand: bandWidth > 0.8,
  };
}

/** The reference's fixed 60% axis, so GDS and TDS are comparable bar to bar. */
const GAUGE_MAX = 60;

export interface GaugeBar {
  width: number;
  limitPct: number;
  state: "pass" | "caution" | "blocked";
}

export function gaugeBar(value: number, limit: number): GaugeBar {
  return {
    width: clamp((value / GAUGE_MAX) * 100),
    limitPct: clamp((limit / GAUGE_MAX) * 100),
    state: value <= limit * 0.9 ? "pass" : value <= limit ? "caution" : "blocked",
  };
}

/** The debt cost as a share of the ceiling the household would have had without it. */
export function impactWidth(debtCapacity: number, ceiling: number): number {
  return clamp((debtCapacity / Math.max(1, ceiling + debtCapacity)) * 100);
}

/** The down payment's share of total cash at closing, for the stat strip's split bar. */
export function splitWidth(down: number, cash: number): number {
  return cash > 0 ? clamp((down / cash) * 100) : 50;
}

/** Keep a marker's label on the bar rather than hanging off its end. */
export function markerAlign(pct: number): "start" | "center" | "end" {
  if (pct > 86) return "end";
  if (pct < 14) return "start";
  return "center";
}
