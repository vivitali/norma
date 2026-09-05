"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { rentVsBuy, rowAt } from "@/domain/engine";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useRules } from "@/hooks/use-country";
import { useSections } from "@/hooks/use-sections";
import { useSharedState } from "@/hooks/use-shared-state";
import { TOOL_DEFAULTS, TOOL_KEYS } from "@/lib/shared-inputs";
import { isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
import { countryKey } from "@/lib/country-key";
import { RENT_VS_BUY_SECTIONS } from "@/lib/sections";
import type { Tone } from "@/lib/tone";
import { useMoney, usePercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PanelRow, SectionRow } from "@/components/affordability/section-row";
import { SegmentedGroup } from "@/components/affordability/segmented-group";
import { CrossLink } from "@/components/cross-link";
import { WealthChart } from "@/components/rent-vs-buy/wealth-chart";
import { NumberField } from "@/components/number-field";
import { Provenance } from "@/components/provenance";
import { PurchaseInputs } from "@/components/purchase-inputs";
import { AnswerHead, FigureFooter, NoteLine, PendingFigures, SectionsHeader, ToolMain } from "@/components/tool-page";
import { FAVOURS_BUYING, FAVOURS_RENTING } from "./omissions";
import { CalcLedger, CalcTrace } from "@/components/calc/calc-trace";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** Modelled to 40 years regardless of horizon: the break-even can be past year 25. */
const HORIZON_YEARS = 40;
const HOLD_CHOICES = [3, 5, 10, 25] as const;
/** The rows of the by-holding-period table. The reader's own horizon is marked among them. */
const HOLDING_PERIODS = [3, 5, 10, 15, 25, 40] as const;

export default function RentVsBuyPage() {
  const t = useTranslations("RentVsBuy");
  const tJur = useTranslations("Jurisdictions");
  // The ask that replaces the answer where nobody publishes a price.
  const tInputs = useTranslations("Inputs");
  const [jurisdiction] = useJurisdiction();
  const rules = useRules();
  const [stored, update, hydrated] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const { isOpen, toggle, expanded, toggleAll } = useSections(
    RENT_VS_BUY_SECTIONS,
    // Always the verdict: this page has exactly one question, and the break-even
    // year is the only number that answers it.
    "verdict",
  );
  const fmt = useMoney();
  const pct = usePercent();

  const resolved = useMemo(
    () => resolveInputs(stored, jurisdiction, rules),
    [stored, jurisdiction, rules],
  );

  const input = useMemo(
    () => ({
      price: resolved.price,
      dpPct: resolved.dpPct,
      amortYears: resolved.amortYears,
      ftb: resolved.ftb,
      ptype: resolved.ptype,
      elsewhere: resolved.elsewhere,
      residency: resolved.residency,
      insuranceAnnual: resolved.insuranceAnnual,
      utilities: resolved.utilities,
      condoFee: resolved.condoFee,
      rent: resolved.rent,
      rentInflation: resolved.rentInflation,
      appreciation: resolved.appreciation,
      appreciationOn: resolved.appreciationOn,
      investReturn: resolved.investReturn,
      investDiff: resolved.investDiff,
      // The reader's own rate, and their own renewal assumption. Both were already
      // stored and both were invisible to this page: `RentVsBuyInput` carried
      // neither, so a rate set on Affordability and a renewal set on Amortization
      // were honoured there and silently dropped here, on the screen that projects
      // them forward for forty years.
      contractRate: resolved.contractRate / 100,
      termYears: resolved.termYears,
      renewalRate: resolved.renewalRate === null ? null : resolved.renewalRate / 100,
      years: HORIZON_YEARS,
      // US only: `rentVsBuyToMaturity`'s itemised-vs-standard-deduction benefit reads this
      // to find the reader's marginal rate. `resolved.taxIncome` is the same household-income
      // figure Down Payment and RRSP-HBP already read for the same purpose (RRSP-HBP's
      // marginal-rate lookup, Down Payment's own bracket display) — one number, not a second
      // question this page would otherwise have to ask. The Canadian branch never reads
      // `taxableIncome` at all, so passing it costs that branch nothing.
      taxableIncome: resolved.taxIncome,
    }),
    [resolved],
  );

  const result = useMemo(() => rentVsBuy(jurisdiction, rules, input), [jurisdiction, rules, input]);
  /**
   * The same comparison with appreciation switched off. Needed to answer the one
   * question the headline verdict cannot: is buying winning on shelter costs, or
   * only on a forecast of the housing market?
   */
  const flat = useMemo(
    () => rentVsBuy(jurisdiction, rules, { ...input, appreciationOn: false }),
    [jurisdiction, rules, input],
  );

  const hold = resolved.holding;
  const atHorizon = rowAt(result.rows, hold);
  const flatAtHorizon = rowAt(flat.rows, hold);
  const buyWins = atHorizon.adv > 0;
  const flatBuyWins = flatAtHorizon.adv > 0;

  const head = buyWins ? t("vBuy") : t("vRent");
  const sub = buyWins
    ? t("vBuySub", { hold, cross: result.breakEven ?? hold, amt: fmt(atHorizon.adv) })
    : result.breakEven === null
      ? t("vNeverSub", { hold, amt: fmt(-atHorizon.adv) })
      : t("vRentSub", { hold, cross: result.breakEven, amt: fmt(-atHorizon.adv) });
  // The counterweight the headline cannot carry: whether the verdict survives a
  // flat market. If it does not, the reader is betting on price growth.
  const caveat = buyWins ? (flatBuyWins ? t("vFlatGood") : t("vApprOnly")) : null;

  const section = (id: string, tone: Tone, line: string, figure: string, why: string, body: ReactNode) => {
    const def = RENT_VS_BUY_SECTIONS.find((entry) => entry.id === id)!;
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

  const notCaptured = (title: string, points: string[]) => (
    <div className="mt-3">
      <p className="eyebrow pb-1 text-ink3">{title}</p>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {points.map((point) => (
          <li key={point} className="max-w-[620px] text-[12.5px] leading-[1.6] text-ink2 text-pretty">
            {point}
          </li>
        ))}
      </ul>
    </div>
  );

  return (
    <ToolMain>
      {/*
        Two figures must be real before this page may answer, and the reader gets
        whichever ask is outstanding.

        A price, because every owner figure derives from it and `resolved.price` is 0
        where nobody publishes a benchmark. And a RENT: six records carry no rent at
        all — CMHC suppresses every Yukon cell and does not survey Nunavut — and the
        fallback behind them is a national placeholder that is nobody's rent. A verdict
        is a comparison of two numbers; inventing one of them does not make a
        comparison, it makes a sentence about a rent we made up.
      */}
      {resolved.priceKnown && resolved.rentKnown ? (
        <>
          <PendingFigures pending={!hydrated}>
          <AnswerHead
            eyebrow={t("title")}
            figure={fmt(Math.abs(atHorizon.adv))}
            pulseKey={jurisdiction.id}
            head={head}
            sub={caveat ? `${sub} ${caveat}` : sub}
            tag={isPersonalised(stored) ? t("tagYours") : t("tagTypical")}
            stats={[
              {
                label: t("crossLabel"),
                // The answer goes in the value. A bare em-dash with the finding
                // pushed into `note` read as a rendering fault: the stat appeared
                // broken, and the note then contradicted the label above it. `note`
                // is a short qualifier, never the answer itself.
                // `crossNever`, not `neverAhead`: the value slot is 22px and
                // whitespace-nowrap, and `neverAhead` is a full sentence that wraps
                // out of it. `neverAhead` still carries the same fact in the chart
                // caption, where there is room for a sentence.
                value:
                  result.breakEven === null
                    ? t("crossNever", { n: HORIZON_YEARS })
                    : t("crossYear", { n: result.breakEven }),
                mark: "estimate",
              },
              { label: t("buyWealth"), value: fmt(atHorizon.buyW), mark: "estimate" },
              { label: t("rentWealth"), value: fmt(atHorizon.rentW), mark: "estimate" },
            ]}
          />
          </PendingFigures>

          <div className="pt-8 sm:pt-[34px]">
            <SectionsHeader
              label={t("breakdown")}
              expanded={expanded}
              onToggleAll={toggleAll}
              expandLabel={t("expandAll")}
              collapseLabel={t("collapseAll")}
            />

            {section(
              "verdict",
              buyWins ? (flatBuyWins ? "pass" : "caution") : "none",
              t("horizonLabel", { n: hold }),
              // No break-even is not a missing figure, so it does not get an
              // em-dash: the figure slot is `whitespace-nowrap` and cannot carry the
              // sentence that says so. It stays empty — the contract's marker for a
              // section with no single number — and the head stat above states it.
              result.breakEven === null ? "" : t("crossYear", { n: result.breakEven }),
              t("verdictWhy"),
              <>
                <WealthChart result={result} />
                <p className="pb-2 text-[12.5px] text-ink3">{t("byHorizonNote")}</p>
                <div
                  // min-w-0 is load-bearing: this is a flex item, and `min-width: auto` is
                  // the flex default, so without it the container refuses to shrink below
                  // the 560px table and overflow-x-auto never engages — the PAGE scrolls
                  // sideways instead of the table. Only visible with the section open, which
                  // is why it survived a sweep that measured closed pages.
                  className="relative min-w-0 overflow-x-auto"
                >
                  <table className="w-full min-w-[480px] border-collapse text-[12.5px]">
                    <caption className="sr-only">{t("byHorizon")}</caption>
                    <thead>
                      <tr className="border-b border-border text-ink3">
                        <th scope="col" className="py-1.5 pr-3 text-left font-medium">{t("holdFor")}</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t("buyWealth")}</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t("rentWealth")}</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t("advantage")}</th>
                        <th scope="col" className="py-1.5 font-medium">{t("winner")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {HOLDING_PERIODS.map((year) => {
                        const row = rowAt(result.rows, year);
                        // The reader's own horizon, among five that are not theirs.
                        const mine = year === hold;
                        return (
                          <tr
                            key={year}
                            // aria-current carries to a screen reader what the tint
                            // carries visually: of six rows, this is the one that
                            // answers the question the reader actually asked.
                            aria-current={mine ? "true" : undefined}
                            className={
                              mine
                                ? "border-b border-acbr bg-acbg"
                                : "border-b border-hairline"
                            }
                          >
                            <th
                              scope="row"
                              className={
                                mine
                                  ? "py-1.5 pr-3 text-left font-semibold text-ac"
                                  : "py-1.5 pr-3 text-left font-normal text-ink2"
                              }
                            >
                              {t("years", { n: year })}
                              {mine ? <span className="sr-only"> · {t("horizonLabel", { n: hold })}</span> : null}
                            </th>
                            {/*
                              Right-aligned: this table exists to be read down a
                              column, and left-aligned currency puts the thousands
                              digit of one row over the hundreds of the next.
                            */}
                            <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(row.buyW)}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(row.rentW)}</td>
                            {/*
                              SIGNED, not Math.abs. The column is "Advantage of
                              buying" and it was printing the absolute value, so a
                              row where buying trails by $648,135 read as an
                              advantage OF $648,135. money() puts the sign outside
                              the symbol, so the minus does the work.
                            */}
                            <td
                              className={cn(
                                "py-1.5 pr-3 text-right font-medium tabular-nums",
                                row.adv > 0 ? "text-pass" : "text-ink",
                              )}
                            >
                              {fmt(row.adv)}
                            </td>
                            {/*
                              Both outcomes in full ink. The winner used to be
                              pass-green for buying and muted grey for renting, which
                              rendered every winner on the default data as the quiet
                              one -- and said renting winning is an absence rather
                              than a result. PRODUCT.md holds buyers and renters
                              co-equal; neither answer is a pass or a fail.
                            */}
                            <td className="py-1.5 font-semibold">
                              {row.adv > 0 ? t("buyWord") : t("rentWord")}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>,
            )}

            {section(
              "outlay",
              "none",
              t("setupLine", {
                up: fmt(result.upFront),
                mort: fmt(result.fin.loan),
                rate: pct(result.rate, 2),
                pay: fmt(result.pay),
              }),
              fmt(atHorizon.ownerOutlay),
              t("outlayWhy"),
              <>
                <PanelRow label={t("upFront")} value={fmt(result.upFront)} strong />
                {/*
                  TRACE. upFront is the down payment plus closingTotal()'s bill —
                  the closing-costs page's own answer, printed here with no way to
                  reach its derivation.
                */}
                <CrossLink namespace="RentVsBuy" id="xClosing" href="/closing-costs" placement="row" />
                {/*
                  The two owner costs the model charges every year and never
                  printed. Property tax and the maintenance reserve are both
                  price-driven and both compound with appreciation, and the
                  reserve in particular is the acute one — at 1% of value it is
                  close to a thousand dollars a month on a $1.2M home, and it
                  appeared nowhere outside a collapsed caveat about it possibly
                  being too LOW.

                  Insurance and utilities are deliberately not here: both already
                  have their own fields further down this page, and the utilities
                  row would be mislabelled anyway — `rentVsBuy()` folds the condo
                  fee into it, so on a condo the figure is not utilities.

                  These are this year's figures, like `cOwner` directly below
                  them, which is why they carry no year of their own.
                */}
                <PanelRow label={t("cPropTax")} value={fmt(atHorizon.propTax)} provenance={<Provenance kind="estimate" />} />
                <PanelRow label={t("cMaint")} value={fmt(atHorizon.maintenance)} provenance={<Provenance kind="estimate" />} />
                {/*
                  US only. `atHorizon.pmi` is undefined on the Canadian branch (a CMHC
                  premium is financed once, up front, not a recurring line here) and
                  falls to 0 once `fin.insuranceMonths` has passed this year's start —
                  gated on the figure itself, matching the "absent while it does not
                  apply" convention `buildLines` and the trace's own credit rows use.
                */}
                {rules.country === "us" && (atHorizon.pmi ?? 0) > 0 ? (
                  <PanelRow label={t("cPmi")} value={fmt(atHorizon.pmi ?? 0)} provenance={<Provenance kind="estimate" />} />
                ) : null}
                <PanelRow label={t("cOwner")} value={fmt(atHorizon.ownerOutlay)} provenance={<Provenance kind="estimate" />} />
                <PanelRow label={t("cRenter")} value={fmt(atHorizon.renterOutlay)} provenance={<Provenance kind="estimate" />} />
                <PanelRow label={t("cBalance")} value={fmt(atHorizon.balance)} />
                {result.payoffYear !== null ? (
                  <PanelRow
                    label={t("payoffLabel", { n: result.payoffYear })}
                    value={fmt(rowAt(result.rows, result.payoffYear).ownerOutlay)}
                  />
                ) : null}
                {/*
                  US only. `itemizedBeatsStandard`/`deductionBenefit` are undefined on
                  the Canadian branch — see `rentVsBuyToMaturity`'s own comment. Most
                  buyers' itemised deductions (mortgage interest plus SALT-capped
                  property tax) do not beat the standard deduction, so the mortgage-
                  interest deduction most readers have heard of is worth nothing to
                  them — this says which case applies at their own numbers rather than
                  letting the reader assume the popular version.
                */}
                {rules.country === "us" ? (
                  <NoteLine tone={atHorizon.itemizedBeatsStandard ? "quiet" : "caution"}>
                    {atHorizon.itemizedBeatsStandard
                      ? t("stdDeductionTip", { amt: fmt(atHorizon.deductionBenefit ?? 0) })
                      : t("stdDeductionNone")}
                  </NoteLine>
                ) : null}
              </>,
            )}

            {section(
              "wealth",
              buyWins ? "pass" : "none",
              // A single word ("Buy") spent the row's one line of explanation
              // saying less than the figure beside it already did. Naming the
              // horizon the verdict is measured at is the part the figure cannot
              // carry -- the advantage is only true at that year.
              `${buyWins ? t("buyWord") : t("rentWord")} · ${t("atYear", { n: hold })}`,
              fmt(Math.abs(atHorizon.adv)),
              t("wealthWhy"),
              <>
                {/*
                  The largest single one-time figure in the whole model, and it
                  was never printed. It is `rentVsBuy()`'s own `sellingCost`, not
                  `homeValue * rules.sellingCost` recomputed here: the engine
                  nets exactly this amount off the equity row directly below, and a
                  page that re-derives it agrees only until the engine's model
                  changes. It needs no provenance entry of its own beyond the
                  estimate mark `sellingCost` already carries in rules/ca.ts.
                */}
                <PanelRow
                  label={t("cSelling")}
                  value={fmt(atHorizon.sellingCost)}
                  provenance={<Provenance kind="estimate" />}
                />
                <PanelRow label={t("cEquity")} value={fmt(atHorizon.equity)} provenance={<Provenance kind="estimate" />} />
                <PanelRow label={t("cBuyW")} value={fmt(atHorizon.buyW)} strong />
                <PanelRow label={t("cRentW")} value={fmt(atHorizon.rentW)} strong />
                <PanelRow label={t("cAdv")} value={fmt(atHorizon.adv)} strong />
                <div className="mt-4 flex max-w-[520px] flex-col gap-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Label htmlFor="investDiff" className="text-[13px]">
                        {t("swInvest")}
                      </Label>
                      <p className="mt-1 text-[11.5px] leading-[1.5] text-ink3 text-pretty">
                        {stored.investDiff ? t("swInvestOn") : t("swInvestOff")}
                      </p>
                    </div>
                    <Switch
                      id="investDiff"
                      checked={stored.investDiff}
                      onCheckedChange={(investDiff) => update({ investDiff })}
                    />
                  </div>
                  <div className="flex items-start justify-between gap-3 border-t border-hairline pt-3">
                    <div className="min-w-0">
                      <Label htmlFor="appreciationOn" className="text-[13px]">
                        {t("swAppr")}
                      </Label>
                      <p className="mt-1 text-[11.5px] leading-[1.5] text-ink3 text-pretty">
                        {stored.appreciationOn ? t("swApprOn") : t("swApprOff")}
                      </p>
                    </div>
                    <Switch
                      id="appreciationOn"
                      checked={stored.appreciationOn}
                      onCheckedChange={(appreciationOn) => update({ appreciationOn })}
                    />
                  </div>
                </div>
              </>,
            )}

            {/*
              The line names BOTH sides. It used to be `favBuy` alone, which was a
              near-copy of the section's own name and described half of what is
              inside -- a reader who never opened it came away believing the
              omissions all favour buying, which is the opposite of this section's
              point.
              The counts come from the arrays rather than being written into the
              copy, so the sentence cannot drift out of step with the list it
              describes.
            */}
            {section(
              "assumptions",
              "none",
              t("assumptionsLine", { buy: FAVOURS_BUYING.length, rent: FAVOURS_RENTING.length }),
              "",
              t("assumptionsWhy"),
              <>
                {notCaptured(t("favBuy"), FAVOURS_BUYING.map((k) => t(k)))}
                {notCaptured(t("favRent"), FAVOURS_RENTING.map((k) => t(k)))}
              </>,
            )}
            {/*
              "Show me how you got that."

              The derivation at the reader's own horizon, then every year the model
              runs. Both are built from figures already on `result` — this section
              computes nothing of its own, which is the point: a trace that did its
              own arithmetic could agree with itself while disagreeing with the
              answer above it.
            */}
            {section(
              "calc",
              "none",
              t("calcLine"),
              "",
              t("calcWhy"),
              <div className="flex flex-col gap-5">
                <CalcTrace
                  caption={t("calcTraceCaption", { n: hold })}
                  lines={[
                    { label: t("cHomeValue"), value: fmt(atHorizon.homeValue) },
                    { label: t("cSelling"), value: fmt(atHorizon.sellingCost), op: "minus" },
                    { label: t("cBalance"), value: fmt(atHorizon.balance), op: "minus" },
                    { label: t("cEquity"), value: fmt(atHorizon.equity), op: "equals", strong: true },
                    // Absent rather than zero when nothing applies, matching the
                    // convention buildLines uses everywhere else in this app: a row
                    // of zeroes reads as a cost the reader has, and they do not.
                    ...(atHorizon.taxTimeCredits > 0
                      ? [
                          {
                            label: t(countryKey("calcTaxCredits", rules.country)),
                            value: fmt(atHorizon.taxTimeCredits),
                            op: "plus" as const,
                          },
                        ]
                      : []),
                    ...(atHorizon.bp > 0
                      ? [{ label: t("calcInvestedBuy"), value: fmt(atHorizon.bp), op: "plus" as const }]
                      : []),
                    { label: t("calcBuying"), value: fmt(atHorizon.buyW), op: "equals", rule: true, strong: true },
                    {
                      label: t("calcUpfrontGrown"),
                      value: fmt(atHorizon.rentW - atHorizon.rp),
                      note: t("upFrontNote", { up: fmt(result.upFront) }),
                    },
                    ...(atHorizon.rp > 0
                      ? [{ label: t("calcInvestedRent"), value: fmt(atHorizon.rp), op: "plus" as const }]
                      : []),
                    // `minus`, so the final `=` is followable: the difference IS
                    // buying less renting, and two bare subtotals stacked above an
                    // equals sign left the reader to guess which way round.
                    { label: t("calcRenting"), value: fmt(atHorizon.rentW), op: "minus", strong: true },
                    { label: t("calcDifference"), value: fmt(atHorizon.adv), op: "equals", rule: true, strong: true },
                  ]}
                />
                <CalcLedger
                  caption={t("calcLedgerCaption")}
                  rowHeader="year"
                  columns={[
                    { key: "year", label: t("cYear") },
                    { key: "rate", label: t("cRate"), numeric: true },
                    { key: "interest", label: t("cInterest"), numeric: true },
                    { key: "principal", label: t("cPrincipal"), numeric: true },
                    { key: "balance", label: t("cBalance"), numeric: true },
                    { key: "propTax", label: t("cPropTax"), numeric: true },
                    { key: "insurance", label: t("cInsurance"), numeric: true },
                    // US only: PMI and the itemised-deduction tax benefit have no
                    // Canadian counterpart on this row (a CMHC premium is financed
                    // once, up front, not a recurring charge; there is no equivalent
                    // deduction on the Canadian branch at all) — see `RentVsBuyRow`'s
                    // own doc comments.
                    ...(rules.country === "us"
                      ? [
                          { key: "pmi", label: t("cPmi"), numeric: true },
                          { key: "taxBenefit", label: t("cTaxBenefit"), numeric: true },
                        ]
                      : []),
                    { key: "services", label: t("cServices"), numeric: true },
                    { key: "strata", label: t("cStrata"), numeric: true },
                    { key: "maint", label: t("cMaint"), numeric: true },
                    { key: "owner", label: t("cOwner"), numeric: true },
                    { key: "renter", label: t("cRenter"), numeric: true },
                    { key: "equity", label: t("cEquity"), numeric: true },
                    { key: "buyW", label: t("cBuyW"), numeric: true },
                    { key: "rentW", label: t("cRentW"), numeric: true },
                    { key: "adv", label: t("cAdv"), numeric: true },
                  ]}
                  rows={result.rows.map((row) => ({
                    key: row.t,
                    highlight: row.t === hold,
                    cells: {
                      year: String(row.t),
                      rate: pct(row.rate * 100, 2),
                      interest: fmt(row.interest),
                      // Not carried on the row: principal is what the payment was
                      // that the interest was not, and deriving it here keeps one
                      // definition rather than two that can drift.
                      principal: fmt(row.paid - row.interest),
                      balance: fmt(row.balance),
                      propTax: fmt(row.propTax),
                      insurance: fmt(row.insurance),
                      ...(rules.country === "us"
                        ? { pmi: fmt(row.pmi ?? 0), taxBenefit: fmt(row.deductionBenefit ?? 0) }
                        : null),
                      services: fmt(row.services),
                      strata: fmt(row.strata),
                      maint: fmt(row.maintenance),
                      owner: fmt(row.ownerOutlay),
                      renter: fmt(row.renterOutlay),
                      equity: fmt(row.equity),
                      buyW: fmt(row.buyW),
                      rentW: fmt(row.rentW),
                      adv: fmt(row.adv),
                    },
                  }))}
                />
              </div>,
            )}
          </div>
        </>
      ) : !resolved.priceKnown ? (
        <AnswerHead
          eyebrow={t("title")}
          head={tInputs("noPriceHead", { place: tJur(`at.${jurisdiction.id}`) })}
          sub={tInputs("noPriceSub")}
        />
      ) : resolved.rentBasisMismatch ? (
        // A rent IS published here — it just measures a two-bedroom apartment while
        // the price above is a detached house. That is a different sentence from
        // "nobody publishes a rent for here", and the difference is what tells the
        // reader the figure they type has to be for the home they would actually
        // rent instead of this one.
        <AnswerHead
          eyebrow={t("title")}
          head={t("mismatchHead")}
          sub={t("mismatchSub", {
            city: tJur(`at.${jurisdiction.id}`),
            rent: fmt(jurisdiction.rent ?? 0),
          })}
        />
      ) : (
        <AnswerHead
          eyebrow={t("title")}
          head={t("noRentHead", { city: tJur(`at.${jurisdiction.id}`) })}
          sub={t("noRentSub")}
        />
      )}

      <section aria-labelledby="rvb-inputs" className="mt-8 flex flex-col gap-3">
        <h2 id="rvb-inputs" className="text-[13px] font-semibold">
          {t("adjust")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <PurchaseInputs
            price={stored.price}
            pricePlaceholder={resolved.priceKnown ? resolved.price : null}
            dpPct={stored.dpPct}
            dpPctEffective={resolved.dpPct}
            belowMinimum={resolved.belowMinimum}
            amortYears={stored.amortYears}
            ptype={stored.ptype}
            ftbEffective={resolved.ftb}
            ptypeEffective={resolved.ptype}
            residency={stored.residency}
            jurisdiction={jurisdiction}
            onChange={update}
          />
          <fieldset className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
            <legend className="micro px-1 text-ink3">{t("rentWord")}</legend>
            <NumberField
              id="rent"
              label={t("dRent")}
              value={stored.rent}
              // DEFAULT_RENT is a national placeholder and nobody's rent. Offering it
              // here as this city's suggested figure is the same claim the tag below
              // used to make in words.
              placeholder={resolved.rentKnown ? resolved.rent : undefined}
              min={0}
              onCommit={(rent) => update({ rent })}
            />
            {stored.rent === null ? (
              <p className="-mt-1 text-[11.5px] leading-[1.5] text-ink3 text-pretty">
                {/* Not `jurisdiction.city`, which is the lowercase record key — it rendered
                    "winnipeg" to the reader. `sources-content.tsx` already resolves this the
                    right way and documents why; this is the same fix. It matters more now that
                    the territorial records carry a city, so the fallback to `prov` no longer
                    hides it behind "YT".

                    And the tag now says WHICH of the two facts it is stating. "Typical for
                    Nunavut" for a figure CMHC never surveyed is the invented figure this
                    product exists not to ship, and it was the more specific for naming the
                    territory. Either a rent published for here, or no published rent at all. */}
                {resolved.rentKnown
                  ? t("rentTag", { city: tJur(`at.${jurisdiction.id}`) })
                  : resolved.rentBasisMismatch
                    ? t("rentMismatchTag", { rent: fmt(jurisdiction.rent ?? 0) })
                    : t("rentUnknownTag", { city: tJur(`at.${jurisdiction.id}`) })}
              </p>
            ) : null}
            <NumberField
              id="rentInflation"
              label={t("fRentInf")}
              value={stored.rentInflation}
              min={0}
              max={20}
              onCommit={(next) => update({ rentInflation: next ?? 0 })}
            />
            <SegmentedGroup
              label={t("dHolding")}
              value={stored.holding}
              onChange={(holding) => update({ holding })}
              options={HOLD_CHOICES.map((v) => ({ value: v, label: t("years", { n: v }) }))}
            />
            {/*
              The two controls with the largest effect on the verdict, and until
              now the reader could not see what either of them selected: six
              rates, none of them anywhere on the page, while rules/ca.ts's own
              note says the three tiers exist "so the reader can see how much the
              answer depends on it".

              A note line under the group, NOT the rate appended to each segment
              label, for two reasons. `SegmentedGroup`'s label is a `string`, so a
              `Provenance` mark cannot live inside one — and these figures are
              `conf: "assumption"`, so the mark is the disclosure and is not
              optional. And these are the exact two controls DESIGN.md §5 records
              as having blown the 256px budget at 320px in Ukrainian, fixed by
              SHORTENING their labels; lengthening all six again is the change
              that was already reverted once.

              Zero new figures reach the reader that the model was not already
              applying.
            */}
            <SegmentedGroup
              label={t("dAppr")}
              value={stored.apprKey}
              onChange={(apprKey) => update({ apprKey })}
              options={[
                { value: "inflation" as const, label: t("apprInflation") },
                { value: "shelter" as const, label: t("apprShelter") },
                { value: "flat" as const, label: t("apprFlat") },
              ]}
            />
            <NoteLine tight>
              {t("apprRates", {
                a: pct(rules.appreciation.inflation * 100),
                b: pct(rules.appreciation.shelter * 100),
                c: pct(rules.appreciation.flat * 100),
              })}
              <Provenance kind="estimate" />
            </NoteLine>
            <SegmentedGroup
              label={t("dRet")}
              value={stored.retKey}
              onChange={(retKey) => update({ retKey })}
              options={[
                { value: "cash" as const, label: t("retCash") },
                { value: "balanced" as const, label: t("retBalanced") },
                { value: "growth" as const, label: t("retGrowth") },
              ]}
            />
            <NoteLine tight>
              {t("retRates", {
                a: pct(rules.investReturn.cash * 100),
                b: pct(rules.investReturn.balanced * 100),
                c: pct(rules.investReturn.growth * 100),
              })}
              <Provenance kind="estimate" />
            </NoteLine>
            {/*
              The carrying costs this page's own model applies to the owner side.
              They moved the answer and had no control on the screen that used
              them, which left the reader nothing to argue with.
            */}
            <NumberField
              id="insuranceAnnual"
              label={t("fInsurance")}
              value={stored.insuranceAnnual}
              placeholder={resolved.insuranceAnnual}
              min={0}
              onCommit={(insuranceAnnual) => update({ insuranceAnnual })}
            />
            <NumberField
              id="utilities"
              label={t("fUtilities")}
              value={stored.utilities}
              placeholder={resolved.utilities}
              min={0}
              onCommit={(utilities) => update({ utilities })}
            />
            {/*
              Ungated. rentVsBuy() adds condoFee to owner outlay whatever the
              property type, so hiding the control on a house strands a fee the
              model is still charging -- the same defect one property type over.
            */}
            <NumberField
              id="condoFee"
              label={t("fCondo")}
              value={stored.condoFee}
              placeholder={resolved.condoFee}
              min={0}
              onCommit={(condoFee) => update({ condoFee })}
            />
            <NoteLine>{t("leverNote")}</NoteLine>
          </fieldset>
        </div>
      </section>

      <FigureFooter jurisdiction={jurisdiction} />
    </ToolMain>
  );
}
