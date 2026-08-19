"use client";

import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import { impactWidth } from "@/lib/scale";
import { useMoney } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * What the household's monthly debts cost them in purchase price.
 *
 * Three states, because `debtCapacity === 0` has two completely different
 * meanings and only one of them is "no debts". Gated on the INPUT, never on the
 * output: since debtCapacity became the true ceiling delta it is legitimately
 * zero whenever GDS binds, and reading that as "no monthly debts entered" tells
 * a user with $50 in the field directly above that they entered nothing.
 */
export function ImpactRow({ result, debts }: { result: AffordabilityResult; debts: number }) {
  const t = useTranslations("Affordability");
  const fmt = useMoney();

  const state = debts <= 0 ? "none" : result.debtCapacity > 0 ? "costly" : "notBinding";

  const body =
    state === "costly"
      ? { label: t("impactPre"), figure: `− ${fmt(result.debtCapacity)}`, foot: t("impactFoot") }
      : state === "notBinding"
        ? { label: t("impactNoneBinding"), figure: null, foot: t("impactNoneBindingFoot") }
        : { label: t("impactNone"), figure: fmt(result.capacityPer100), foot: t("perHundred") };

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-md border border-l-[3px] p-2.5",
        state === "costly"
          ? "border-caution-border border-l-caution bg-caution-bg"
          : state === "notBinding"
            ? "border-pass-border border-l-pass bg-pass-bg"
            : "border-border border-l-border bg-background",
      )}
    >
      <span className="micro text-text-faint">{t("keyLever")}</span>
      <p className="text-[11.5px] text-muted-foreground">
        {body.label}
        {body.figure ? (
          <>
            {" "}
            <span
              className={cn(
                "figure font-semibold",
                state === "costly" ? "text-caution" : "text-foreground",
              )}
            >
              {body.figure}
            </span>
          </>
        ) : null}
      </p>
      {state === "costly" ? (
        <span className="flex h-1 w-full overflow-hidden rounded-sm bg-surface-sunken">
          <span
            className="h-full bg-caution"
            style={{ width: `${impactWidth(result.debtCapacity, result.ceiling)}%` }}
          />
        </span>
      ) : null}
      <span className="text-[10.5px] text-text-faint">{body.foot}</span>
    </div>
  );
}
