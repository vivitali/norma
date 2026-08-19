"use client";

import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import { verdictKey, verdictTone, type VerdictKey } from "@/lib/affordability-view";
import { toneClass } from "@/lib/tone";
import { useMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One sentence naming the answer and, when a lender declines, the constraint
 * that binds. The four states are a closed set from the engine's own results —
 * never free text assembled at the call site.
 */
export function VerdictCard({
  result,
  personalised,
}: {
  result: AffordabilityResult;
  personalised: boolean;
}) {
  const t = useTranslations("Affordability");
  const fmt = useMoney();
  const key: VerdictKey = verdictKey(result);

  const head =
    key === "comfortable"
      ? `${t("vComfort")} ${fmt(result.comfort)}.`
      : key === "over"
        ? t("vOver")
        : key === "declined"
          ? t("vDeclined")
          : t("vShortCash");

  const sub =
    key === "declined"
      ? result.tdsBinds
        ? t("ckTds")
        : t("ckGds")
      : key === "shortCash"
        ? result.monthsToClose === null
          ? t("ckCsNo")
          : t("vMonths", { n: result.monthsToClose })
        : t("subComfort");

  const tag = key === "comfortable" ? t("tagComfort") : key === "declined" ? t("wBlocked") : t("wCaution");

  return (
    <section
      aria-labelledby="verdict"
      className={cn("rounded-lg border p-4", toneClass(verdictTone(key)))}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className="micro">{tag}</span>
        {/*
          The honest first paint: the prerendered HTML shows a real, correct,
          city-derived answer tagged `typical`, and hydration flips both the tag
          and the figures. A designed state change, not a glitch.
        */}
        <span className="micro rounded-md border border-current px-1.5 py-0.5 opacity-80">
          {personalised ? t("tagYours") : t("tagTypical")}
        </span>
      </div>
      <h2 id="verdict" tabIndex={-1} className="mt-1.5 text-[19px] leading-tight font-semibold">
        {head}
      </h2>
      <p className="mt-1 max-w-prose text-[12px] text-muted-foreground">{sub}</p>
    </section>
  );
}
