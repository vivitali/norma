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
 * Bring the reader's own scenario into view inside a scroller that starts
 * elsewhere.
 *
 * At 320px the table scroller is 280px wide and the four columns run to 560px,
 * so the metric column plus one data column is all that fits. With the default
 * 10% down the reader's own column began at x=277 — inside the box by three
 * pixels, which is to say invisible. An accent marking a column you have to go
 * looking for is worth nothing. The card carousel has the same problem in a
 * different shape: card two of four starts a full viewport off screen.
 *
 * No dependency array, and a "have I done this yet" ref rather than a
 * ResizeObserver. Three of the four grids on this page live inside `hidden`
 * panels, and an observer attached to a `display: none` element did not fire
 * when the panel opened — measured: one grid aligned, three sat at scrollLeft 0.
 * Running after every render instead cannot miss, because the page re-renders
 * when a section opens, and the ref makes it a single scroll per choice rather
 * than a fight with a reader scrolling the table themselves.
 *
 * The same hook runs twice per grid, once for the table and once for the
 * carousel. Only one of the two is laid out at any width — the other is
 * `display: none` and measures 0 — which the `clientWidth` guard already covers,
 * so neither instance ever fights the other.
 */
function useOwnInView<S extends HTMLElement, O extends HTMLElement>(yoursPct: number) {
  const scrollerRef = useRef<S>(null);
  const ownRef = useRef<O>(null);
  const alignedFor = useRef<number | null>(null);

  useEffect(() => {
    const scroller = scrollerRef.current;
    const own = ownRef.current;
    // clientWidth is 0 while the panel is closed, and while this layout is the
    // one the breakpoint hides: nothing to measure against yet.
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

  return { scrollerRef, ownRef };
}

/**
 * One metric group across the four down-payment columns.
 *
 * Two layouts of the same figures, swapped at `sm`, because the comparison does
 * not survive a 320px viewport as a table:
 *
 * - **From `sm`, a real table**, not a grid of divs: the columns ARE a
 *   comparison, so the header cells have to be header cells or a screen reader
 *   reads forty loose numbers. It scrolls inside its own container rather than
 *   widening the page.
 * - **Below `sm`, a card carousel** — one scenario per card, each card wide
 *   enough to put a label beside its own figure. A table narrowed to a phone
 *   shows one column at a time and asks the reader to hold a row label in their
 *   head while they scroll sideways to find the number for it. The reference is
 *   explicit about this: "on phone the grid becomes a card carousel, never a
 *   horizontally-scrolling table."
 *
 * The carousel is a scroller, not a set of tabs: every card is present and
 * readable in order, so this adds no second way to *reveal* anything (DESIGN.md
 * §8) — it re-lays the same figures out. Nothing inside a card is focusable
 * except the provenance marks the table already carried, so there is nothing to
 * trap; the list itself takes `tabindex` so a keyboard can scroll it in the
 * browsers that do not make scrollers focusable on their own.
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
  // Destructured, not held as an object: the refs lint rule reads `x.ownRef` as
  // an access to a ref's value during render and cannot tell the two apart.
  const { scrollerRef: tableRef, ownRef: ownColumnRef } = useOwnInView<
    HTMLDivElement,
    HTMLTableCellElement
  >(yoursPct);
  const { scrollerRef: cardsRef, ownRef: ownCardRef } = useOwnInView<
    HTMLUListElement,
    HTMLLIElement
  >(yoursPct);

  /** Resolved once per render, not once per card: `best` reads all four columns. */
  const bests = rows.map((row) => row.best?.(columns) ?? null);

  return (
    <>
      <div
        ref={tableRef}
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
        //
        // `hidden sm:block`: below `sm` the cards below are the layout, and a
        // display:none table leaves the accessibility tree, so the two never read
        // the same figures twice.
        className="relative hidden min-w-0 overflow-x-auto sm:block"
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
                  ref={column.dpPct === yoursPct ? ownColumnRef : undefined}
                  scope="col"
                  // aria-current marks the reader's own column for a screen reader,
                  // which the tint does visually. "Recommended" stays a label
                  // rather than a second surface — two tinted columns would read as
                  // one selection split in half.
                  aria-current={column.dpPct === yoursPct ? "true" : undefined}
                  className={cn(
                    "py-1.5 pr-3 text-right",
                    column.dpPct === yoursPct && "bg-acbg",
                    column.dpPct === recommendedPct
                      ? "font-semibold text-ac"
                      : "font-medium text-ink2",
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
            {rows.map((row, r) => {
              const best = bests[r];
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

      {/*
        `role="list"` is explicit because preflight sets `list-style: none`, and
        VoiceOver drops an unroled list — the same reason AppNav spells it out.
        `min-w-0` and `relative` are here for the two reasons above, unchanged:
        the cards are the flex item that must be allowed to shrink, and the
        sr-only markers inside them need a positioned ancestor to be clipped by.
      */}
      <ul
        ref={cardsRef}
        role="list"
        aria-label={caption}
        tabIndex={0}
        className="relative flex min-w-0 snap-x snap-mandatory gap-3 overflow-x-auto pb-1 sm:hidden"
      >
        {columns.map((column) => {
          const isYours = column.dpPct === yoursPct;
          return (
            <li
              key={column.dpPct}
              ref={isYours ? ownCardRef : undefined}
              aria-current={isYours ? "true" : undefined}
              className={cn(
                "w-full shrink-0 snap-center rounded-lg border p-3",
                isYours ? "border-acbr bg-acbg" : "border-border bg-card",
              )}
            >
              <p className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span
                  className={cn(
                    "text-[17px] font-semibold tracking-[-0.02em]",
                    column.dpPct === recommendedPct && "text-ac",
                  )}
                >
                  {t("column", { p: pct(column.dpPct) })}
                </span>
                {isYours ? <span className="eyebrow text-ac">{t("yours")}</span> : null}
                {column.dpPct === recommendedPct ? (
                  <span className="eyebrow text-ink2">{t("recommended")}</span>
                ) : null}
              </p>
              {column.belowMinimum ? (
                <p className="micro pt-1 text-caution">
                  {t("fMinimum", { p: pct(column.dpPctEff, 1) })}
                </p>
              ) : null}
              <dl className="mt-2.5">
                {rows.map((row, r) => {
                  const best = bests[r];
                  const isBest = columns.indexOf(column) === best;
                  return (
                    <div
                      key={row.label}
                      className="flex items-baseline justify-between gap-3 border-b border-hairline py-1.5 last:border-b-0"
                    >
                      <dt
                        className={cn(
                          "min-w-0 text-[12.5px] leading-[1.35]",
                          row.strong ? "font-semibold" : "text-ink2",
                        )}
                      >
                        {row.label}
                        {row.mark ? <Provenance kind={row.mark} /> : null}
                      </dt>
                      <dd
                        className={cn(
                          "text-right text-[13px] tabular-nums whitespace-nowrap",
                          isBest ? "font-semibold text-pass" : row.strong && "font-semibold",
                        )}
                      >
                        {row.value(column)}
                        {isBest ? <span className="sr-only"> · {t("bestHere")}</span> : null}
                      </dd>
                    </div>
                  );
                })}
              </dl>
            </li>
          );
        })}
      </ul>
    </>
  );
}
