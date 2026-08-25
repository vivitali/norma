"use client";

import { useTranslations } from "next-intl";
import type { GlidePathResult } from "@/domain/engine";
import { useMoney } from "@/lib/format";

/**
 * The glide path as a bar per quarter, with the target as a rule across it.
 *
 * A chart rather than a table because the only question is "does the line reach
 * the line, and roughly when" — a shape reads that faster than 36 numbers. The
 * figure is aria-hidden and the same fact is stated in words beside it, so
 * nothing here depends on reading a pixel position.
 */
export function GlideChart({ glide }: { glide: GlidePathResult }) {
  const t = useTranslations("DownPayment");
  const fmt = useMoney();
  const top = Math.max(glide.max, 1);
  // Every third month: 36 bars is noise at this width, 12 is a shape.
  const bars = glide.series.filter((point) => point.m > 0 && point.m % 3 === 0);
  const targetPct = Math.min(100, (glide.target / top) * 100);

  return (
    <div className="mt-1 mb-4 max-w-[620px]">
      <div aria-hidden="true" className="relative flex h-[120px] items-end gap-[3px]">
        {glide.target > 0 ? (
          <div
            className="absolute right-0 left-0 border-t border-dashed border-ac"
            style={{ bottom: `${targetPct}%` }}
          />
        ) : null}
        {bars.map((point) => (
          <div
            key={point.m}
            className={
              glide.reach !== null && point.m >= glide.reach
                ? "flex-1 rounded-t-[2px] bg-pass"
                : "flex-1 rounded-t-[2px] bg-ac/35"
            }
            style={{ height: `${Math.max(2, (point.saved / top) * 100)}%` }}
          />
        ))}
      </div>
      <div className="flex justify-between pt-1.5 text-[11px] text-ink3">
        <span>{t("month", { m: 3 })}</span>
        {glide.target > 0 ? <span>{`${fmt(glide.target)} · ${t("shortfallLabel")}`}</span> : null}
        <span>{t("month", { m: glide.months })}</span>
      </div>
    </div>
  );
}
