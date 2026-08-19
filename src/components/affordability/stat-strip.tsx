"use client";

import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import { splitWidth } from "@/lib/scale";
import { useMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { Provenance, type ProvenanceKind } from "@/components/provenance";

function Stat({
  label,
  figure,
  note,
  delta,
  emphasis,
  provenance,
  children,
}: {
  label: string;
  figure: string;
  note?: string;
  delta?: string | null;
  emphasis?: boolean;
  provenance?: ProvenanceKind;
  children?: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1 rounded-lg border p-3",
        emphasis ? "border-accent-border bg-accent-surface" : "border-border bg-card",
      )}
    >
      <span className="micro text-text-faint">
        {label}
        {provenance ? <Provenance kind={provenance} /> : null}
      </span>
      <span className="flex items-baseline gap-1.5">
        <span className={cn("figure font-semibold", emphasis ? "text-[24px]" : "text-[19px]")}>
          {figure}
        </span>
        {delta ? <span className="figure text-[10.5px] text-muted-foreground">{delta}</span> : null}
      </span>
      {note ? <span className="text-[10.5px] text-text-faint">{note}</span> : null}
      {children}
    </div>
  );
}

/**
 * The four figures the screen exists to deliver. `comfort` carries the emphasis
 * because it is the real answer; `ceiling` is deliberately labelled as a ceiling
 * rather than a target.
 */
export function StatStrip({
  result,
  previous,
}: {
  result: AffordabilityResult;
  previous: AffordabilityResult | null;
}) {
  const t = useTranslations("Affordability");
  const fmt = useMoney();

  /** A transient chip on any headline figure that moved. Formatted with a sign. */
  const delta = (now: number, before: number | undefined) => {
    if (before === undefined || Math.round(now) === Math.round(before)) return null;
    const diff = now - before;
    return `${diff > 0 ? "+" : "−"}${fmt(Math.abs(diff))}`;
  };

  const monthlyVsCeiling =
    result.comfortGap <= 0
      ? `${fmt(-result.comfortGap)} ${t("headroom")}`
      : `${fmt(result.comfortGap)} ${t("over")}`;

  const downShare = splitWidth(result.cc.fin.down, result.cc.cash);

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <Stat
        emphasis
        provenance="estimate"
        label={t("stComfort")}
        figure={fmt(result.comfort)}
        note={t("stComfortNote")}
        delta={delta(result.comfort, previous?.comfort)}
      />
      <Stat
        provenance="rule"
        label={t("stCeiling")}
        figure={fmt(result.ceiling)}
        note={t("stCeilingNote")}
        delta={delta(result.ceiling, previous?.ceiling)}
      />
      <Stat
        provenance="estimate"
        label={t("stMonthly")}
        figure={fmt(result.monthly.total)}
        note={monthlyVsCeiling}
        delta={delta(result.monthly.total, previous?.monthly.total)}
      />
      <Stat
        label={t("stCash")}
        figure={fmt(result.cc.net)}
        delta={delta(result.cc.net, previous?.cc.net)}
      >
        {/*
          The split between what is a down payment and what is cost. Two figures
          people routinely conflate, and the second one surprises them.
        */}
        <span className="mt-0.5 flex h-1 w-full overflow-hidden rounded-sm bg-surface-sunken">
          <span className="h-full bg-primary" style={{ width: `${downShare}%` }} />
        </span>
        <span className="text-[10.5px] text-text-faint">
          {t("downPaymentRow")} {fmt(result.cc.fin.down)} · {t("closingCosts")} {fmt(result.cc.total)}
        </span>
      </Stat>
    </div>
  );
}
