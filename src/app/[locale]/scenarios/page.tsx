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

/**
 * The price at which the minimum down payment steps from 5% to a blended rate.
 * Named here because the sentence explaining the rule has to agree with
 * minDown(), and a literal in copy cannot be made to.
 */
const MIN_DOWN_TIER = 500000;

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
  const cashUnanswered = columns.every((c) => c.fundable === null);
  const cashFundable = columns.some((c) => c.fundable === true);
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
      ? // ONE string, in the same unit as the table row below. Two branches on
        // `returnOnExtra >= 1` left the >= 1 copy unreachable at every price the
        // product can model, and the reader with "saves $76,010" and "returns
        // 0.91x" in one block with nothing reconciling the two magnitudes.
        t("recTwentySub", {
          save: fmt(rec.saving),
          extra: fmt(rec.extraCash),
          ret: `${rec.returnOnExtra.toFixed(2)}×`,
        })
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

  /**
   * The spread across the four columns, which is what this section found.
   *
   * The row's line used to be `gMonthly` -- the section's own name, printed
   * twice on one row. The reader gets one line of explanation per section and
   * that one spent it repeating two words they had already read. Selection over
   * engine output, not arithmetic: the same lowestBy the table's `best` marks use.
   */
  const cheapestMonthly = columns[lowestBy((c) => c.monthly.total)(columns)];
  const dearestMonthly = columns[lowestBy((c) => -c.monthly.total)(columns)];
  // A spread needs two ends. When every column costs the same -- price 0, or any
  // degenerate input -- naming the same column twice reads as a range that is not
  // one, so the line falls back to the section's plain description.
  const monthlyLine =
    dearestMonthly.monthly.total - cheapestMonthly.monthly.total > 0.5
      ? `${t("column", { p: pct(dearestMonthly.dpPct) })} ${fmt(dearestMonthly.monthly.total)} · ${t("column", { p: pct(cheapestMonthly.dpPct) })} ${fmt(cheapestMonthly.monthly.total)}`
      : t("gMonthly");

  const monthlyRows: MetricRow[] = [
    { label: t("rDownAmt"), value: (c) => fmt(c.down) },
    { label: t("rBaseLoan"), value: (c) => fmt(c.baseLoan) },
    { label: t("rLtv"), value: (c) => pct(c.ltv * 100, 1), mark: "rule" },
    { label: t("rTotalMort"), value: (c) => fmt(c.totalMortgage), mark: "rule" },
    { label: t("rPremRate"), value: (c) => (c.premRate > 0 ? pct(c.premRate * 100, 2) : t("fNoPremium")), mark: "rule" },
    { label: t("rPremAmt"), value: (c) => (c.premium > 0 ? fmt(c.premium) : "—"), mark: "rule" },
    { label: t("rContract"), value: (c) => pct(c.contractRate, 2), mark: "rule" },
    { label: t("rPi"), value: (c) => fmt(c.monthly.pi) },
    { label: t("rPropTax"), value: (c) => fmt(c.monthly.propTax), mark: "estimate" },
    { label: t("rMaint"), value: (c) => fmt(c.monthly.maintenance), mark: "estimate" },
    { label: t("rAllIn"), value: (c) => fmt(c.monthly.total), strong: true, best: lowestBy((c) => c.monthly.total) },
    // money() already puts the sign outside the symbol. Re-implementing that here
    // is how two screens end up formatting the same negative figure differently.
    { label: t("rVsCeiling"), value: (c) => fmt(-c.vsCeiling) },
  ];

  const cashRows: MetricRow[] = [
    { label: t("rClosing"), value: (c) => fmt(c.closingTotal), mark: "rule" },
    { label: t("rPremTax"), value: (c) => (c.premiumTaxLine > 0 ? fmt(c.premiumTaxLine) : "—"), mark: "rule" },
    { label: t("rCash"), value: (c) => fmt(c.net), strong: true, best: lowestBy((c) => c.net) },
    { label: t("rSurplus"), value: (c) => (c.surplus === null ? "—" : fmt(c.surplus)) },
    {
      label: t("rMonths"),
      // Three distinguishable answers, from one engine helper: 0 means you can
      // already close, "—" means no saving rate was given, a number is months.
      // 0 is "you can already close", not "0 months of saving away".
      value: (c) =>
        c.months === null ? "—" : c.months === 0 ? t("fFundable") : t("fMonths", { n: c.months }),
    },
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

        {section("monthly", "none", monthlyLine, fmt(headline.monthly.total), t("monthlyWhy"), (
          <>
            <CompareGrid
              columns={columns}
              rows={monthlyRows}
              recommendedPct={recommendedPct}
              caption={`${t("gMortgage")} · ${t("gMonthly")}`}
            />
            <p className="pt-3 text-[12px] leading-[1.6] text-ink3">
              {t("minDownNote", { a: fmt(MIN_DOWN_TIER), b: fmt(minDown(resolved.price)) })}
            </p>
            <p className="pt-1.5 text-[12px] leading-[1.6] text-ink3">{t("whyPremium")}</p>
            <p className="pt-1.5 text-[12px] leading-[1.6] text-ink3">{t("whyContract")}</p>
            <p className="pt-1.5 text-[12px] leading-[1.6] text-ink3">{t("whyVsCeiling")}</p>
          </>
        ))}

        {section(
          "cash",
          // Derived from the columns, NOT from rec.kind. recommend() tests approval
          // before fundability on purpose, so a household that no lender would
          // approve returned "noneQualify" whether or not funds were ever given --
          // and this row painted itself green over a table of em-dashes.
          cashUnanswered ? "none" : cashFundable ? "pass" : "blocked",
          // Once funds are known this row states the answer, not the principle.
          // `gCashNote` is also the first sentence of `cashWhy`, so on an open
          // section it was the same sentence twice, one line apart.
          cashUnanswered ? t("gCashNote") : cashFundable ? t("fFundable") : t("fShort"),
          fmt(headline.net),
          t("cashWhy"),
          <>
            <CompareGrid
              columns={columns}
              rows={cashRows}
              recommendedPct={recommendedPct}
              caption={t("gCash")}
            />
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
            <CompareGrid
              columns={columns}
              rows={qualRows}
              recommendedPct={recommendedPct}
              caption={t("gQual")}
            />
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
            <CompareGrid
              columns={columns}
              rows={lifeRows}
              recommendedPct={recommendedPct}
              caption={t("gLifetime")}
            />

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
            dpPctEffective={resolved.dpPct}
            belowMinimum={resolved.belowMinimum}
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
