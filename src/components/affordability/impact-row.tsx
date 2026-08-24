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

  // debtCapacity === 0 has THREE meanings, not two. Beyond "no debts" and
  // "housing cost binds first", it is also zero when the ceiling itself is zero —
  // no qualifying income, or a binding allowance already swallowed by the heat
  // allowance. Claiming "your debts cost you nothing" there, in pass tokens,
  // beside a declined verdict and a $0 ceiling, is the opposite of the truth:
  // nothing binds because nothing is approvable. That case asserts nothing.
  // Nothing is approvable, so no statement about debt cost is true.
  const noCeiling = result.ceiling <= 0;
  const state = noCeiling
    ? "noClaim"
    : debts > 0
      ? result.debtCapacity > 0
        ? "costly"
        : "notBinding"
      : // No debts entered. Quoting a per-$100 price of $0 is technically true
        // and reads as broken; say why it is zero instead.
        result.capacityPer100 > 0
        ? "none"
        : "noneFree";

  const body =
    state === "costly"
      ? { label: t("impactPre"), figure: `− ${fmt(result.debtCapacity)}`, foot: t("impactFoot") }
      : state === "notBinding"
        ? { label: t("impactNoneBinding"), figure: null, foot: t("impactNoneBindingFoot") }
        : state === "noClaim"
          ? { label: t("impactFoot"), figure: null, foot: null }
          : state === "noneFree"
            ? { label: t("impactNoneFree"), figure: null, foot: t("impactNoneBindingFoot") }
            : { label: t("impactNone"), figure: fmt(result.capacityPer100), foot: t("perHundred") };

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 rounded-md border border-l-[3px] p-2.5",
        state === "costly"
          ? "border-l-caution"
          : state === "notBinding" || state === "noneFree"
            ? "border-l-pass"
            : "border-l-border",
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
      {body.foot ? <span className="text-[10.5px] text-text-faint">{body.foot}</span> : null}
    </div>
  );
}
