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
export function GapBand({ result, price }: { result: AffordabilityResult; price: number }) {
  const t = useTranslations("Affordability");
  const fmt = useMoney();
  const band = gapBand(result.comfort, result.ceiling, price);
  const comfortAlign = markerAlign(band.comfortPct);
  const targetAlign = markerAlign(band.targetPct);
  const ceilingAlign = markerAlign(band.ceilingPct);

  return (
    <div className="mb-[22px] max-w-[820px]">
      <div className="relative h-[108px]">
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
          className={cn("absolute top-0 flex flex-col gap-[5px]", ALIGN[comfortAlign], SHIFT[comfortAlign])}
          style={{ left: `${band.comfortPct}%` }}
        >
          <span className="text-[13px] font-semibold whitespace-nowrap text-ac">
            {fmt(result.comfort)}
          </span>
          <span aria-hidden="true" className="h-[9px] w-0.5 bg-ac" />
        </div>

        <div
          className={cn("absolute top-[42px] flex flex-col gap-[5px]", ALIGN[targetAlign], SHIFT[targetAlign])}
          style={{ left: `${band.targetPct}%` }}
        >
          <span aria-hidden="true" className="h-[9px] w-0.5 bg-ink" />
          <span className="text-[12.5px] font-medium whitespace-nowrap">
            {t("gapTarget")} {fmt(price)}
          </span>
        </div>

        <div
          data-testid="gap-ceiling"
          className={cn("absolute top-[76px] flex flex-col gap-[5px]", ALIGN[ceilingAlign], SHIFT[ceilingAlign])}
          style={{ left: `${band.ceilingPct}%` }}
        >
          <span aria-hidden="true" className="h-[9px] w-0.5 bg-ink3" />
          <span className="text-[12.5px] whitespace-nowrap text-ink3">
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
