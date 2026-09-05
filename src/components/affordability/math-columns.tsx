"use client";

import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import { useRules } from "@/hooks/use-country";
import type { ResolvedInputs } from "@/lib/resolve-inputs";
import { useMoney, usePercent } from "@/lib/format";
import { countryKey } from "@/lib/country-key";
import { cn } from "@/lib/utils";

function MathRow({
  label,
  value,
  strong,
  why,
}: {
  label: string;
  value: string;
  strong?: boolean;
  why?: string;
}) {
  return (
    <div className="border-b border-hairline py-2">
      <div className="flex items-baseline gap-3.5">
        <span
          className={cn("min-w-0 flex-1 text-[13px] leading-[1.45] text-ink2", strong && "font-semibold text-ink")}
        >
          {label}
        </span>
        <span className={cn("text-[13px] whitespace-nowrap", strong && "font-semibold")}>{value}</span>
      </div>
      {why ? <p className="mt-0.5 max-w-prose text-[11.5px] text-ink3 text-pretty">{why}</p> : null}
    </div>
  );
}

/**
 * Both ceilings, derived line by line. A row whose input is zero is ABSENT
 * rather than a zero row — the same convention buildLines uses, so the column
 * shows only what actually applies to this household.
 */
export function MathColumns({
  result,
  resolved,
}: {
  result: AffordabilityResult;
  resolved: ResolvedInputs;
}) {
  const t = useTranslations("Affordability");
  const fmt = useMoney();
  const pct = usePercent();
  const rules = useRules();

  return (
    <div className="grid max-w-[900px] grid-cols-1 gap-9 lg:grid-cols-2">
      <div>
        <div className="mb-3 text-[13px] font-semibold">{t("mLender")}</div>
        <MathRow label={t("mQualInc")} value={fmt(result.qualIncome)} />
        <MathRow
          label={t(countryKey("mStressRate", rules.country))}
          value={pct(result.qualRate, 2)}
          // No federal stress test exists on a US mortgage — rules.stressTest is null
          // there, and the qualifying rate IS the contract rate. See CaRules.stressTest
          // vs UsRules.stressTest in src/domain/types.ts.
          why={
            rules.stressTest
              ? t("mStressWhy", { floor: pct(rules.stressTest.floor, 2) })
              : t("mNoStressTest")
          }
        />
        <MathRow
          label={t("mFactor")}
          value={result.fq.toFixed(6)}
          why={t(countryKey("mFactorWhy", rules.country))}
        />
        <MathRow
          label={`${t("mGdsAllow")} · ${t(countryKey("dtiFrontAbbr", rules.country))} ${pct(rules.gds)}`}
          value={fmt(result.gdsAllow)}
        />
        <MathRow
          label={`${t("mTdsAllow")} · ${t(countryKey("dtiBackAbbr", rules.country))} ${pct(rules.tds)}`}
          value={fmt(result.tdsAllow)}
        />
        <MathRow
          label={t("mBinding")}
          value={`${fmt(result.binding)} · ${t(countryKey(result.tdsBinds ? "dtiBackAbbr" : "dtiFrontAbbr", rules.country))}`}
          strong
          why={result.tdsBinds ? t("ckTds") : t("ckGds")}
        />
        <MathRow label={t("mMaxPrice")} value={fmt(result.ceiling)} strong />
        {/*
          The down payment is an ARGUMENT, not a word in the copy. Both labels read
          "at 20% down" in all four catalogues, left over from the flat 0.8 the engine
          used before `financedFraction` — so once the deposit control started moving
          the loan, the page labelled its figures with a deposit it had not used.
          `mComfortPrice` is the page's hero: at the shipped defaults (Toronto, 10%
          down, 30 years, $75,000) it printed $403,050 under the words "at 20% down",
          where the real 20%-down figure is $440,156.
        */}
        <MathRow label={t("mImplied", { p: pct(resolved.dpPct) })} value={fmt(result.impliedMortgage)} />
      </div>

      <div>
        <div className="mb-3 text-[13px] font-semibold text-ac">{t("mComfort")}</div>
        <MathRow label={t("mStated")} value={fmt(resolved.comfortCeiling)} />
        {result.monthly.insurance > 0 ? (
          <MathRow
            label={`${t("mLess")} · ${t("cInsurance")}`}
            value={`− ${fmt(result.monthly.insurance)}`}
          />
        ) : null}
        {result.monthly.utilities > 0 ? (
          <MathRow label={`${t("mLess")} · ${t("cUtilities")}`} value={`− ${fmt(result.monthly.utilities)}`} />
        ) : null}
        {result.monthly.condoFee > 0 ? (
          <MathRow label={`${t("mLess")} · ${t("cCondoFee")}`} value={`− ${fmt(result.monthly.condoFee)}`} />
        ) : null}
        <MathRow label={t("mBudget")} value={fmt(result.budget)} strong />
        <MathRow
          label={`${t("mFactorContract")} · ${pct(resolved.contractRate, 2)}`}
          value={result.fc.toFixed(6)}
        />
        <MathRow label={t("mComfortPrice", { p: pct(resolved.dpPct) })} value={fmt(result.comfort)} strong />
        <MathRow label={t("mDownReq")} value={fmt(result.comfortDown)} />
        <MathRow label={t("mPiAt")} value={fmt(result.comfortPI)} />
      </div>
    </div>
  );
}
