"use client";

import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import { impactWidth } from "@/lib/scale";
import { useMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * What the household's monthly debts cost them in purchase price.
 *
 * capacityPerDollar exists in the engine for exactly this, and it is the most
 * behaviour-changing number on the page: total debt service is usually the
 * binding constraint and almost nobody knows it.
 */
export function ImpactRow({ result }: { result: AffordabilityResult }) {
  const t = useTranslations("Affordability");
  const fmt = useMoney();
  const hasDebt = result.debtCapacity > 0;

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-md border border-l-[3px] p-2.5",
        hasDebt
          ? "border-caution-border border-l-caution bg-caution-bg"
          : "border-border border-l-border bg-background",
      )}
    >
      <span className="micro text-text-faint">{t("keyLever")}</span>
      <p className="text-[11.5px] text-muted-foreground">
        {hasDebt ? t("impactPre") : t("impactNone")}{" "}
        <span className={cn("figure font-semibold", hasDebt ? "text-caution" : "text-foreground")}>
          {hasDebt ? `− ${fmt(result.debtCapacity)}` : fmt(result.capacityPer100)}
        </span>
      </p>
      {hasDebt ? (
        <span className="flex h-1 w-full overflow-hidden rounded-sm bg-surface-sunken">
          <span
            className="h-full bg-caution"
            style={{ width: `${impactWidth(result.debtCapacity, result.ceiling)}%` }}
          />
        </span>
      ) : null}
      <span className="text-[10.5px] text-text-faint">
        {hasDebt ? t("impactFoot") : t("perHundred")}
      </span>
    </div>
  );
}
