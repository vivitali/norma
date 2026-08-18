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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type NumericKey = Exclude<keyof AffordabilityFormState, "ftb" | "ptype" | "elsewhere">;

/**
 * A skeleton that is legal inside phrasing content. shadcn's `<Skeleton>` renders a `<div>`, and
 * a `<div>` inside a `<p>` or `<span>` is invalid HTML — the browser's parser hoists it out, so
 * the server tree and the client tree disagree and React reports a hydration error on every load.
 * Every figure below sits inside a `<p>` or a `<span>`, so they all need this rather than the
 * block skeleton. Keeps `data-slot="skeleton"` so it is still findable the same way.
 */
function InlineSkeleton({ className }: { className?: string }) {
  return (
    <span
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("inline-block animate-pulse rounded-md bg-muted align-middle", className)}
    />
  );
}

export default function AffordabilityPage() {
  const t = useTranslations("Affordability");
  const [form, updateForm, hydrated] = useSharedState(AFFORDABILITY_KEYS, AFFORDABILITY_DEFAULTS);
  const fmt = useMoney();
  const [jurisdiction] = useJurisdiction();
  const result = affordability(jurisdiction, federal, form);

  // Prerendered HTML necessarily paints defaults before localStorage is readable. Inputs show
  // through immediately; a derived dollar figure does not, because a returning user seeing
  // "$412,000" replaced by "$689,000" has been shown a wrong answer, however briefly.
  const figure = (value: string) =>
    hydrated ? <>{value}</> : <InlineSkeleton className="h-6 w-28" />;

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
        <Card data-testid="ceiling-panel" aria-busy={!hydrated}>
          <CardHeader>
            <CardTitle>{t("ceiling")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-3xl font-semibold tabular-nums">{figure(fmt(result.ceiling))}</p>
            {hydrated ? (
              <p className={result.approvalPass ? "text-primary" : "text-destructive"}>
                {result.approvalPass ? t("approvalPass") : t("approvalFail")}
              </p>
            ) : (
              <Skeleton className="h-5 w-40" />
            )}
          </CardContent>
        </Card>
        <Card data-testid="comfort-panel" aria-busy={!hydrated}>
          <CardHeader>
            <CardTitle>{t("comfort")}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <p className="text-3xl font-semibold tabular-nums">{figure(fmt(result.comfort))}</p>
            {hydrated ? (
              <p className={result.comfortPass ? "text-primary" : "text-destructive"}>
                {result.comfortPass ? t("comfortPass") : t("comfortFail")}
              </p>
            ) : (
              <Skeleton className="h-5 w-40" />
            )}
          </CardContent>
        </Card>
      </div>

      <Card data-testid="monthly-panel" aria-busy={!hydrated}>
        <CardHeader>
          <CardTitle>{t("monthlyBreakdown")}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("pi")}</span>
            <span className="tabular-nums">{figure(fmt(result.monthly.pi))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("propTax")}</span>
            <span className="tabular-nums">{figure(fmt(result.monthly.propTax))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("insuranceMonthly")}</span>
            <span className="tabular-nums">{figure(fmt(result.monthly.insurance))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("utilities")}</span>
            <span className="tabular-nums">{figure(fmt(result.monthly.utilities))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("condoFee")}</span>
            <span className="tabular-nums">{figure(fmt(result.monthly.condoFee))}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{t("maintenance")}</span>
            <span className="tabular-nums">{figure(fmt(result.monthly.maintenance))}</span>
          </div>
          <div className="mt-2 flex justify-between border-t border-border pt-2 font-semibold">
            <span>{t("total")}</span>
            <span className="tabular-nums">{figure(fmt(result.monthly.total))}</span>
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
