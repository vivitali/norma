"use client";

import { useTranslations } from "next-intl";
import type { Jurisdiction } from "@/domain/types";
import type { PropertyType } from "@/domain/types";
import { useMoney, usePercent } from "@/lib/format";
import { NumberField } from "@/components/number-field";
import { SegmentedGroup } from "@/components/affordability/segmented-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * The purchase itself: price, down payment, amortization, property type, buyer
 * status. Four tool pages ask for exactly this set, so it is one component
 * reading one `Inputs` namespace rather than four near-copies that drift.
 *
 * Every field is optional to the caller: a page passes only what it actually
 * uses, and a field with no handler does not render. Closing Costs has no use
 * for amortization beyond the CMHC surcharge; Amortization has no use for
 * first-time-buyer status.
 */
export interface PurchaseInputsProps {
  price: number | null;
  /** What price resolves to when the reader has not set one — shown as placeholder, never as value. */
  pricePlaceholder: number;
  /** What the reader picked. The control binds to this, so a chip is always selected. */
  dpPct: number;
  /**
   * What the app actually models, with the legal minimum applied. When it differs
   * from `dpPct` the component says so — otherwise the chip asserts one deposit
   * while the mortgage above it is built on another.
   */
  dpPctEffective: number;
  belowMinimum: boolean;
  amortYears?: number;
  ptype?: PropertyType;
  ftb?: boolean;
  elsewhere?: boolean;
  jurisdiction: Jurisdiction;
  onChange: (patch: {
    price?: number | null;
    dpPct?: number;
    amortYears?: number;
    ptype?: PropertyType;
    ftb?: boolean;
    elsewhere?: boolean;
  }) => void;
}

const DP_CHOICES = [5, 10, 20, 25] as const;
const AMORT_CHOICES = [25, 30] as const;

export function PurchaseInputs({
  price,
  pricePlaceholder,
  dpPct,
  dpPctEffective,
  belowMinimum,
  amortYears,
  ptype,
  ftb,
  elsewhere,
  jurisdiction,
  onChange,
}: PurchaseInputsProps) {
  const t = useTranslations("Inputs");
  const fmt = useMoney();
  const pct = usePercent();
  const effectivePrice = price ?? pricePlaceholder;

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <legend className="micro px-1 text-text-faint">{t("purchase")}</legend>

      <NumberField
        id="price"
        label={t("price")}
        value={price}
        placeholder={pricePlaceholder}
        min={0}
        onCommit={(next) => onChange({ price: next })}
      />

      <SegmentedGroup
        label={`${t("downPayment")} · ${fmt((effectivePrice * dpPctEffective) / 100)}`}
        value={dpPct}
        onChange={(next) => onChange({ dpPct: next })}
        options={DP_CHOICES.map((v) => ({ value: v, label: pct(v) }))}
      />
      {belowMinimum ? (
        <p className="-mt-1 text-[11px] leading-[1.45] text-caution">
          {t("belowMinimum", {
            p: pct(dpPctEffective, 1),
            a: fmt((effectivePrice * dpPctEffective) / 100),
          })}
        </p>
      ) : null}

      {amortYears !== undefined ? (
        <SegmentedGroup
          label={t("amortization")}
          value={amortYears}
          onChange={(next) => onChange({ amortYears: next })}
          options={AMORT_CHOICES.map((v) => ({ value: v, label: t("years", { n: v }) }))}
        />
      ) : null}

      {ptype !== undefined ? (
        <SegmentedGroup
          label={t("propertyType")}
          value={ptype}
          onChange={(next) => onChange({ ptype: next })}
          options={[
            { value: "house" as const, label: t("house") },
            { value: "condo" as const, label: t("condo") },
            { value: "newbuild" as const, label: t("newbuild") },
          ]}
        />
      ) : null}

      {ftb !== undefined ? (
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="ftb" className="text-[13px]">
            {t("ftb")}
          </Label>
          <Switch id="ftb" checked={ftb} onCheckedChange={(next) => onChange({ ftb: next })} />
        </div>
      ) : null}

      {/* Only Ontario stacks a municipal land transfer tax, and only in Toronto. */}
      {elsewhere !== undefined && jurisdiction.prov === "ON" ? (
        <div className="flex flex-col gap-1 border-t border-hairline pt-3">
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="elsewhere" className="text-[13px]">
              {t("elsewhereIn")}
            </Label>
            <Switch
              id="elsewhere"
              checked={elsewhere}
              onCheckedChange={(next) => onChange({ elsewhere: next })}
            />
          </div>
          <p className="text-[11.5px] leading-[1.5] text-ink3">{t("elsewhereWhy")}</p>
        </div>
      ) : null}
    </fieldset>
  );
}
