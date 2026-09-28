"use client";

import { useTranslations } from "next-intl";
import type { RentVsBuyResult } from "@/domain/engine";
import { useMoney } from "@/lib/format";

/**
 * Two wealth lines over the full forty years, with the crossing marked.
 *
 * The caption chips are labelled with the YEAR they report. They read the end of
 * the schedule, while the figures beside the headline read the reader's own
 * horizon — two different pairs of numbers that otherwise sat under the same two
 * words on one screen.
 *
 * Buying starts behind — the down payment and closing costs are sunk — and the
 * only question the chart answers is where, if anywhere, the lines cross. Drawn
 * as an SVG polyline rather than bars because the crossing is the subject and a
 * bar chart hides it.
 *
 * aria-hidden, with the same fact in text: the ending values and the crossing
 * year both appear in the caption.
 */
/** A 14px line sample in the legend, in the same stroke pattern as the rule it keys. */
function Swatch({ dash, className }: { dash?: string; className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 14 4" className={`h-1 w-3.5 shrink-0 ${className}`}>
      <line x1="0" x2="14" y1="2" y2="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray={dash} />
    </svg>
  );
}

export function WealthChart({ result, holding }: { result: RentVsBuyResult; holding?: number }) {
  const t = useTranslations("RentVsBuy");
  const fmt = useMoney();

  const W = 640;
  const H = 180;
  const top = Math.max(...result.rows.flatMap((r) => [r.buyW, r.rentW]), 1);
  const bottom = Math.min(...result.rows.flatMap((r) => [r.buyW, r.rentW]), 0);
  const span = top - bottom || 1;
  const x = (t0: number) => ((t0 - 1) / Math.max(1, result.rows.length - 1)) * W;
  const y = (v: number) => H - ((v - bottom) / span) * H;
  const path = (pick: (r: (typeof result.rows)[number]) => number) =>
    result.rows.map((row) => `${x(row.t).toFixed(1)},${y(pick(row)).toFixed(1)}`).join(" ");

  const last = result.rows[result.rows.length - 1];
  const alt = t("altText", {
    buy: fmt(last.buyW),
    rent: fmt(last.rentW),
    crossSentence:
      result.breakEven === null ? t("altNoCross") : t("altCross", { n: result.breakEven }),
  });

  return (
    <figure className="m-0 mt-1 mb-4 max-w-[720px]">
      <svg
        aria-hidden="true"
        viewBox={`0 0 ${W} ${H}`}
        className="h-[180px] w-full"
        preserveAspectRatio="none"
      >
        <polyline points={path((r) => r.rentW)} fill="none" stroke="currentColor" strokeWidth="2" className="text-ink3" />
        <polyline points={path((r) => r.buyW)} fill="none" stroke="currentColor" strokeWidth="2" className="text-ac" />
        {holding !== undefined && holding >= 1 && holding <= result.rows.length ? (
          <line
            x1={x(holding)}
            x2={x(holding)}
            y1={0}
            y2={H}
            stroke="currentColor"
            strokeWidth="1"
            vectorEffect="non-scaling-stroke"
            className="text-ink2"
          />
        ) : null}
        {result.breakEven !== null ? (
          <line
            x1={x(result.breakEven)}
            x2={x(result.breakEven)}
            y1={0}
            y2={H}
            stroke="currentColor"
            strokeDasharray="3 3"
            className="text-pass"
          />
        ) : null}
        {result.payoffYear !== null ? (
          <line
            x1={x(result.payoffYear)}
            x2={x(result.payoffYear)}
            y1={0}
            y2={H}
            stroke="currentColor"
            strokeDasharray="2 4"
            className="text-caution"
          />
        ) : null}
      </svg>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-[11px] text-ink3">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-[7px] rounded-full bg-ac" />
          {`${t("buyWord")} · ${t("atYear", { n: result.years })} · ${fmt(last.buyW)}`}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-[7px] rounded-full bg-ink3" />
          {`${t("rentWord")} · ${t("atYear", { n: result.years })} · ${fmt(last.rentW)}`}
        </span>
        {holding !== undefined ? (
          <span className="flex items-center gap-1.5">
            <Swatch className="text-ink2" />
            {t("horizonLabel", { n: holding })}
          </span>
        ) : null}
        <span className="flex items-center gap-1.5">
          {result.breakEven === null ? null : <Swatch dash="3 3" className="text-pass" />}
          {result.breakEven === null
            ? t("neverAhead")
            : `${t("crossLabel")} · ${t("crossYear", { n: result.breakEven })}`}
        </span>
        {result.payoffYear !== null ? (
          <span className="flex items-center gap-1.5">
            <Swatch dash="2 4" className="text-caution" />
            {t("payoffLabel", { n: result.payoffYear })}
          </span>
        ) : null}
        <span className="sr-only">{alt}</span>
      </figcaption>
    </figure>
  );
}
