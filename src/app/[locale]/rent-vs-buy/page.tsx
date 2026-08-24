"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { rentVsBuy, rowAt } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSections } from "@/hooks/use-sections";
import { useSharedState } from "@/hooks/use-shared-state";
import { TOOL_DEFAULTS, TOOL_KEYS } from "@/lib/shared-inputs";
import { isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
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
import { AnswerHead, FigureFooter, SectionsHeader, ToolMain } from "@/components/tool-page";
import { FAVOURS_BUYING, FAVOURS_RENTING } from "./omissions";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/** Modelled to 40 years regardless of horizon: the break-even can be past year 25. */
const HORIZON_YEARS = 40;
const HOLD_CHOICES = [3, 5, 10, 25] as const;
/** The rows of the by-holding-period table. The reader's own horizon is marked among them. */
const HOLDING_PERIODS = [3, 5, 10, 15, 25, 40] as const;


export default function RentVsBuyPage() {
  const t = useTranslations("RentVsBuy");
  const [jurisdiction] = useJurisdiction();
  const [stored, update] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const { isOpen, toggle, expanded, toggleAll } = useSections(
    RENT_VS_BUY_SECTIONS,
    // Always the verdict: this page has exactly one question, and the break-even
    // year is the only number that answers it.
    "verdict",
  );
  const fmt = useMoney();
  const pct = usePercent();

  const resolved = useMemo(
    () => resolveInputs(stored, jurisdiction, federal),
    [stored, jurisdiction],
  );

  const input = useMemo(
    () => ({
      price: resolved.price,
      dpPct: resolved.dpPct,
      amortYears: resolved.amortYears,
      ftb: resolved.ftb,
      ptype: resolved.ptype,
      elsewhere: resolved.elsewhere,
      insuranceAnnual: resolved.insuranceAnnual,
      utilities: resolved.utilities,
      condoFee: resolved.condoFee,
      rent: resolved.rent,
      rentInflation: resolved.rentInflation,
      appreciation: resolved.appreciation,
      appreciationOn: resolved.appreciationOn,
      investReturn: resolved.investReturn,
      investDiff: resolved.investDiff,
      years: HORIZON_YEARS,
    }),
    [resolved],
  );

  const result = useMemo(() => rentVsBuy(jurisdiction, federal, input), [jurisdiction, input]);
  /**
   * The same comparison with appreciation switched off. Needed to answer the one
   * question the headline verdict cannot: is buying winning on shelter costs, or
   * only on a forecast of the housing market?
   */
  const flat = useMemo(
    () => rentVsBuy(jurisdiction, federal, { ...input, appreciationOn: false }),
    [jurisdiction, input],
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
                          {`${year} ${t("years")}`}
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
            <PanelRow label={t("cOwner")} value={fmt(atHorizon.ownerOutlay)} provenance={<Provenance kind="estimate" />} />
            <PanelRow label={t("cRenter")} value={fmt(atHorizon.renterOutlay)} provenance={<Provenance kind="estimate" />} />
            <PanelRow label={t("cBalance")} value={fmt(atHorizon.balance)} />
            {result.payoffYear !== null ? (
              <PanelRow
                label={t("payoffLabel", { n: result.payoffYear })}
                value={fmt(rowAt(result.rows, result.payoffYear).ownerOutlay)}
              />
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
      </div>

      <section aria-labelledby="rvb-inputs" className="mt-8 flex flex-col gap-3">
        <h2 id="rvb-inputs" className="text-[13px] font-semibold">
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
            jurisdiction={jurisdiction}
            onChange={update}
          />
          <fieldset className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
            <legend className="micro px-1 text-ink3">{t("rentWord")}</legend>
            <NumberField
              id="rent"
              label={t("dRent")}
              value={stored.rent}
              placeholder={resolved.rent}
              min={0}
              onCommit={(rent) => update({ rent })}
            />
            {stored.rent === null ? (
              <p className="-mt-1 text-[11.5px] leading-[1.5] text-ink3 text-pretty">
                {t("rentTag", { city: jurisdiction.city ?? jurisdiction.prov })}
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
              options={HOLD_CHOICES.map((v) => ({ value: v, label: `${v} ${t("years")}` }))}
            />
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
            <p className="text-[11.5px] leading-[1.5] text-ink3 text-pretty">{t("leverNote")}</p>
          </fieldset>
        </div>
      </section>

      <FigureFooter jurisdiction={jurisdiction} />
    </ToolMain>
  );
}
