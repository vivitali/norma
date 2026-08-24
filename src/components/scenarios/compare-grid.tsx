"use client";

import { useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import type { ScenarioResult } from "@/domain/engine";
import { usePercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Provenance, type ProvenanceKind } from "@/components/provenance";

export interface MetricRow {
  label: string;
  /** Rendered per column. */
  value: (column: ScenarioResult) => string;
  mark?: ProvenanceKind;
  strong?: boolean;
  /** Highlights the column this metric most favours. */
  best?: (columns: readonly ScenarioResult[]) => number | null;
}

/**
 * One metric group across the four down-payment columns.
 *
 * A real table, not a grid of divs: the columns ARE a comparison, so the header
 * cells have to be header cells or a screen reader reads forty loose numbers.
 * It scrolls inside its own container rather than widening the page.
 */
export function CompareGrid({
  columns,
  rows,
  recommendedPct,
  yoursPct,
  caption,
}: {
  columns: readonly ScenarioResult[];
  rows: readonly MetricRow[];
  recommendedPct: number | null;
  /**
   * The down payment the reader actually chose.
   *
   * Distinct from `recommendedPct`, and the distinction is the point: four
   * columns sat here with only the recommendation marked, so the one the reader
   * had actually picked was indistinguishable from two they had not. When the
   * two marks fall on different columns, that gap is the finding this screen
   * exists to deliver.
   */
  yoursPct: number;
  /** Names the table. Four identically-shaped unnamed tables read as noise. */
  caption: string;
}) {
  const t = useTranslations("Scenarios");
  const pct = usePercent();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const ownRef = useRef<HTMLTableCellElement>(null);

  /**
   * Bring the reader's own column into the scroller when it would start off
   * screen.
   *
   * At 320px the scroller is 280px wide and the four columns run to 560px, so
   * the metric column plus one data column is all that fits. With the default
   * 10% down the reader's own column began at x=277 — inside the box by three
   * pixels, which is to say invisible. An accent marking a column you have to go
   * looking for is worth nothing.
   *
   * No dependency array, and a "have I done this yet" ref rather than a
   * ResizeObserver. Three of the four grids on this page live inside `hidden`
   * panels, and an observer attached to a `display: none` element did not fire
   * when the panel opened — measured: one grid aligned, three sat at
   * scrollLeft 0. Running after every render instead cannot miss, because the
   * page re-renders when a section opens, and the ref makes it a single scroll
   * per choice rather than a fight with a reader scrolling the table themselves.
   */
  const alignedFor = useRef<number | null>(null);
  useEffect(() => {
    const scroller = scrollerRef.current;
    const own = ownRef.current;
    // clientWidth is 0 while the panel is closed: nothing to measure against yet.
    if (!scroller || !own || scroller.clientWidth === 0) return;
    if (alignedFor.current === yoursPct) return;
    alignedFor.current = yoursPct;

    const visible =
      own.offsetLeft >= scroller.scrollLeft &&
      own.offsetLeft + own.offsetWidth <= scroller.scrollLeft + scroller.clientWidth;
    if (visible) return;
    scroller.scrollLeft = Math.max(
      0,
      own.offsetLeft - (scroller.clientWidth - own.offsetWidth) / 2,
    );
  });

  return (
    <div
      ref={scrollerRef}
      // Two classes, both load-bearing, both for the same symptom.
      //
      // `min-w-0`: this is a flex item and `min-width: auto` is the flex default,
      // so without it the container refuses to shrink below the 560px table and
      // overflow-x-auto never engages — the PAGE scrolls sideways instead of the
      // table.
      //
      // `relative`: the sr-only "best of the four" markers inside the cells are
      // position: absolute, and with no positioned ancestor they resolve against
      // the document. At 320px that put them at x=568 — past the viewport, and
      // scrolling the page 248px. Making this their containing block puts them
      // inside the scroller, where overflow clips them.
      //
      // Both only appear with a section open, which is how they survived a sweep
      // that measured closed pages.
      className="relative min-w-0 overflow-x-auto"
    >
      <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border">
            <th scope="col" className="py-1.5 pr-3 text-left font-medium text-ink3">
              {t("metric")}
            </th>
            {columns.map((column) => (
              <th
                key={column.dpPct}
                ref={column.dpPct === yoursPct ? ownRef : undefined}
                scope="col"
                // aria-current marks the reader's own column for a screen reader,
                // which the tint does visually. "Recommended" stays a label
                // rather than a second surface — two tinted columns would read as
                // one selection split in half.
                aria-current={column.dpPct === yoursPct ? "true" : undefined}
                className={cn(
                  "py-1.5 pr-3 text-right",
                  column.dpPct === yoursPct && "bg-acbg",
                  column.dpPct === recommendedPct ? "font-semibold text-ac" : "font-medium text-ink2",
                )}
              >
                {t("column", { p: pct(column.dpPct) })}
                {column.dpPct === yoursPct ? (
                  <span className="block text-[10.5px] font-normal text-ac">{t("yours")}</span>
                ) : null}
                {column.dpPct === recommendedPct ? (
                  <span className="block text-[10.5px] font-normal">{t("recommended")}</span>
                ) : null}
                {column.belowMinimum ? (
                  <span className="block text-[10.5px] font-normal text-caution">
                    {t("fMinimum", { p: pct(column.dpPctEff, 1) })}
                  </span>
                ) : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const best = row.best?.(columns) ?? null;
            return (
              <tr key={row.label} className="border-b border-hairline">
                <th
                  scope="row"
                  className={
                    row.strong
                      ? "py-1.5 pr-3 text-left font-semibold"
                      : "py-1.5 pr-3 text-left font-normal text-ink2"
                  }
                >
                  {row.label}
                  {row.mark ? <Provenance kind={row.mark} /> : null}
                </th>
                {columns.map((column, i) => (
                  <td
                    key={column.dpPct}
                    className={cn(
                      "py-1.5 pr-3 text-right tabular-nums",
                      column.dpPct === yoursPct && "bg-acbg",
                      i === best ? "font-semibold text-pass" : row.strong && "font-semibold",
                    )}
                  >
                    {row.value(column)}
                    {/*
                      The single fact this grid exists to convey cannot be carried
                      by colour alone. text-pass is the visual encoding; this is
                      the one a screen reader and a colour-blind reader get.
                    */}
                    {i === best ? <span className="sr-only"> · {t("bestHere")}</span> : null}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
