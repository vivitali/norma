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
 * The three markers sit at three different heights and the lender ceiling is
 * pinned to the right edge rather than positioned by value. That is what stops
 * them colliding: comfort, ceiling and target routinely land within a few
 * percent of each other, and v1 stacked all three labels in the same band of
 * pixels, which rendered them unreadable.
 */
export function GapBand({ result, price }: { result: AffordabilityResult; price: number }) {
  const t = useTranslations("Affordability");
  const fmt = useMoney();
  const band = gapBand(result.comfort, result.ceiling, price);
  const comfortAlign = markerAlign(band.comfortPct);
  const targetAlign = markerAlign(band.targetPct);

  return (
    <div className="mb-[22px] max-w-[820px]">
      <div className="relative h-[104px]">
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

        {/* Pinned right, not positioned by value, AND on its own row: the ceiling
            is the top of the scale, and the target routinely lands within a few
            percent of it, so sharing a row would put the two labels on top of
            each other exactly when the target is highest. */}
        <div className="absolute top-[76px] right-0 flex items-baseline gap-2">
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
