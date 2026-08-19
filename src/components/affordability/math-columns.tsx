"use client";

import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import { federal } from "@/domain/federal";
import type { ResolvedInputs } from "@/lib/resolve-inputs";
import { useMoney, usePercent } from "@/lib/format";
import { Gauges } from "./gauges";

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
    <div className="border-b border-border-hairline py-1 last:border-b-0">
      <div className="flex items-baseline justify-between gap-4 text-[11.5px]">
        <span className={strong ? "font-semibold text-foreground" : "text-muted-foreground"}>
          {label}
        </span>
        <span className={`figure ${strong ? "font-semibold" : ""}`}>{value}</span>
      </div>
      {why ? <p className="mt-0.5 max-w-prose text-[10.5px] text-text-faint">{why}</p> : null}
    </div>
  );
}

/**
 * Every figure, traced. This is where the engine outputs that had no home
 * surface: qualIncome, qualRate, fq, fc, gdsAllow, tdsAllow, binding, budget,
 * impliedMortgage, comfortDown, comfortPI and the two ratios.
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

  return (
    <section aria-labelledby="math" className="flex flex-col gap-3">
      <div>
        <h2 id="math" tabIndex={-1} className="text-[13px] font-semibold">
          {t("mTitle")}
        </h2>
        <p className="max-w-prose text-[11.5px] text-muted-foreground">{t("mSub")}</p>
      </div>

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-3">
          <h3 className="micro mb-1 text-text-faint">{t("mLender")}</h3>
          <MathRow label={t("mQualInc")} value={fmt(result.qualIncome)} />
          <MathRow label={t("mStressRate")} value={pct(result.qualRate, 2)} why={t("mStressWhy", { floor: pct(federal.stressTest.floor, 2) })} />
          <MathRow label={t("mFactor")} value={result.fq.toFixed(6)} why={t("mFactorWhy")} />
          <MathRow label={`${t("mGdsAllow")} · GDS ${pct(federal.gds)}`} value={fmt(result.gdsAllow)} />
          <MathRow label={`${t("mTdsAllow")} · TDS ${pct(federal.tds)}`} value={fmt(result.tdsAllow)} />
          <MathRow
            label={t("mBinding")}
            value={`${fmt(result.binding)} · ${result.tdsBinds ? "TDS" : "GDS"}`}
            strong
            why={result.tdsBinds ? t("ckTds") : t("ckGds")}
          />
          <MathRow label={t("mMaxPrice")} value={fmt(result.ceiling)} strong />
          <MathRow label={t("mImplied")} value={fmt(result.impliedMortgage)} />
        </div>

        <div className="rounded-lg border border-border bg-card p-3">
          <h3 className="micro mb-1 text-primary">{t("mComfort")}</h3>
          <MathRow label={t("mStated")} value={fmt(resolved.comfortCeiling)} />
          {/* The engine's own monthly figures, not the inputs re-divided here:
              two code paths for one number is how two screens start disagreeing. */}
          <MathRow
            label={`${t("mLess")} · ${t("cInsurance")}`}
            value={`− ${fmt(result.monthly.insurance)}`}
          />
          <MathRow
            label={`${t("mLess")} · ${t("cUtilities")}`}
            value={`− ${fmt(result.monthly.utilities)}`}
          />
          <MathRow
            label={`${t("mLess")} · ${t("cCondoFee")}`}
            value={`− ${fmt(result.monthly.condoFee)}`}
          />
          <MathRow label={t("mBudget")} value={fmt(result.budget)} strong />
          <MathRow
            label={`${t("mFactorContract")} · ${pct(resolved.contractRate, 2)}`}
            value={result.fc.toFixed(6)}
          />
          <MathRow label={t("mComfortPrice")} value={fmt(result.comfort)} strong />
          <MathRow label={t("mDownReq")} value={fmt(result.comfortDown)} />
          <MathRow label={t("mPiAt")} value={fmt(result.comfortPI)} />
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-3">
        <Gauges result={result} />
        {/*
          The one place the lender's arithmetic and the household's deliberately
          disagree, said out loud rather than left to be discovered.
        */}
        <p className="mt-3 max-w-prose text-[10.5px] text-text-faint">
          {t("heatNote", { h: fmt(federal.heatAllowance) })}
        </p>
      </div>
    </section>
  );
}
