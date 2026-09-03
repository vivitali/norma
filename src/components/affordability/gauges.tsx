"use client";

import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import { useRules } from "@/hooks/use-country";
import { gaugeBar } from "@/lib/scale";
import { usePercent } from "@/lib/format";
import { figureClass } from "@/lib/tone";
import { cn } from "@/lib/utils";

/** GDS and TDS at the target price, on a shared 60% axis so the bars compare. */
export function Gauges({ result }: { result: AffordabilityResult }) {
  const t = useTranslations("Affordability");
  const pct = usePercent();
  const rules = useRules();

  const rows = [
    { code: "GDS", short: t("gdsShort"), value: result.gdsAtTarget, limit: rules.gds },
    { code: "TDS", short: t("tdsShort"), value: result.tdsAtTarget, limit: rules.tds },
  ];

  return (
    <div className="mt-6 grid max-w-[820px] grid-cols-1 gap-7 sm:grid-cols-2">
      {rows.map((row) => {
        const bar = gaugeBar(row.value, row.limit);
        return (
          <div key={row.code}>
            <div className="mb-[9px] flex items-baseline gap-2.5">
              <span className="text-[12.5px] font-semibold tracking-[0.04em]">{row.code}</span>
              <span className="min-w-0 flex-1 text-[12.5px] text-ink3">{row.short}</span>
              <span className={cn("text-[17px] font-semibold", figureClass(bar.state))}>
                {pct(row.value, 1)}
              </span>
            </div>
            <div
              role="img"
              aria-label={`${row.code} ${pct(row.value, 1)}, ${pct(row.limit)} ${t("limitWord")}`}
              className="relative h-2 overflow-hidden rounded-full bg-sunk"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "absolute inset-y-0 left-0 rounded-full",
                  bar.state === "pass" ? "bg-pass" : bar.state === "caution" ? "bg-caution" : "bg-blocked",
                )}
                style={{ width: `${bar.width}%` }}
              />
              <span
                aria-hidden="true"
                className="absolute inset-y-0 w-0.5 bg-ink"
                style={{ left: `${bar.limitPct}%` }}
              />
            </div>
            <div className="mt-[7px] text-[11.5px] text-ink3">
              {pct(row.limit)} {t("limitWord")}
            </div>
          </div>
        );
      })}
    </div>
  );
}
