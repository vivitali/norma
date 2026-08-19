"use client";

import type { ChangeEvent } from "react";
import { useTranslations } from "next-intl";
import { useSharedState } from "@/hooks/use-shared-state";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { affordability } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { useMoney } from "@/lib/format";
import {
  AFFORDABILITY_KEYS,
  AFFORDABILITY_DEFAULTS,
  type AffordabilityFormState,
} from "@/lib/shared-inputs";
import { resolveInputs } from "@/lib/resolve-inputs";
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

type NumericKey = Exclude<keyof AffordabilityFormState, "ftb" | "ptype" | "elsewhere">;

export default function AffordabilityPage() {
  const t = useTranslations("Affordability");
  const [form, updateForm] = useSharedState(AFFORDABILITY_KEYS, AFFORDABILITY_DEFAULTS);
  const fmt = useMoney();
  const [jurisdiction] = useJurisdiction();
  // Bridge only: this page is rebuilt on the section registry in a later commit.
  // Rendering the RESOLVED value rather than the raw stored one keeps the screen
  // honest in the meantime — an untouched field shows its derived default, not 0.
  const resolved = resolveInputs(form, jurisdiction, federal);
  const result = affordability(jurisdiction, federal, resolved);

  const numberField = (key: NumericKey) => ({
    id: key,
    type: "number" as const,
    value: resolved[key] ?? 0,
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
            <p className="text-3xl font-semibold tabular-nums">{fmt(result.ceiling)}</p>
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
            <p className="text-3xl font-semibold tabular-nums">{fmt(result.comfort)}</p>
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
            <span className="tabular-nums">{fmt(result.monthly.pi)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("propTax")}</span>
            <span className="tabular-nums">{fmt(result.monthly.propTax)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("insuranceMonthly")}</span>
            <span className="tabular-nums">{fmt(result.monthly.insurance)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("utilities")}</span>
            <span className="tabular-nums">{fmt(result.monthly.utilities)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("condoFee")}</span>
            <span className="tabular-nums">{fmt(result.monthly.condoFee)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("maintenance")}</span>
            <span className="tabular-nums">{fmt(result.monthly.maintenance)}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
            <span>{t("total")}</span>
            <span className="tabular-nums">{fmt(result.monthly.total)}</span>
          </div>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground">
        <p>{t("unverifiedFlag")}</p>
        <p>
          {t("lastVerified")}: {federal.verified}
        </p>
        {!jurisdiction.cityData ? <p>{t("noCityData")}</p> : null}
      </div>
    </main>
  );
}
