"use client";

import type { ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { useSharedState } from "@/hooks/use-shared-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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

export interface AffordabilityFormState extends Record<string, unknown> {
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
}

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

export default function AffordabilityPage() {
  const t = useTranslations("Affordability");
  const [form, updateForm] = useSharedState<AffordabilityFormState>(AFFORDABILITY_KEYS, DEFAULT_AFFORDABILITY_STATE);

  const numberField = (key: NumericKey) => ({
    id: key as string,
    type: "number" as const,
    value: form[key] as number,
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
            value={form.ptype as string}
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
          <Switch id="ftb" checked={form.ftb as boolean} onCheckedChange={(ftb) => updateForm({ ftb })} />
          <Label htmlFor="ftb">{t("ftb")}</Label>
        </div>
      </div>
    </main>
  );
}
