"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { minDown, scenario } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSections } from "@/hooks/use-sections";
import { useSharedState } from "@/hooks/use-shared-state";
import { TOOL_DEFAULTS, TOOL_KEYS } from "@/lib/shared-inputs";
import { isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
import { SCENARIOS_SECTIONS } from "@/lib/sections";
import { recommend, SCENARIO_PERCENTS } from "@/lib/scenarios-view";
import type { Tone } from "@/lib/tone";
import { useMoney, usePercent } from "@/lib/format";
import { SectionRow } from "@/components/affordability/section-row";
import { CompareGrid, type MetricRow } from "@/components/scenarios/compare-grid";
import { NumberField } from "@/components/number-field";
import { PurchaseInputs } from "@/components/purchase-inputs";
import { AnswerHead, FigureFooter, SectionsHeader, ToolMain } from "@/components/tool-page";

export default function ScenariosPage() {
  const t = useTranslations("Scenarios");
  const [jurisdiction] = useJurisdiction();
  const [stored, update] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const { isOpen, toggle, expanded, toggleAll } = useSections(SCENARIOS_SECTIONS);
  const fmt = useMoney();
  const pct = usePercent();

  const resolved = useMemo(
    () => resolveInputs(stored, jurisdiction, federal),
    [stored, jurisdiction],
  );

  const columns = useMemo(
    () =>
      SCENARIO_PERCENTS.map((dpPct) =>
        scenario(jurisdiction, federal, {
          price: resolved.price,
          dpPct,
          amortYears: resolved.amortYears,
          ftb: resolved.ftb,
          ptype: resolved.ptype,
          elsewhere: resolved.elsewhere,
          insuranceAnnual: resolved.insuranceAnnual,
          utilities: resolved.utilities,
          condoFee: resolved.condoFee,
          comfortCeiling: resolved.comfortCeiling,
          // The haircut-adjusted income a lender would qualify, matching Affordability.
          qualIncome:
            (resolved.income1 + resolved.income2 + resolved.otherIncome) *
            (1 - resolved.haircut / 100),
          debts: resolved.debts,
          funds: resolved.funds,
          save: resolved.save,
        }),
      ),
    [jurisdiction, resolved],
  );

  const rec = recommend(columns);
  const recommendedPct = rec.kind === "twenty" ? rec.pct : rec.kind === "only" ? rec.pct : null;

  const head =
    rec.kind === "twenty"
      ? t("recTwenty", { save: fmt(rec.saving) })
      : rec.kind === "only"
        ? t("recOnly", { p: pct(rec.pct) })
        : rec.kind === "noneCash"
          ? t("recNoneCash")
          : rec.kind === "noneQualify"
            ? t("recNoneQual")
            : t("subtitle");
  const sub =
    rec.kind === "twenty"
      ? t("recTwentySub", { ret: pct(rec.returnOnExtra * 100, 0), extra: fmt(rec.extraCash) })
      : rec.kind === "only"
        ? t("recOnlySub", {
            extra: fmt(rec.extraCash),
            n: rec.months ?? 0,
            save: fmt(rec.saving),
          })
        : rec.kind === "noneCash"
          ? t("recNoneCashSub", {
              cash: fmt(rec.cheapest.net),
              funds: resolved.funds === null ? "—" : fmt(resolved.funds),
              n: rec.months ?? 0,
            })
          : rec.kind === "noneQualify"
            ? t("recNoneQualSub")
            : t("gCashNote");

  const headline =
    rec.kind === "twenty" || rec.kind === "only"
      ? columns.find((c) => c.dpPct === recommendedPct)!
      : columns[0];

  const section = (id: string, tone: Tone, line: string, figure: string, why: string, body: ReactNode) => {
    const def = SCENARIOS_SECTIONS.find((entry) => entry.id === id)!;
    return (
      <SectionRow
        key={id}
        id={id}
        name={t(def.labelKey)}
        tone={tone}
        line={line}
        figure={figure}
        why={why}
        open={isOpen(id)}
        onToggle={() => toggle(id)}
      >
        {body}
      </SectionRow>
    );
  };

  const lowestBy = (pick: (c: (typeof columns)[number]) => number) => (cols: readonly (typeof columns)[number][]) => {
    let best = 0;
    cols.forEach((column, i) => {
      if (pick(column) < pick(cols[best])) best = i;
    });
    return best;
  };

  const monthlyRows: MetricRow[] = [
    { label: t("rDownAmt"), value: (c) => fmt(c.down) },
    { label: t("rTotalMort"), value: (c) => fmt(c.totalMortgage), mark: "rule" },
    { label: t("rPremRate"), value: (c) => (c.premRate > 0 ? pct(c.premRate * 100, 2) : t("fNoPremium")), mark: "rule" },
    { label: t("rPremAmt"), value: (c) => (c.premium > 0 ? fmt(c.premium) : "—"), mark: "rule" },
    { label: t("rContract"), value: (c) => pct(c.contractRate, 2), mark: "rule" },
    { label: t("rPi"), value: (c) => fmt(c.monthly.pi) },
    { label: t("rPropTax"), value: (c) => fmt(c.monthly.propTax), mark: "estimate" },
    { label: t("rMaint"), value: (c) => fmt(c.monthly.maintenance), mark: "estimate" },
    { label: t("rAllIn"), value: (c) => fmt(c.monthly.total), strong: true, best: lowestBy((c) => c.monthly.total) },
    { label: t("rVsCeiling"), value: (c) => `${c.vsCeiling <= 0 ? "" : "− "}${fmt(Math.abs(c.vsCeiling))}` },
  ];

  const cashRows: MetricRow[] = [
    { label: t("rClosing"), value: (c) => fmt(c.closingTotal), mark: "rule" },
    { label: t("rPremTax"), value: (c) => (c.premiumTaxLine > 0 ? fmt(c.premiumTaxLine) : "—"), mark: "rule" },
    { label: t("rCash"), value: (c) => fmt(c.net), strong: true, best: lowestBy((c) => c.net) },
    { label: t("rSurplus"), value: (c) => (c.surplus === null ? "—" : fmt(c.surplus)) },
    { label: t("rMonths"), value: (c) => (c.months === null ? "—" : String(c.months)) },
    {
      label: t("gCash"),
      value: (c) => (c.fundable === null ? "—" : c.fundable ? t("fFundable") : t("fShort")),
      strong: true,
    },
  ];

  const qualRows: MetricRow[] = [
    { label: t("rQualRate"), value: (c) => pct(c.qualRate, 2), mark: "rule" },
    { label: t("rStressPay"), value: (c) => fmt(c.stressPay) },
    { label: t("rGds"), value: (c) => pct(c.gds, 1), mark: "rule" },
    { label: t("rTds"), value: (c) => pct(c.tds, 1), mark: "rule" },
    { label: t("rResult"), value: (c) => (c.qualifies ? t("fQualifies") : t("fDeclines")), strong: true },
  ];

  const lifeRows: MetricRow[] = [
    { label: t("rInterest"), value: (c) => fmt(c.totalInterest), mark: "rule" },
    { label: t("rPremAmt"), value: (c) => (c.premium > 0 ? fmt(c.premium) : "—") },
    {
      label: t("rBorrowCost"),
      value: (c) => fmt(c.costOfBorrowing),
      strong: true,
      best: lowestBy((c) => c.costOfBorrowing),
    },
    { label: t("rExtraCash"), value: (c) => fmt(c.net - columns[0].net) },
    { label: t("rLifeSaving"), value: (c) => fmt(columns[0].costOfBorrowing - c.costOfBorrowing) },
    {
      label: t("rReturn"),
      value: (c) => {
        const extra = c.net - columns[0].net;
        return extra > 0
          ? `${((columns[0].costOfBorrowing - c.costOfBorrowing) / extra).toFixed(2)}×`
          : "—";
      },
    },
  ];

  const note = (title: string, body: string) => (
    <div className="border-b border-hairline py-3">
      <p className="text-[13px] font-semibold">{title}</p>
      <p className="mt-1 max-w-[620px] text-[12.5px] leading-[1.6] text-ink2 text-pretty">{body}</p>
    </div>
  );

  return (
    <ToolMain>
      <AnswerHead
        eyebrow={t("title")}
        figure={fmt(headline.monthly.total)}
        pulseKey={jurisdiction.id}
        head={head}
        sub={sub}
        tag={isPersonalised(stored) ? t("tagYours") : t("tagTypical")}
        stats={[
          { label: t("allIn"), value: fmt(headline.monthly.total), mark: "estimate" },
          { label: t("cashAtClosing"), value: fmt(headline.net), mark: "rule" },
          { label: t("rBorrowCost"), value: fmt(headline.costOfBorrowing), mark: "rule" },
        ]}
      />

      <div className="pt-8 sm:pt-[34px]">
        <SectionsHeader
          label={t("breakdown")}
          expanded={expanded}
          onToggleAll={toggleAll}
          expandLabel={t("expandAll")}
          collapseLabel={t("collapseAll")}
        />

        {section("monthly", "none", t("gMonthly"), fmt(headline.monthly.total), t("monthlyWhy"), (
          <>
            <CompareGrid columns={columns} rows={monthlyRows} recommendedPct={recommendedPct} />
            <p className="pt-3 text-[12px] leading-[1.6] text-ink3">
              {t("minDownNote", { a: fmt(500000), b: fmt(minDown(resolved.price)) })}
            </p>
            <p className="pt-1.5 text-[12px] leading-[1.6] text-ink3">{t("whyPremium")}</p>
            <p className="pt-1.5 text-[12px] leading-[1.6] text-ink3">{t("whyContract")}</p>
          </>
        ))}

        {section(
          "cash",
          rec.kind === "noneCash" ? "blocked" : rec.kind === "unanswered" ? "none" : "pass",
          t("gCashNote"),
          fmt(headline.net),
          t("cashWhy"),
          <>
            <CompareGrid columns={columns} rows={cashRows} recommendedPct={recommendedPct} />
            <p className="pt-3 text-[12px] leading-[1.6] text-ink3">{t("whyPremTax")}</p>
            <div className="mt-4 flex max-w-[420px] flex-col gap-3">
              <NumberField
                id="funds"
                label={t("fFunds")}
                value={stored.funds}
                min={0}
                onCommit={(funds) => update({ funds })}
              />
            </div>
          </>,
        )}

        {section(
          "approval",
          rec.kind === "noneQualify" ? "blocked" : "pass",
          rec.kind === "noneQualify" ? t("fDeclines") : t("fQualifies"),
          pct(headline.gds, 1),
          t("approvalWhy"),
          <>
            <CompareGrid columns={columns} rows={qualRows} recommendedPct={recommendedPct} />
            <div className="mt-4 grid max-w-[520px] gap-3 sm:grid-cols-2">
              <NumberField
                id="income1"
                label={t("fIncome")}
                value={stored.income1}
                placeholder={resolved.income1}
                min={0}
                onCommit={(income1) => update({ income1 })}
              />
              <NumberField
                id="otherDebt"
                label={t("fDebts")}
                value={stored.otherDebt}
                min={0}
                onCommit={(otherDebt) => update({ otherDebt })}
              />
              <NumberField
                id="comfortCeiling"
                label={t("fCeiling")}
                value={stored.comfortCeiling}
                placeholder={resolved.comfortCeiling}
                min={0}
                onCommit={(comfortCeiling) => update({ comfortCeiling })}
              />
            </div>
          </>,
        )}

        {section("lifetime", "none", t("gLifeNote"), fmt(headline.costOfBorrowing), t("lifetimeWhy"), (
          <>
            <CompareGrid columns={columns} rows={lifeRows} recommendedPct={recommendedPct} />
            <p className="pt-3 text-[12px] leading-[1.6] text-ink3">{t("whyReturn")}</p>
            <div className="mt-4">
              <p className="eyebrow pb-1 text-ink3">{t("howToRead")}</p>
              {note(t("nTwentyTitle"), t("nTwentyBody"))}
              {note(t("nAboveTitle"), t("nAboveBody"))}
              {note(t("nHurdleTitle"), t("nHurdleBody"))}
              {note(t("nOrderTitle"), t("nOrderBody"))}
            </div>
          </>
        ))}
      </div>

      <section aria-labelledby="sc-inputs" className="mt-8 flex flex-col gap-3">
        <h2 id="sc-inputs" className="text-[13px] font-semibold">
          {t("adjust")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <PurchaseInputs
            price={stored.price}
            pricePlaceholder={resolved.price}
            dpPct={stored.dpPct}
            amortYears={stored.amortYears}
            ptype={stored.ptype}
            ftb={stored.ftb}
            elsewhere={stored.elsewhere}
            jurisdiction={jurisdiction}
            onChange={update}
          />
        </div>
      </section>

      <FigureFooter jurisdiction={jurisdiction} />
    </ToolMain>
  );
}
