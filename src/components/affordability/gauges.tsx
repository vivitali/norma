"use client";

import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { gaugeBar } from "@/lib/scale";
import { usePercent } from "@/lib/format";
import { cn } from "@/lib/utils";

const FILL = {
  pass: "bg-pass",
  caution: "bg-caution",
  blocked: "bg-blocked",
} as const;

/**
 * GDS and TDS at the target price, on a shared 60% axis so the two bars are
 * comparable rather than each scaled to its own limit.
 */
export function Gauges({ result }: { result: AffordabilityResult }) {
  const t = useTranslations("Affordability");
  const pct = usePercent();

  const rows = [
    { code: "GDS", name: t("mGdsFull"), value: result.gdsAtTarget, limit: federal.gds },
    { code: "TDS", name: t("mTdsFull"), value: result.tdsAtTarget, limit: federal.tds },
  ];

  return (
    <div className="flex flex-col gap-3">
      <span className="micro text-text-faint">{t("mRatios")}</span>
      {rows.map((row) => {
        const bar = gaugeBar(row.value, row.limit);
        return (
          <div key={row.code} className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-[11px] text-muted-foreground">{row.name}</span>
              <span className="figure text-[11px] font-semibold">{pct(row.value, 1)}</span>
            </div>
            {/*
              role="img" with a full label: a bare div is invisible to a screen
              reader, and this bar is the whole point of the row.
            */}
            <div
              role="img"
              aria-label={`${row.code} ${pct(row.value, 1)}, ${t("mLimitWord")} ${pct(row.limit)}`}
              className="relative h-1.5 w-full rounded-sm bg-surface-sunken"
            >
              <span
                className={cn("absolute inset-y-0 left-0 rounded-sm", FILL[bar.state])}
                style={{ width: `${bar.width}%` }}
              />
              <span
                className="absolute -inset-y-1 w-px bg-foreground"
                style={{ left: `${bar.limitPct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
