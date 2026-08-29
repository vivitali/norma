"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * "Show me how you got that."
 *
 * Two shapes, one idea. `CalcTrace` is a derivation — the arithmetic that turns
 * the reader's inputs into the figure at the top of the page, one operand per
 * line, in the order the engine does it. `CalcLedger` is the same disclosure for
 * a figure that is a PROJECTION rather than a sum: a year per row, every column
 * the model carries.
 *
 * Neither knows any copy. Callers pass strings that are already translated and
 * numbers that are already formatted, so there is exactly one place a figure is
 * turned into text on each page — the page's own `useMoney()` — and this file
 * can never drift from it. It also keeps the components out of the message
 * catalogues entirely.
 *
 * The operator lives in its own fixed-width gutter rather than being glued to the
 * value. A minus sign inside the number column reads as a negative amount; a
 * minus sign in the gutter reads as "subtract this", which is what it means, and
 * the two are different claims about the same digits.
 */

export type CalcOp = "plus" | "minus" | "times" | "equals";

const GLYPH: Record<CalcOp, string> = {
  plus: "+",
  minus: "−",
  times: "×",
  equals: "=",
};

export interface CalcLine {
  /** Already translated. */
  label: string;
  /** Already formatted. */
  value: string;
  /** Absent on the opening line, which no operator applies to. */
  op?: CalcOp;
  /** A short qualifier under the row — where the operand itself came from. */
  note?: string;
  /** Draw a rule above this line: a subtotal boundary. */
  rule?: boolean;
  /** A result, not an operand. */
  strong?: boolean;
  /**
   * Marks a line as an ESTIMATE rather than a sourced figure. Rendered as a
   * trailing mark so a reader scanning the column can see which operands the app
   * chose and which it read off a document. Pages pass their existing
   * `<Provenance />` element straight through.
   */
  mark?: ReactNode;
}

export function CalcTrace({
  lines,
  caption,
  className,
}: {
  lines: readonly CalcLine[];
  /** One line above the derivation, naming what is being derived. */
  caption?: string;
  className?: string;
}) {
  return (
    <div className={cn("max-w-[560px]", className)}>
      {caption ? <div className="mb-2 text-[13px] font-semibold">{caption}</div> : null}
      <dl className="m-0">
        {lines.map((line, idx) => (
          <div
            key={`${line.label}-${idx}`}
            className={cn(
              "grid grid-cols-[1.25em_minmax(0,1fr)_auto] items-baseline gap-x-2 py-1.5",
              line.rule && "mt-1 border-t border-hairline pt-2.5",
            )}
          >
            <span
              aria-hidden="true"
              className="text-[13px] leading-[1.45] text-ink3 tabular-nums"
            >
              {line.op ? GLYPH[line.op] : ""}
            </span>
            <dt
              className={cn(
                "min-w-0 text-[13px] leading-[1.45] text-ink2",
                line.strong && "font-semibold text-ink",
              )}
            >
              {/*
                The operator is aria-hidden above and restated here for a screen
                reader, because "− $98,471" read aloud from two cells is
                "minus ninety-eight thousand" either way, while a bare glyph in
                its own cell is announced as punctuation or skipped entirely.
              */}
              {line.op ? <span className="sr-only">{GLYPH[line.op]} </span> : null}
              {line.label}
              {line.mark ? <> {line.mark}</> : null}
            </dt>
            <dd
              className={cn(
                "m-0 text-[13px] whitespace-nowrap tabular-nums",
                line.strong && "font-semibold",
              )}
            >
              {line.value}
            </dd>
            {line.note ? (
              <p className="col-start-2 col-end-4 mt-0.5 text-[11.5px] leading-[1.5] text-ink3 text-pretty">
                {line.note}
              </p>
            ) : null}
          </div>
        ))}
      </dl>
    </div>
  );
}

export interface LedgerColumn {
  key: string;
  /** Already translated. */
  label: string;
  /** Row headers read left; every figure reads right, down its column. */
  numeric?: boolean;
}

export interface LedgerRow {
  key: string | number;
  /** Already-formatted cells, by column key. */
  cells: Record<string, string>;
  /** The reader's own horizon, or the year a thing happens. */
  highlight?: boolean;
}

/**
 * Every year the model computes, not a sample of them.
 *
 * Scrolls inside its own container in BOTH axes: forty rows is taller than a
 * phone and eight money columns are wider than one, and a table that widens the
 * page body is a worse failure than a table the reader has to scroll. The header
 * row sticks so a reader who has scrolled to year 30 can still tell which column
 * they are in.
 */
export function CalcLedger({
  columns,
  rows,
  caption,
  rowHeader,
}: {
  columns: readonly LedgerColumn[];
  rows: readonly LedgerRow[];
  /** Describes the table for a screen reader, and titles it on screen. */
  caption: string;
  /** Which column is the row's header — the year, normally. */
  rowHeader: string;
}) {
  return (
    <div className="max-h-[420px] overflow-auto rounded-md border border-hairline">
      <table className="w-full border-collapse text-[12.5px]">
        <caption className="sr-only">{caption}</caption>
        <thead className="sticky top-0 z-10 bg-card">
          <tr>
            {columns.map((c) => (
              <th
                key={c.key}
                scope="col"
                className={cn(
                  "whitespace-nowrap border-b border-hairline px-2.5 py-2 font-semibold text-ink2",
                  c.numeric ? "text-right" : "text-left",
                )}
              >
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.key} className={cn(r.highlight && "bg-sunk")}>
              {columns.map((c) =>
                c.key === rowHeader ? (
                  <th
                    key={c.key}
                    scope="row"
                    className={cn(
                      "whitespace-nowrap px-2.5 py-1.5 text-left font-normal",
                      r.highlight ? "font-semibold text-ac" : "text-ink2",
                    )}
                  >
                    {r.cells[c.key]}
                  </th>
                ) : (
                  <td
                    key={c.key}
                    className={cn(
                      "whitespace-nowrap px-2.5 py-1.5 tabular-nums",
                      c.numeric ? "text-right" : "text-left",
                      r.highlight && "font-medium",
                    )}
                  >
                    {r.cells[c.key]}
                  </td>
                ),
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
