"use client";

import type { ChangeEvent } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useSharedState } from "@/hooks/use-shared-state";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { affordability, money } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { getJurisdiction } from "@/domain/jurisdictions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const AFFORDABILITY_KEYS = [
  "price", "dpPct", "amortYears", "ftb", "ptype", "elsewhere",
  "insuranceAnnual", "utilities", "condoFee", "comfortCeiling",
  "income1", "income2", "otherIncome", "haircut", "debts", "contractRate",
] as const;

export type AffordabilityFormState = {
  price: number;
  dpPct: number;
  amortYears: number;
  ftb: boolean;
  ptype: "house" | "condo" | "newbuild";
  elsewhere: boolean;
  insuranceAnnual: number;
  utilities: number;
  condoFee: number;
  comfortCeiling: number;
  income1: number;
  income2: number;
  otherIncome: number;
  haircut: number;
  debts: number;
  contractRate: number;
};

export const DEFAULT_AFFORDABILITY_STATE: AffordabilityFormState = {
  price: 450000,
  dpPct: 10,
  amortYears: 25,
  ftb: true,
  ptype: "house",
  elsewhere: false,
  insuranceAnnual: 1400,
  utilities: 200,
  condoFee: 0,
  comfortCeiling: 2800,
  income1: 70000,
  income2: 50000,
  otherIncome: 0,
  haircut: 0,
  debts: 300,
  contractRate: 4.29,
};

type NumericKey = Exclude<keyof AffordabilityFormState, "ftb" | "ptype" | "elsewhere">;

const INTL_LOCALES: Record<string, string> = { en: "en-CA", fr: "fr-CA" };

export default function AffordabilityPage() {
  const t = useTranslations("Affordability");
  const [form, updateForm] = useSharedState(AFFORDABILITY_KEYS, DEFAULT_AFFORDABILITY_STATE);
  const locale = useLocale();
  const intlLocale = INTL_LOCALES[locale] ?? "en-CA";
  const [jurisdictionState] = useJurisdiction();
  const jurisdiction = getJurisdiction(jurisdictionState.jurId) ?? getJurisdiction("winnipeg")!;
  const result = affordability(jurisdiction, federal, form);

  const numberField = (key: NumericKey) => ({
    id: key,
    type: "number" as const,
    value: form[key],
    onChange: (e: ChangeEvent<HTMLInputElement>) => {
      const value = e.target.valueAsNumber;
      updateForm({ [key]: Number.isNaN(value) ? 0 : value });
    },
  });

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("heading")}</h1>
        <p className="text-muted-foreground">{t("subheading")}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="income1">{t("income1")}</Label>
          <Input {...numberField("income1")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="income2">{t("income2")}</Label>
          <Input {...numberField("income2")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="otherIncome">{t("otherIncome")}</Label>
          <Input {...numberField("otherIncome")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="debts">{t("debts")}</Label>
          <Input {...numberField("debts")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="price">{t("price")}</Label>
          <Input {...numberField("price")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dpPct">{t("dpPct")}</Label>
          <Input {...numberField("dpPct")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amortYears">{t("amortYears")}</Label>
          <Input {...numberField("amortYears")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="contractRate">{t("contractRate")}</Label>
          <Input {...numberField("contractRate")} step="0.01" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="comfortCeiling">{t("comfortCeiling")}</Label>
          <Input {...numberField("comfortCeiling")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="insuranceAnnual">{t("insuranceAnnual")}</Label>
          <Input {...numberField("insuranceAnnual")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="utilities">{t("utilities")}</Label>
          <Input {...numberField("utilities")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="condoFee">{t("condoFee")}</Label>
          <Input {...numberField("condoFee")} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ptype">{t("ptype")}</Label>
          <Select
            value={form.ptype}
            onValueChange={(ptype) => updateForm({ ptype: ptype as AffordabilityFormState["ptype"] })}
          >
            <SelectTrigger id="ptype">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="house">{t("ptypeHouse")}</SelectItem>
              <SelectItem value="condo">{t("ptypeCondo")}</SelectItem>
              <SelectItem value="newbuild">{t("ptypeNewbuild")}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <Switch id="ftb" checked={form.ftb} onCheckedChange={(ftb) => updateForm({ ftb })} />
          <Label htmlFor="ftb">{t("ftb")}</Label>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{t("ceiling")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-3xl font-semibold tabular-nums">{money(result.ceiling, intlLocale, false)}</p>
            <p className={result.approvalPass ? "text-primary" : "text-destructive"}>
              {result.approvalPass ? t("approvalPass") : t("approvalFail")}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{t("comfort")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-3xl font-semibold tabular-nums">{money(result.comfort, intlLocale, false)}</p>
            <p className={result.comfortPass ? "text-primary" : "text-destructive"}>
              {result.comfortPass ? t("comfortPass") : t("comfortFail")}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("monthlyBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("pi")}</span>
            <span className="tabular-nums">{money(result.monthly.pi, intlLocale, false)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("propTax")}</span>
            <span className="tabular-nums">{money(result.monthly.propTax, intlLocale, false)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("insuranceAnnual")}</span>
            <span className="tabular-nums">{money(result.monthly.insurance, intlLocale, false)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("utilities")}</span>
            <span className="tabular-nums">{money(result.monthly.utilities, intlLocale, false)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("condoFee")}</span>
            <span className="tabular-nums">{money(result.monthly.condoFee, intlLocale, false)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("maintenance")}</span>
            <span className="tabular-nums">{money(result.monthly.maintenance, intlLocale, false)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
            <span>{t("total")}</span>
            <span className="tabular-nums">{money(result.monthly.total, intlLocale, false)}</span>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}
