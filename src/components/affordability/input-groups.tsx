"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import type { Jurisdiction } from "@/domain/types";
import type { ResolvedInputs } from "@/lib/resolve-inputs";
import { DEFAULT_INCOME_2 } from "@/lib/resolve-inputs";
import type { AffordabilityFormState } from "@/lib/shared-inputs";
import { useMoney, usePercent } from "@/lib/format";
import { DisclosureSection } from "@/components/disclosure-section";
import { NumberField } from "@/components/number-field";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImpactRow } from "./impact-row";
import { SegmentedGroup } from "./segmented-group";

/** A fieldset's legend is what gives role="group" its accessible name. */
function Group({ legend, children }: { legend: string; children: ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <legend className="micro px-1 text-text-faint">{legend}</legend>
      {children}
    </fieldset>
  );
}

export interface InputGroupsProps {
  stored: AffordabilityFormState;
  resolved: ResolvedInputs;
  result: AffordabilityResult;
  jurisdiction: Jurisdiction;
  update: (patch: Partial<AffordabilityFormState>) => void;
  isOpen: (id: string) => boolean;
  onToggle: (id: string, currentlyOpen: boolean) => void;
}

export function InputGroups({
  stored,
  resolved,
  result,
  jurisdiction,
  update,
  isOpen,
  onToggle,
}: InputGroupsProps) {
  const t = useTranslations("Affordability");
  const tProv = useTranslations("Provinces");
  const fmt = useMoney();
  const pct = usePercent();

  const advanced = (id: string, children: ReactNode) => (
    <DisclosureSection
      id={id}
      label={isOpen(id) ? t("cHide") : t("cAdvanced")}
      open={isOpen(id)}
      onToggle={() => onToggle(id, isOpen(id))}
    >
      <div className="flex flex-col gap-3">{children}</div>
    </DisclosureSection>
  );

  return (
    <section aria-labelledby="inputs" className="flex flex-col gap-3">
      <div>
        <h2 id="inputs" tabIndex={-1} className="text-[13px] font-semibold">
          {t("adjust")}
        </h2>
        <p className="text-[11.5px] text-muted-foreground">{t("defaults")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Group legend={t("cIncome")}>
          <NumberField
            id="income1"
            label={t("cApp1")}
            value={stored.income1}
            placeholder={resolved.income1}
            min={0}
            onCommit={(income1) => update({ income1 })}
          />
          {stored.income2 === null ? (
            <div className="flex flex-col gap-1">
              <Button
                type="button"
                variant="outline"
                className="min-h-11 justify-start text-[12px] sm:min-h-9"
                onClick={() => update({ income2: DEFAULT_INCOME_2 })}
              >
                {t("cAddApp")}
              </Button>
              <span className="text-[10.5px] text-text-faint">{t("addSecondApplicantHint")}</span>
            </div>
          ) : (
            <div className="flex flex-col gap-1">
              <NumberField
                id="income2"
                label={t("cApp2")}
                value={stored.income2}
                min={0}
                onCommit={(income2) => update({ income2 })}
              />
              <Button
                type="button"
                variant="ghost"
                className="min-h-11 self-start text-[11px] sm:min-h-8"
                onClick={() => update({ income2: null })}
              >
                {t("cRemove")}
              </Button>
            </div>
          )}
          {advanced(
            "adv-income",
            <>
              <NumberField
                id="otherIncome"
                label={t("otherIncome")}
                value={stored.otherIncome}
                placeholder={resolved.otherIncome}
                min={0}
                onCommit={(otherIncome) => update({ otherIncome })}
              />
              <div className="flex flex-col gap-1">
                <Label htmlFor="haircut" className="text-[11.5px] font-semibold text-muted-foreground">
                  {t("cHaircut")}
                </Label>
                <input
                  id="haircut"
                  type="range"
                  min={0}
                  max={50}
                  step={5}
                  value={resolved.haircut}
                  aria-valuetext={pct(resolved.haircut)}
                  onChange={(e) => update({ haircut: Number(e.target.value) })}
                  className="norma-range"
                />
                <span className="figure text-[10.5px] text-text-faint">{pct(resolved.haircut)}</span>
                <span className="text-[10.5px] text-text-faint">{t("cHaircutWhy")}</span>
              </div>
            </>,
          )}
        </Group>

        <Group legend={t("cDebts")}>
          <NumberField
            id="car"
            label={t("cCar")}
            value={stored.car}
            placeholder={resolved.car}
            min={0}
            onCommit={(car) => update({ car })}
          />
          <NumberField
            id="student"
            label={t("cStudent")}
            value={stored.student}
            placeholder={resolved.student}
            min={0}
            onCommit={(student) => update({ student })}
          />
          <NumberField
            id="cc"
            label={t("cCc")}
            value={stored.cc}
            placeholder={resolved.cc}
            min={0}
            onCommit={(cc) => update({ cc })}
          />
          <NumberField
            id="otherDebt"
            label={t("cOtherDebt")}
            value={stored.otherDebt}
            placeholder={resolved.otherDebt}
            min={0}
            onCommit={(otherDebt) => update({ otherDebt })}
          />
          <ImpactRow result={result} />
        </Group>

        <Group legend={t("cPurchase")}>
          <NumberField
            id="price"
            label={t("price")}
            value={stored.price}
            placeholder={resolved.price}
            min={0}
            onCommit={(price) => update({ price })}
          />
          <span className="figure -mt-1 text-[10.5px] text-text-faint">
            {jurisdiction.city ?? tProv(jurisdiction.prov)} · {fmt(jurisdiction.bench[resolved.ptype])}
          </span>
          <SegmentedGroup
            label={t("dpPct")}
            value={resolved.dpPct}
            onChange={(dpPct) => update({ dpPct })}
            options={[5, 10, 20, 25].map((v) => ({ value: v, label: pct(v) }))}
          />
          <SegmentedGroup
            label={t("amortYears")}
            value={resolved.amortYears}
            onChange={(amortYears) => update({ amortYears })}
            options={[25, 30].map((v) => ({ value: v, label: String(v) }))}
          />
          <div className="flex flex-col gap-1">
            <Label htmlFor="ptype" className="text-[11.5px] font-semibold text-muted-foreground">
              {t("ptype")}
            </Label>
            <Select
              value={resolved.ptype}
              onValueChange={(ptype) => update({ ptype: ptype as ResolvedInputs["ptype"] })}
            >
              <SelectTrigger id="ptype" className="control min-h-11 sm:min-h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="house">{t("ptypeHouse")}</SelectItem>
                <SelectItem value="condo">{t("ptypeCondo")}</SelectItem>
                <SelectItem value="newbuild">{t("ptypeNewbuild")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="ftb" checked={resolved.ftb} onCheckedChange={(ftb) => update({ ftb })} />
            <Label htmlFor="ftb" className="text-[11.5px]">
              {t("ftb")}
            </Label>
          </div>
          {advanced(
            "adv-purchase",
            <>
              <NumberField
                id="contractRate"
                label={t("contractRate")}
                value={stored.contractRate}
                placeholder={resolved.contractRate}
                dp={2}
                min={0}
                max={30}
                suffix="%"
                onCommit={(contractRate) => update({ contractRate })}
              />
              {/* Only Ontario stacks a municipal transfer tax, so this toggle
                  only changes anything there. */}
              {jurisdiction.prov === "ON" ? (
                <div className="flex items-center gap-2">
                  <Switch
                    id="elsewhere"
                    checked={resolved.elsewhere}
                    onCheckedChange={(elsewhere) => update({ elsewhere })}
                  />
                  <Label htmlFor="elsewhere" className="text-[11.5px]">
                    {t("elsewhereIn")} {tProv(jurisdiction.prov)}
                  </Label>
                </div>
              ) : null}
            </>,
          )}
        </Group>

        <Group legend={t("cLimits")}>
          <NumberField
            id="comfortCeiling"
            label={t("cComfortCeiling")}
            value={stored.comfortCeiling}
            placeholder={resolved.comfortCeiling}
            min={0}
            onCommit={(comfortCeiling) => update({ comfortCeiling })}
          />
          <NumberField
            id="funds"
            label={t("cFunds")}
            value={stored.funds}
            min={0}
            onCommit={(funds) => update({ funds })}
          />
          <NumberField
            id="save"
            label={t("monthlySavings")}
            value={stored.save}
            min={0}
            onCommit={(save) => update({ save })}
          />
          {advanced(
            "adv-limits",
            <>
              <NumberField
                id="insuranceAnnual"
                label={t("cInsurance")}
                value={stored.insuranceAnnual}
                placeholder={resolved.insuranceAnnual}
                min={0}
                onCommit={(insuranceAnnual) => update({ insuranceAnnual })}
              />
              <NumberField
                id="utilities"
                label={t("cUtilities")}
                value={stored.utilities}
                placeholder={resolved.utilities}
                min={0}
                onCommit={(utilities) => update({ utilities })}
              />
              <NumberField
                id="condoFee"
                label={t("cCondoFee")}
                value={stored.condoFee}
                placeholder={resolved.condoFee}
                min={0}
                onCommit={(condoFee) => update({ condoFee })}
              />
            </>,
          )}
        </Group>
      </div>
    </section>
  );
}
