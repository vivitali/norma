"use client";

import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import { gapBand, markerAlign } from "@/lib/scale";
import { useMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const ALIGN = { start: "items-start", center: "items-center", end: "items-end" } as const;
const SHIFT = {
  start: "translate-x-0",
  center: "-translate-x-1/2",
  end: "-translate-x-full",
} as const;

/**
 * The widest a marker's label may be before it would leave the band, as a percentage of the
 * band. A centred label reaches half its width either side of the marker, an end-aligned one
 * runs back from it, a start-aligned one forward. Without the cap a long label (Ukrainian
 * "Межа кредитора 366 989 $" at a 320px viewport) hung 3px past the page edge; with it, the label
 * wraps instead of clipping or scrolling the page sideways.
 */
export function labelMaxWidth(align: "start" | "center" | "end", pct: number): number {
  const room = align === "start" ? 100 - pct : align === "end" ? pct : 2 * Math.min(pct, 100 - pct);
  return Math.max(room, 20);
}

const TEXT = { start: "text-left", center: "text-center", end: "text-right" } as const;

/**
 * Two ceilings on one scale, with the target between them or past them both.
 *
 * Every marker is positioned by its value on the scale (`gapBand`), and the three sit
 * at three different heights: comfort above the bar, target just below it, the lender
 * ceiling on its own third row. The rows are what stop the labels colliding — comfort,
 * ceiling and target routinely land within a few percent of each other, and v1 stacked
 * all three in one band of pixels, which rendered them unreadable.
 *
 * The ceiling is NOT pinned to the right edge. An earlier version did, on the premise
 * that it is the top of the scale; it is not — the scale is max(comfort, ceiling,
 * price) x 1.03, and in the default Winnipeg state the ceiling is the lowest of the
 * three. Pinned right it was drawn past the target while the fill ended at its true
 * position. `markerAlign` keeps an edge value's label on the bar.
 */
export function GapBand({
  result,
  price,
  typical = false,
}: {
  result: AffordabilityResult;
  price: number;
  /** The target is the benchmark price, not one the reader entered. */
  typical?: boolean;
}) {
  const t = useTranslations("Affordability");
  const fmt = useMoney();
  const band = gapBand(result.comfort, result.ceiling, price);
  const comfortAlign = markerAlign(band.comfortPct);
  const targetAlign = markerAlign(band.targetPct);
  const ceilingAlign = markerAlign(band.ceilingPct);

  return (
    <div className="mb-[22px] max-w-[820px]">
      <div className="relative h-[126px] sm:h-[108px]">
        <div aria-hidden="true" className="absolute inset-x-0 top-[30px] h-2 rounded-full bg-sunk" />
        <div
          aria-hidden="true"
          className="absolute top-[30px] h-2 rounded-full bg-ac"
          style={{ width: `${band.bandLeft}%` }}
        />
        {band.hasBand ? (
          <div
            aria-hidden="true"
            className="absolute top-[30px] h-2 bg-caution"
            style={{ left: `${band.bandLeft}%`, width: `${band.bandWidth}%` }}
          />
        ) : null}

        <div
          className={cn("absolute top-0 flex w-max flex-col gap-[5px]", ALIGN[comfortAlign], SHIFT[comfortAlign], TEXT[comfortAlign])}
          style={{ left: `${band.comfortPct}%`, maxWidth: `${labelMaxWidth(comfortAlign, band.comfortPct)}%` }}
        >
          <span className="text-[13px] font-semibold text-ac">
            {fmt(result.comfort)}
          </span>
          <span aria-hidden="true" className="h-[9px] w-0.5 bg-ac" />
        </div>

        <div
          className={cn("absolute top-[42px] flex w-max flex-col gap-[5px]", ALIGN[targetAlign], SHIFT[targetAlign], TEXT[targetAlign])}
          style={{ left: `${band.targetPct}%`, maxWidth: `${labelMaxWidth(targetAlign, band.targetPct)}%` }}
        >
          <span aria-hidden="true" className="h-[9px] w-0.5 bg-ink" />
          <span className="text-[12.5px] font-medium">
            {t(typical ? "gapTargetTypical" : "gapTarget")} {fmt(price)}
          </span>
        </div>

        <div
          data-testid="gap-ceiling"
          className={cn("absolute top-[76px] flex w-max flex-col gap-[5px]", ALIGN[ceilingAlign], SHIFT[ceilingAlign], TEXT[ceilingAlign])}
          style={{ left: `${band.ceilingPct}%`, maxWidth: `${labelMaxWidth(ceilingAlign, band.ceilingPct)}%` }}
        >
          <span aria-hidden="true" className="h-[9px] w-0.5 bg-ink3" />
          <span className="text-[12.5px] text-ink3">
            {t("stCeiling")} {fmt(result.ceiling)}
          </span>
        </div>
      </div>
      <p className="mt-1.5 max-w-[700px] text-[13px] leading-[1.6] text-caution text-pretty">
        {band.inverted ? t("gapZoneInv") : t("gapZone")}
      </p>
    </div>
  );
}
