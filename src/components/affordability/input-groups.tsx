"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import type { Jurisdiction } from "@/domain/types";
import type { ResolvedInputs } from "@/lib/resolve-inputs";
import { DEFAULT_INCOME_2 } from "@/lib/resolve-inputs";
import type { ToolFormState } from "@/lib/shared-inputs";
import { useMoney, usePercent } from "@/lib/format";
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
      <legend className="micro px-1 text-ink3">{legend}</legend>
      {children}
    </fieldset>
  );
}

export interface InputGroupsProps {
  stored: ToolFormState;
  resolved: ResolvedInputs;
  result: AffordabilityResult;
  jurisdiction: Jurisdiction;
  update: (patch: Partial<ToolFormState>) => void;
}

export function InputGroups({
  stored,
  resolved,
  result,
  jurisdiction,
  update,
}: InputGroupsProps) {
  const t = useTranslations("Affordability");
  const tProv = useTranslations("Provinces");
  const tInputs = useTranslations("Inputs");
  // The reader-facing name. `jurisdiction.city` is the lowercase record key and
  // rendered "winnipeg"; the Jurisdictions namespace is where the real name lives.
  const tJur = useTranslations("Jurisdictions");
  const fmt = useMoney();
  const pct = usePercent();

  /**
   * v2 has one disclosure gesture and it belongs to the sections above, so the
   * inputs no longer hide half their fields behind a second one. The advanced
   * fields sit under a quiet label in the same column.
   */
  const advanced = (id: string, children: ReactNode) => (
    <div key={id} className="flex flex-col gap-3 border-t border-hairline pt-3">
      <span className="eyebrow text-ink3">{t("cAdvanced")}</span>
      {children}
    </div>
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
              <span className="text-[10.5px] text-ink3">{t("addSecondApplicantHint")}</span>
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
                <span className="text-[10.5px] text-ink3">{pct(resolved.haircut)}</span>
                <span className="text-[10.5px] text-ink3">{t("cHaircutWhy")}</span>
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
          <ImpactRow result={result} debts={resolved.debts} />
        </Group>

        <Group legend={t("cPurchase")}>
          <NumberField
            id="price"
            label={t("price")}
            value={stored.price}
            // Nothing to suggest where nothing is published: a placeholder of "0"
            // is still a suggestion, and the one it makes is a free house.
            placeholder={resolved.priceKnown ? resolved.price : undefined}
            min={0}
            onCommit={(price) => update({ price })}
          />
          {/*
            `resolved.benchmark`, not `jurisdiction.bench[ptype]`: a benchmark can be
            null (nothing published for that market), and a hint with no figure in it
            is worse than no hint. See benchmarkPrice() in resolve-inputs.ts.

            Where it IS null the field does not go quiet — that left the reader a $0
            price with LESS explanation than a priced city gets. It asks, in place, on
            the field that answers it.

            But it asks only while the question is open. The ask is a THIRD state, not
            the other half of the hint: once the reader has given a price there is a
            price to model, and "Enter the one you are considering" sat under their own
            640,000 at `yt` — the same state that correctly says nothing on Amortization,
            because PurchaseInputs branches on whether a price resolves rather than on
            whether a publisher produces one. One fact, `priceKnown`, in both places.
          */}
          {resolved.benchmark !== null ? (
            <span className="-mt-1 text-[10.5px] text-ink3">
              {jurisdiction.city ?? tProv(jurisdiction.prov)} · {fmt(resolved.benchmark)}
            </span>
          ) : resolved.priceKnown ? null : (
            <span className="-mt-1 text-[11.5px] leading-[1.5] text-ink3 text-pretty">
              {tInputs("noPrice", { place: tJur(`at.${jurisdiction.id}`) })}
            </span>
          )}
          {/*
            Bound to what the reader PICKED, never to the floored value. In the
            blended tier the legal floor is 10 − 2 500 000/price, which is never
            one of these four options -- so binding it to resolved.dpPct left no
            button with aria-checked, stripped every button's tabIndex, and took
            the whole radiogroup out of the tab order. The raise is announced
            below instead of being smuggled into the control.
          */}
          <SegmentedGroup
            label={t("dpPct")}
            value={stored.dpPct}
            onChange={(dpPct) => update({ dpPct })}
            options={[5, 10, 20, 25].map((v) => ({ value: v, label: pct(v) }))}
          />
          {resolved.belowMinimum ? (
            <span className="text-[11px] leading-[1.45] text-caution">
              {t("belowMinimum", { p: pct(resolved.dpPct, 1), a: fmt((resolved.price * resolved.dpPct) / 100) })}
            </span>
          ) : null}
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
