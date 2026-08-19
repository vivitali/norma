"use client";

import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import { gapBand, markerAlign } from "@/lib/scale";
import { useMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

const ALIGN = { start: "justify-start", center: "justify-center", end: "justify-end" } as const;

/**
 * The distance between what fits and what a lender would sign.
 *
 * The two numbers can land either way round. Below the ceiling, the band is the
 * danger zone lenders approve into. Above it, the lender is the binding limit —
 * a different fact, so it gets its own copy and its own colour rather than being
 * clamped to zero.
 */
export function GapBand({ result, price }: { result: AffordabilityResult; price: number }) {
  const t = useTranslations("Affordability");
  const fmt = useMoney();
  const band = gapBand(result.comfort, result.ceiling, price);

  const tone = band.inverted
    ? { fill: "bg-band-bg", edge: "border-band-border", text: "text-band" }
    : { fill: "bg-caution-bg", edge: "border-caution-border", text: "text-caution" };

  const marker = (pct: number, label: string, value: string, emphasis?: boolean) => (
    <div
      className={cn("absolute top-0 flex w-28 -translate-x-1/2 flex-col", ALIGN[markerAlign(pct)])}
      style={{ left: `${pct}%` }}
    >
      <span className="micro text-text-faint">{label}</span>
      <span className={cn("figure text-[11px]", emphasis && "font-semibold")}>{value}</span>
    </div>
  );

  return (
    <section aria-labelledby="gap" className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
      <h2 id="gap" tabIndex={-1} className="text-[13px] font-semibold">
        {t("gapTitle")}
      </h2>

      <div className="relative mt-1 h-2 w-full rounded-sm bg-surface-sunken">
        {band.hasBand ? (
          <span
            className={cn("absolute inset-y-0 rounded-sm border", tone.fill, tone.edge)}
            style={{ left: `${band.bandLeft}%`, width: `${band.bandWidth}%` }}
          />
        ) : null}
        <span
          className="absolute inset-y-0 w-0.5 bg-primary"
          style={{ left: `${band.comfortPct}%` }}
        />
        <span
          className="absolute -inset-y-1 w-0.5 bg-foreground"
          style={{ left: `${band.targetPct}%` }}
        />
      </div>

      <div className="relative h-9">
        {marker(band.comfortPct, t("stComfort"), fmt(result.comfort), true)}
        {marker(band.targetPct, t("gapTarget"), fmt(price))}
        {marker(band.ceilingPct, t("stCeiling"), fmt(result.ceiling))}
      </div>

      <p className={cn("max-w-prose text-[11.5px]", tone.text)}>
        {band.inverted ? t("gapZoneInv") : t("gapZone")}
      </p>
      <p className="text-[11px] text-muted-foreground">
        <span className="figure">{fmt(Math.abs(result.gap))}</span>{" "}
        {band.inverted ? t("gapOfInv") : t("gapOf")}
      </p>
    </section>
  );
}
