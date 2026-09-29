"use client";

import { useTranslations } from "next-intl";
import type { AmortizationResult } from "@/domain/engine";
import { useMoney } from "@/lib/format";
import { useRules } from "@/hooks/use-country";
import { countryKey } from "@/lib/country-key";

/**
 * Interest and principal stacked per year, with renewal years marked.
 *
 * The shape is the argument: interest dominates the early years, principal the
 * later ones, and the year they cross is the one people are surprised by. A
 * table of 25 rows states the same numbers and shows none of that — which is why
 * the table is also here, under the chart, rather than instead of it.
 *
 * Quiet axes, because a stack of bars with no scale is a shape and not a figure:
 * three gridlines with dollar labels on the left, a year tick every ten years
 * underneath, both in --ink3 at 11.5px. The two events the argument turns on are
 * labelled ON the chart rather than only in the legend, and they are drawn in ink
 * with two different dash styles — never in a state colour. Colour on this chart
 * used to mean "caution" for a renewal year, which is a claim about the reader's
 * risk that a marker for a calendar event has no business making.
 *
 * The plot is one `role="img"` with a text alternative describing the shape, the
 * crossover year and the renewals, so none of the facts depends on seeing it.
 */

/** The smallest 1 / 2 / 2.5 / 5 / 10 × 10^k step at or above `x`, for round gridline values. */
function niceStep(x: number): number {
  const magnitude = Math.pow(10, Math.floor(Math.log10(x)));
  const m = x / magnitude;
  const step = m <= 1 ? 1 : m <= 2 ? 2 : m <= 2.5 ? 2.5 : m <= 5 ? 5 : 10;
  return step * magnitude;
}

export function ScheduleChart({ result }: { result: AmortizationResult }) {
  const t = useTranslations("Amortization");
  const fmt = useMoney();
  const rules = useRules();
  const n = result.rows.length;
  const peak = Math.max(...result.rows.map((r) => r.interest + r.principal), 1);
  // Three gridlines; the top one is the scale's ceiling, so no bar can leave the plot.
  const step = niceStep(peak / 3);
  const ceiling = step * 3;
  const flip = result.rows.find((r) => r.principal > r.interest)?.t ?? null;
  const renewals = rules.mortgage.renews ? result.rows.filter((r) => r.renewed).map((r) => r.t) : [];

  const alt = t(countryKey("altText", rules.country), {
    n,
    flipSentence: flip === null ? t("altNoFlip") : t("altFlip", { n: flip }),
  });

  /** Centre of year `year`'s bar, as a share of the plot's width. */
  const at = (year: number) => `${((year - 0.5) / n) * 100}%`;
  // A label near the right edge would run out of the plot; flip it to sit left of its line.
  const onRight = (year: number) => year / n > 0.62;

  return (
    <figure className="m-0 mt-1 mb-4 max-w-[720px]">
      <div className="flex">
        <div aria-hidden="true" className="relative h-[150px] w-[62px] shrink-0 text-[11.5px] leading-none text-ink3">
          {[1, 2, 3].map((k) => (
            <span
              key={k}
              className="absolute right-2 translate-y-1/2 tabular-nums"
              style={{ bottom: `${(k / 3) * 100}%` }}
            >
              {fmt(step * k)}
            </span>
          ))}
        </div>
        <div className="min-w-0 flex-1">
          <div role="img" aria-label={alt} className="relative h-[150px] border-b border-border">
            {/* Gridlines sit behind the bars. */}
            {[1, 2, 3].map((k) => (
              <div
                key={k}
                aria-hidden="true"
                className="absolute inset-x-0 border-t border-hairline"
                style={{ bottom: `${(k / 3) * 100}%` }}
              />
            ))}
            <div aria-hidden="true" className="absolute inset-0 flex items-end gap-[2px]">
              {result.rows.map((row) => (
                <div key={row.t} className="flex h-full flex-1 flex-col justify-end">
                  <div
                    className="w-full bg-ac"
                    style={{ height: `${(row.principal / ceiling) * 100}%` }}
                  />
                  <div
                    className="w-full bg-ac/30"
                    style={{ height: `${(row.interest / ceiling) * 100}%` }}
                  />
                </div>
              ))}
            </div>
            {/* Renewal years: a dashed rule in ink; the first one is named on the chart. */}
            {renewals.map((year, index) => (
              <div
                key={`renewal-${year}`}
                aria-hidden="true"
                data-marker="renewal"
                className="pointer-events-none absolute inset-y-0 border-l border-dashed border-foreground/70"
                style={{ left: at(year) }}
              >
                {index === 0 ? (
                  <span
                    className={
                      onRight(year)
                        ? "absolute top-0 right-1 bg-background/85 px-0.5 text-[11.5px] leading-tight whitespace-nowrap text-ink"
                        : "absolute top-0 left-1 bg-background/85 px-0.5 text-[11.5px] leading-tight whitespace-nowrap text-ink"
                    }
                  >
                    {t("termMark")}
                  </span>
                ) : null}
              </div>
            ))}
            {/* The crossover: a dotted rule, a different dash from the renewals. */}
            {flip !== null ? (
              <div
                aria-hidden="true"
                data-marker="flip"
                className="pointer-events-none absolute inset-y-0 border-l-2 border-dotted border-foreground"
                style={{ left: at(flip) }}
              >
                <span
                  className={
                    onRight(flip)
                      ? "absolute top-7 right-1.5 bg-background/85 px-0.5 text-[11.5px] leading-tight whitespace-nowrap text-ink"
                      : "absolute top-7 left-1.5 bg-background/85 px-0.5 text-[11.5px] leading-tight whitespace-nowrap text-ink"
                  }
                >
                  {t("flipLabel")}
                </span>
              </div>
            ) : null}
          </div>
          <div aria-hidden="true" className="relative h-5 text-[11.5px] leading-none text-ink3">
            {result.rows
              .filter((row) => row.t % 10 === 0)
              .map((row) => (
                <span
                  key={row.t}
                  className={`absolute top-1.5 whitespace-nowrap tabular-nums ${onRight(row.t) && row.t / n > 0.95 ? "-translate-x-full" : "-translate-x-1/2"}`}
                  style={{ left: at(row.t) }}
                >
                  {t("yearWord", { n: row.t })}
                </span>
              ))}
          </div>
        </div>
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-[11.5px] text-ink3">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-[7px] rounded-full bg-ac" />
          {t("legendPrincipal")}
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-[7px] rounded-full bg-ac/30" />
          {t("legendInterest")}
        </span>
        {/*
          `row.renewed` is never true on a toMaturity mortgage (see `amortizationToMaturity`'s
          own doc comment), so there is no renewal rule on the US chart — a legend entry for a
          mark that never renders is not a legend, it is a claim about a mechanism this mortgage
          does not have.
        */}
        {rules.mortgage.renews ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 border-l border-dashed border-foreground/70" />
            {t("termMark")}
          </span>
        ) : null}
        {flip !== null ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-3 border-l-2 border-dotted border-foreground" />
            {`${t("flipLabel")} · ${t("yearWord", { n: flip })}`}
          </span>
        ) : null}
        <span>{`${t("totalPaid")}: ${fmt(result.totalPaid)}`}</span>
      </figcaption>
    </figure>
  );
}
