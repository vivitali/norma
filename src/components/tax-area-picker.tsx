"use client";

import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { NoteLine } from "@/components/tool-page";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useMoney, usePercent } from "@/lib/format";

/**
 * The reader's school division — Winnipeg's property tax differs by about 14% across its eight.
 *
 * Renders nothing for a record without `propTax.areas`, so a page places it unconditionally and
 * it appears only where it moves a figure. A Select, not a SegmentedGroup: eight proper names do
 * not fit one row (DESIGN.md §5, the LocaleSwitcher row). The choice lives in the jurisdiction
 * slice of the one storage blob and is applied by JurisdictionProvider, so every page — and
 * every "where this figure came from" line — reads the same division.
 *
 * Bind it only on a page whose figures include property tax: /amortization prices none, and a
 * control that moves nothing on the screen is noise (the residency switch's rule in
 * purchase-inputs.tsx).
 */
/**
 * The `Inputs` sub-table holding each division's name, keyed by area id. Named here so the
 * orphan-key scan (messages-coverage.test.ts) sees the literal; tax-area-picker.test.tsx checks
 * the stronger property — every area id any record carries has a name in every catalogue.
 */
export const AREA_NAMES = "taxAreas";

export function TaxAreaPicker() {
  const t = useTranslations("Inputs");
  const [jurisdiction, , setTaxArea, taxAreaId] = useJurisdiction();
  const pct = usePercent();
  const fmt = useMoney();
  const areas = jurisdiction.propTax.areas;
  if (!areas || taxAreaId === null) return null;

  const rates = areas.list.map((a) => a.effective);
  const credit = jurisdiction.propTax.credit;

  return (
    <div className="flex flex-col gap-1">
      <Label htmlFor="taxArea" className="text-[11.5px] font-semibold text-muted-foreground">
        {t("taxArea")}
      </Label>
      <Select
        value={taxAreaId}
        // The default is stored as null, like every derived default, so "the record's default"
        // keeps meaning whatever the record says it is after a data update.
        onValueChange={(id) => setTaxArea(id === areas.default ? null : id)}
      >
        <SelectTrigger id="taxArea" className="control h-11 w-full sm:h-[38px]">
          <SelectValue>{t(`${AREA_NAMES}.${taxAreaId}`)}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          {areas.list.map((a) => (
            <SelectItem key={a.id} value={a.id}>
              {t(`${AREA_NAMES}.${a.id}`)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <NoteLine>
        {t("taxAreaNote", { lo: pct(Math.min(...rates) * 100, 2), hi: pct(Math.max(...rates) * 100, 2) })}
        {credit ? ` ${t("taxCreditNote", { amount: fmt(credit.amount) })}` : null}
      </NoteLine>
    </div>
  );
}
