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
 * The figure is aria-hidden and carries a text alternative describing both the
 * shape and the crossover year, so the fact does not depend on seeing it.
 */
export function ScheduleChart({ result }: { result: AmortizationResult }) {
  const t = useTranslations("Amortization");
  const fmt = useMoney();
  const rules = useRules();
  const peak = Math.max(...result.rows.map((r) => r.interest + r.principal), 1);
  const flip = result.rows.find((r) => r.principal > r.interest)?.t ?? null;

  const alt = t(countryKey("altText", rules.country), {
    n: result.rows.length,
    flipSentence: flip === null ? t("altNoFlip") : t("altFlip", { n: flip }),
  });

  return (
    <figure className="m-0 mt-1 mb-4 max-w-[720px]">
      <div aria-hidden="true" className="flex h-[150px] items-end gap-[2px]">
        {result.rows.map((row) => (
          <div key={row.t} className="flex h-full flex-1 flex-col justify-end">
            <div
              className="w-full bg-ac"
              style={{ height: `${(row.principal / peak) * 100}%` }}
            />
            <div
              className={row.renewed ? "w-full bg-caution" : "w-full bg-ac/30"}
              style={{ height: `${(row.interest / peak) * 100}%` }}
            />
          </div>
        ))}
      </div>
      <figcaption className="flex flex-wrap gap-x-4 gap-y-1 pt-2 text-[11px] text-ink3">
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
          own doc comment), so the caution bar never actually appears in the chart above for
          the US — a legend entry for a colour that never renders is not a legend, it is a
          claim about a mechanism this mortgage does not have.
        */}
        {rules.mortgage.renews ? (
          <span className="flex items-center gap-1.5">
            <span aria-hidden="true" className="size-[7px] rounded-full bg-caution" />
            {t("termMark")}
          </span>
        ) : null}
        {flip !== null ? <span>{`${t("flipLabel")} · ${t("yearWord", { n: flip })}`}</span> : null}
        <span className="sr-only">{alt}</span>
        <span>{`${t("totalPaid")}: ${fmt(result.totalPaid)}`}</span>
      </figcaption>
    </figure>
  );
}
