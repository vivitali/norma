"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { minDown, scenario, type ScenarioResult } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { CalcLedger } from "@/components/calc/calc-trace";
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
import { AnswerHead, FigureFooter, NoteLine, PendingFigures, SectionsHeader, ToolMain } from "@/components/tool-page";

export default function ScenariosPage() {
  const t = useTranslations("Scenarios");
  // The ask that replaces the answer where nobody publishes a price, and the
  // reader-facing name of the place that publishes none. `jurisdiction.city` is
  // the lowercase record key and renders "winnipeg"; the name lives here.
  const tInputs = useTranslations("Inputs");
  const tJur = useTranslations("Jurisdictions");
  const [jurisdiction] = useJurisdiction();
  const [stored, update, hydrated] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const fmt = useMoney();
  const pct = usePercent();

  const resolved = useMemo(
    () => resolveInputs(stored, jurisdiction, federal),
    [stored, jurisdiction],
  );

  /**
   * The income a lender would qualify — every income key the household has
   * entered, anywhere in the product, after the recognition haircut.
   *
   * Hoisted out of the `scenario()` literal because this page has to PRINT it.
   * The field below writes `income1` alone and the field beside it writes
   * `otherDebt` alone, while both ratios are computed on all three income keys
   * and all four debt keys — so a reader who had already entered a co-buyer's
   * income or a car payment on /affordability typed a figure here and watched
   * the verdict move by more than they had typed, with nothing on screen to
   * reconcile it. The two totals are now rows in the qualification table.
   */
  const qualIncome =
    (resolved.income1 + resolved.income2 + resolved.otherIncome) * (1 - resolved.haircut / 100);

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
          residency: resolved.residency,
          insuranceAnnual: resolved.insuranceAnnual,
          utilities: resolved.utilities,
          condoFee: resolved.condoFee,
          comfortCeiling: resolved.comfortCeiling,
          // The haircut-adjusted income a lender would qualify, matching Affordability.
          qualIncome,
          debts: resolved.debts,
          funds: resolved.funds,
          save: resolved.save,
        }),
      ),
    [jurisdiction, resolved, qualIncome],
  );

  const rec = recommend(columns);
  const cashUnanswered = columns.every((c) => c.fundable === null);
  const cashFundable = columns.some((c) => c.fundable === true);

  const { isOpen, toggle, expanded, toggleAll } = useSections(
    SCENARIOS_SECTIONS,
    // Approval first: no deposit fixes an income problem, so when nothing
    // qualifies that is the finding. Then fundability. Then the comparison the
    // page exists for.
    rec.kind === "noneQualify" ? "approval" : rec.kind === "noneCash" ? "cash" : "monthly",
  );
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
    /*
     * The other three components of the bold total below, which the table stated
     * and then did not show. `monthly.total` is pi + propTax + insurance +
     * utilities + condoFee + maintenance; the table listed three of the six, so in
     * Toronto at $600,000 the visible rows summed to $3,386.67 under a "True
     * all-in monthly" of $3,811.67 — $425 of insurance and utilities unaccounted
     * for, plus the entire strata fee on a condo.
     *
     * Column-invariant, all three: the four scenarios differ only in down payment.
     * They are here anyway, because a total nobody can add up is not a total. Zero
     * rows are omitted on the same convention `buildLines` uses — a household with
     * no condo fee should not be shown one — and the arithmetic still reconciles,
     * because an omitted row is contributing nothing to the sum either.
     */
    ...(columns.some((c) => c.monthly.insurance > 0)
      ? [{ label: t("rInsurance"), value: (c: ScenarioResult) => fmt(c.monthly.insurance), mark: "estimate" as const }]
      : []),
    ...(columns.some((c) => c.monthly.utilities > 0)
      ? [{ label: t("rUtilities"), value: (c: ScenarioResult) => fmt(c.monthly.utilities), mark: "estimate" as const }]
      : []),
    ...(columns.some((c) => c.monthly.condoFee > 0)
      ? [{ label: t("rCondoFee"), value: (c: ScenarioResult) => fmt(c.monthly.condoFee) }]
      : []),
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
    /*
     * The denominators, printed. Both are column-invariant — the four scenarios
     * differ only in down payment — so they repeat across the row, which is
     * itself the finding: nothing you do to the down payment moves either of them.
     *
     * They are here because the two fields below write ONE key each while these
     * ratios are computed on seven, so the arithmetic and the inputs on screen
     * did not reconcile. Both figures are already on `resolved`; no engine change.
     */
    { label: t("rQualIncome"), value: () => fmt(qualIncome), mark: "estimate" },
    { label: t("rDebtsTotal"), value: () => fmt(resolved.debts) },
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

  /*
   * The minimum-down sentence, branched, and its tiers read off the rules table.
   *
   * It rendered unconditionally as "5% on the first $500,000 and 10% on the
   * portion above it", which is simply false at or above `cmhc.insuredCap`: no
   * insurer writes the loan there, so the minimum is the flat uninsured rate and
   * the marginal schedule does not apply at all. And the tier it named came from
   * a `const MIN_DOWN_TIER = 500000` in this file — a federal rule value living
   * in a page component, with nothing able to keep it in step with `minDown()`
   * three modules away. Both halves now come off `federal`.
   */
  const bands = federal.minDown.bands;
  // `tierCeiling === null` is not a defensive flourish: a one-band schedule is a
  // FLAT schedule, and the tiered sentence would then name a threshold that does
  // not exist. It falls through to the same branch the insured cap does.
  const tierCeiling = bands[0][0];
  const minDownLine =
    resolved.price >= federal.cmhc.insuredCap || tierCeiling === null || bands.length < 2
      ? t("minDownNoteFlat", {
          cap: fmt(federal.cmhc.insuredCap),
          p: pct(federal.minDown.uninsuredRate * 100),
          b: fmt(minDown(federal, resolved.price)),
        })
      : t("minDownNote", {
          lo: pct(bands[0][1] * 100),
          a: fmt(tierCeiling),
          hi: pct(bands[1][1] * 100),
          b: fmt(minDown(federal, resolved.price)),
        });

  const note = (title: string, body: string) => (
    <div className="border-b border-hairline py-3">
      <p className="text-[13px] font-semibold">{title}</p>
      <p className="mt-1 max-w-[620px] text-[12.5px] leading-[1.6] text-ink2 text-pretty">{body}</p>
    </div>
  );

  return (
    <ToolMain>
      {/*
        No published benchmark price here, and the reader has not given one: there is
        no price to model, so there is no answer to print. Every figure below derives
        from `resolved.price`, which is 0 in this state — arithmetic, not a price — and
        a screenful of $0 answers claims to know something we do not. The ask replaces
        the answer; the inputs stay exactly where they were, so it is answered here.
      */}
      {resolved.priceKnown ? (
        <>
          <PendingFigures pending={!hydrated}>
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
          </PendingFigures>

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
                  yoursPct={stored.dpPct}
                  caption={`${t("gMortgage")} · ${t("gMonthly")}`}
                />
                <p className="pt-3 text-[12px] leading-[1.6] text-ink3">{minDownLine}</p>
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
                  yoursPct={stored.dpPct}
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
                  yoursPct={stored.dpPct}
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
                  {/*
                    Placeholder added: this was the one field on the page with
                    none, so an empty box read as "no debts" while the TDS ratio
                    beside it was computed on four debt keys — three of which are
                    only reachable from /affordability. Typing here ADDS to those.
                  */}
                  <NumberField
                    id="otherDebt"
                    label={t("fDebts")}
                    value={stored.otherDebt}
                    placeholder={resolved.otherDebt}
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
                {/*
                  "the two totals at the top of the table above" is correct as it
                  stands, and a review read it as pointing at a collapsed section. It
                  does not: the note and the table it names are both in THIS section's
                  body, so the table is on screen exactly when the note is. The default
                  open section is `monthly` only when the reader qualifies, and either
                  way this note is unreadable until `approval` is opened, at which point
                  `rQualIncome` and `rDebtsTotal` are the first two rows above it.

                  What WAS wrong was "These two fields" over three of them. The third,
                  the comfort ceiling, is not one of the note's subjects and feeds no row
                  in this table — it drives `rVsCeiling` in the monthly one. The note now
                  names its two subjects instead of counting the grid.
                */}
                <NoteLine>{t("qualNote")}</NoteLine>
              </>,
            )}

            {section("lifetime", "none", t("gLifeNote"), fmt(headline.costOfBorrowing), t("lifetimeWhy"), (
              <>
                <CompareGrid
                  columns={columns}
                  rows={lifeRows}
                  recommendedPct={recommendedPct}
                  yoursPct={stored.dpPct}
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
            {/*
              "Show me how you got that."

              A LEDGER rather than a trace: this page's answer is not a sum, it is a
              choice between columns, and the thing a reader cannot see from four
              separate panels is which figures move TOGETHER. One row per scenario,
              every axis at once, with the recommended row marked.
            */}
            {section(
              "calc",
              "none",
              t("calcLine"),
              "",
              t("calcWhy"),
              <CalcLedger
                caption={t("calcLedgerCaption")}
                rowHeader="scenario"
                columns={[
                  { key: "scenario", label: t("cScenario") },
                  { key: "modelled", label: t("cModelled"), numeric: true },
                  { key: "down", label: t("cDown"), numeric: true },
                  { key: "premium", label: t("cPremium"), numeric: true },
                  { key: "mortgage", label: t("cMortgage"), numeric: true },
                  { key: "monthly", label: t("cMonthly"), numeric: true },
                  { key: "cash", label: t("cCash"), numeric: true },
                  { key: "gds", label: t("cGds"), numeric: true },
                  { key: "tds", label: t("cTds"), numeric: true },
                  { key: "lifetime", label: t("cLifetime"), numeric: true },
                ]}
                rows={columns.map((col) => ({
                  key: col.dpPct,
                  // The recommended column, not the reader's current one: this table
                  // exists to be compared down, and the row worth finding in it is the
                  // one the page is arguing for. `recommendedPct` is null when nothing
                  // is recommended — no column qualifies, or none is fundable — and no
                  // row is marked, which is the honest rendering of "we are not
                  // pointing at one of these".
                  highlight: recommendedPct !== null && col.dpPct === recommendedPct,
                  cells: {
                    // The REQUESTED percentage, matching `compare-grid.tsx`'s column
                    // headings. Labelling by the effective figure made two tables of the
                    // same four scenarios on one page unmatchable — and above the
                    // insured cap every column floors to 20%, so all four rows rendered
                    // as "20%", indistinguishable. The raise is disclosed in its own
                    // column instead, where it does not collide with the identity.
                    scenario: t("column", { p: pct(col.dpPct, 0) }),
                    modelled: col.belowMinimum ? pct(col.dpPctEff, 1) : "—",
                    down: fmt(col.down),
                    premium: fmt(col.premium),
                    mortgage: fmt(col.totalMortgage),
                    monthly: fmt(col.monthly.total),
                    cash: fmt(col.net),
                    // Already percentages out of `scenario()` (engine.ts:1547). The
                    // qualification panel forty lines up renders them the same way;
                    // scaling here printed 3,240.0% beside its own 32.4%.
                    gds: pct(col.gds, 1),
                    tds: pct(col.tds, 1),
                    lifetime: fmt(col.costOfBorrowing),
                  },
                }))}
              />,
            )}
          </div>
        </>
      ) : (
        <AnswerHead
          eyebrow={t("title")}
          head={tInputs("noPriceHead", { place: tJur(`at.${jurisdiction.id}`) })}
          sub={tInputs("noPriceSub")}
        />
      )}

      <section aria-labelledby="sc-inputs" className="mt-8 flex flex-col gap-3">
        <h2 id="sc-inputs" className="text-[13px] font-semibold">
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
            ftb={stored.ftb}
            elsewhere={stored.elsewhere}
            ftbEffective={resolved.ftb}
            ptypeEffective={resolved.ptype}
            residency={stored.residency}
            jurisdiction={jurisdiction}
            onChange={update}
          />
        </div>
      </section>

      <FigureFooter jurisdiction={jurisdiction} />
    </ToolMain>
  );
}
