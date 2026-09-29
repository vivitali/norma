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
 * The plot SVG stretches (`preserveAspectRatio="none"`), which would distort any
 * text inside it, so every label — the three y gridline values, the x ticks every
 * ten years, and the markers — is HTML positioned over it in percentages. The
 * three markers are told apart by ink and dash pattern, never by a state colour:
 * green and amber mean pass and caution elsewhere on the page, and "pulls ahead"
 * and "mortgage paid off" are neither.
 *
 * aria-hidden, with the same fact in text: the ending values and the crossing
 * year both appear in the caption.
 */

/** Smallest 1, 2 or 5 times a power of ten that is at least `raw`. */
function niceStep(raw: number): number {
  const power = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1))));
  return [1, 2, 5, 10].map((m) => m * power).find((s) => s >= raw) ?? 10 * power;
}

/** A 14px line sample in the legend, in the same stroke pattern as the rule it keys. */
function Swatch({ dash, className }: { dash?: string; className: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 14 4" className={`h-1 w-3.5 shrink-0 ${className}`}>
      <line x1="0" x2="14" y1="2" y2="2" stroke="currentColor" strokeWidth="1.5" strokeDasharray={dash} />
    </svg>
  );
}

const PLOT_H = 180;
/** Height of one marker-label row above the plot, in px. */
const LABEL_ROW = 16;

export function WealthChart({
  result,
  holding,
  payoffLabel,
}: {
  result: RentVsBuyResult;
  holding?: number;
  /** The already-forked "Mortgage paid off, year N" text; absent when there is no payoff year. */
  payoffLabel?: string;
}) {
  const t = useTranslations("RentVsBuy");
  const fmt = useMoney();

  const W = 640;
  const H = PLOT_H;
  const values = result.rows.flatMap((r) => [r.buyW, r.rentW]);
  const rawTop = Math.max(...values, 1);
  const rawBottom = Math.min(...values, 0);
  // Three gridlines on round figures: the floor, the middle and the ceiling.
  const step = niceStep((rawTop - Math.min(rawBottom, 0)) / 2);
  const bottom = rawBottom < 0 ? Math.floor(rawBottom / step) * step : 0;
  const top = bottom + 2 * step;
  const span = top - bottom;
  const lastT = Math.max(1, result.rows.length - 1);
  const x = (t0: number) => ((t0 - 1) / lastT) * W;
  const pctX = (t0: number) => ((t0 - 1) / lastT) * 100;
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

  const gridValues = [top, bottom + step, bottom];
  const ticks = [10, 20, 30, 40].filter((n) => n <= result.rows.length);

  // One row each so labels never collide, ordered by the line they name.
  const markers: { key: string; year: number; label: string; dash?: string; cls: string }[] = [];
  if (holding !== undefined && holding >= 1 && holding <= result.rows.length) {
    markers.push({ key: "hold", year: holding, label: t("horizonLabel", { n: holding }), cls: "text-ink2" });
  }
  if (result.breakEven !== null) {
    markers.push({
      key: "cross",
      year: result.breakEven,
      label: `${t("crossLabel")} · ${t("crossYear", { n: result.breakEven })}`,
      dash: "3 3",
      cls: "text-ink",
    });
  }
  if (result.payoffYear !== null && payoffLabel) {
    markers.push({ key: "payoff", year: result.payoffYear, label: payoffLabel, dash: "2 4", cls: "text-ink3" });
  }

  return (
    <figure className="m-0 mt-1 mb-4 max-w-[720px]">
      <div className="flex" aria-hidden="true">
        {/* y axis: three values, right-aligned against the plot */}
        <div className="relative w-[72px] shrink-0" style={{ marginTop: markers.length * LABEL_ROW, height: H }}>
          {gridValues.map((v) => (
            <span
              key={v}
              className="absolute right-2 -translate-y-1/2 text-[11.5px] leading-none whitespace-nowrap text-ink3 tabular-nums"
              style={{ top: y(v) }}
            >
              {fmt(v)}
            </span>
          ))}
        </div>
        <div className="relative min-w-0 flex-1 pr-3">
          {/* marker labels, one row per marker, above the plot */}
          <div className="relative" style={{ height: markers.length * LABEL_ROW }}>
            {markers.map((m, i) => (
              <span
                key={m.key}
                className={`absolute text-[11.5px] leading-none whitespace-nowrap ${m.cls}`}
                style={{
                  top: i * LABEL_ROW,
                  ...(pctX(m.year) > 55
                    ? { right: `${100 - pctX(m.year)}%`, paddingRight: 4 }
                    : { left: `${pctX(m.year)}%`, paddingLeft: 4 }),
                }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            className="block w-full overflow-visible"
            style={{ height: H }}
            preserveAspectRatio="none"
          >
            {gridValues.map((v) => (
              <line
                key={v}
                x1={0}
                x2={W}
                y1={y(v)}
                y2={y(v)}
                stroke="currentColor"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
                className="text-hairline"
              />
            ))}
            <polyline points={path((r) => r.rentW)} fill="none" stroke="currentColor" strokeWidth="2" className="text-ink3" />
            <polyline points={path((r) => r.buyW)} fill="none" stroke="currentColor" strokeWidth="2" className="text-ac" />
            {markers.map((m) => (
              <line
                key={m.key}
                x1={x(m.year)}
                x2={x(m.year)}
                y1={0}
                y2={H}
                stroke="currentColor"
                strokeWidth="1"
                strokeDasharray={m.dash}
                vectorEffect="non-scaling-stroke"
                className={m.cls}
              />
            ))}
          </svg>
          {/* x axis: a tick every ten years */}
          <div className="relative h-5">
            {ticks.map((n) => (
              <span
                key={n}
                className="absolute top-1 text-[11.5px] leading-none text-ink3 tabular-nums"
                style={{ left: `${pctX(n)}%`, transform: n === ticks[ticks.length - 1] && pctX(n) > 96 ? "translateX(-100%)" : "translateX(-50%)" }}
              >
                {n}
              </span>
            ))}
          </div>
        </div>
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-[11.5px] text-ink3">
        <span className="flex items-center gap-1.5">
          <Swatch className="text-ac" />
          {`${t("buyWord")} · ${t("atYear", { n: result.years })} · ${fmt(last.buyW)}`}
        </span>
        <span className="flex items-center gap-1.5">
          <Swatch className="text-ink3" />
          {`${t("rentWord")} · ${t("atYear", { n: result.years })} · ${fmt(last.rentW)}`}
        </span>
        {result.breakEven === null ? <span>{t("neverAhead")}</span> : null}
        <span className="sr-only">{alt}</span>
      </figcaption>
    </figure>
  );
}
