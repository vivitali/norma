"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { amortization } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSections } from "@/hooks/use-sections";
import { useSharedState } from "@/hooks/use-shared-state";
import { TOOL_DEFAULTS, TOOL_KEYS } from "@/lib/shared-inputs";
import { isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
import { AMORTIZATION_SECTIONS } from "@/lib/sections";
import type { Tone } from "@/lib/tone";
import { useMoney, usePercent } from "@/lib/format";
import { cn } from "@/lib/utils";
import { PanelRow, SectionRow } from "@/components/affordability/section-row";
import { SegmentedGroup } from "@/components/affordability/segmented-group";
import { ScheduleChart } from "@/components/amortization/schedule-chart";
import { NumberField } from "@/components/number-field";
import { Provenance } from "@/components/provenance";
import { PurchaseInputs } from "@/components/purchase-inputs";
import { AnswerHead, FigureFooter, NoteLine, PendingFigures, SectionsHeader, ToolMain } from "@/components/tool-page";

const TERM_CHOICES = [1, 3, 5, 10] as const;

export default function AmortizationPage() {
  const t = useTranslations("Amortization");
  // The ask that replaces the answer where nobody publishes a price, and the
  // reader-facing name of the place that publishes none. `jurisdiction.city` is
  // the lowercase record key and renders "winnipeg"; the name lives here.
  const tInputs = useTranslations("Inputs");
  const tJur = useTranslations("Jurisdictions");
  const [jurisdiction] = useJurisdiction();
  const [stored, update, hydrated] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const { isOpen, toggle, expanded, toggleAll } = useSections(
    AMORTIZATION_SECTIONS,
    /*
     * Renewal, in every state — not `renewalRate === null ? "payment" : "renewal"`.
     *
     * `isSectionOpen`'s rule is "the section whose check produced the verdict".
     * On this page that is renewal and only renewal, whatever is stored: the
     * hero figure IS `paymentAfterRenewal`, the head is `shockUp`/`shockDown`/
     * `shockNone` and the second head stat is the shock itself. The old
     * condition opened `payment` on every first visit — the one state where the
     * sub-line tells the reader in so many words to "move the renewal rate above
     * your current one", with the control that does it, and with `riskTitle`/
     * `riskBody` (the product's only explanation that a Canadian TERM is not the
     * amortization) sitting behind a closed caret.
     *
     * The payment panel loses nothing by closing: `rPayNow` and `rInterest` are
     * already head stats, so its two headline figures are on screen either way.
     */
    "renewal",
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
      contractRate: resolved.contractRate,
      renewalRate: resolved.renewalRate,
      termYears: resolved.termYears,
    }),
    [resolved],
  );

  const result = useMemo(() => amortization(federal, input), [input]);
  /**
   * The same loan renewed at today's rate. Without it "extra interest" has no
   * referent — the reader would be comparing a renewal scenario against nothing.
   */
  const baseline = useMemo(
    () => amortization(federal, { ...input, renewalRate: null }),
    [input],
  );
  const extraInterest = result.totalInterest - baseline.totalInterest;

  const firstRenewal = result.rows.find((row) => row.renewed)?.t ?? null;
  /** Where principal first outruns interest — the moment the chart names and the table did not. */
  const flipYear = result.rows.find((row) => row.principal > row.interest)?.t ?? null;
  const shock = result.shock;
  const rising = shock > 0.5;
  const falling = shock < -0.5;

  const head = rising
    ? t("shockUp", { amt: fmt(shock) })
    : falling
      ? t("shockDown", { amt: fmt(-shock) })
      : t("shockNone");
  const sub = rising
    ? t("shockUpSub", { n: firstRenewal ?? 0, extra: fmt(extraInterest) })
    : falling
      ? t("shockDownSub")
      : t("shockNoneSub", { n: firstRenewal ?? 0 });

  const presets = [
    { key: "presetToday", value: null },
    { key: "presetFloor", value: federal.stressTest.floor },
    { key: "presetPlus2", value: Math.round((resolved.contractRate + 2) * 100) / 100 },
    { key: "presetPlus4", value: Math.round((resolved.contractRate + 4) * 100) / 100 },
  ] as const;

  const section = (id: string, tone: Tone, line: string, figure: string, why: string, body: ReactNode) => {
    const def = AMORTIZATION_SECTIONS.find((entry) => entry.id === id)!;
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
          {/*
            One mechanism for "the stored inputs have not landed yet", shared by
            every tool page — see `PendingFigures` in tool-page.tsx. It keeps the
            prerendered answer in the HTML and the hero's box on the page, which is
            what the four hand-rolled variants this replaces could not all do.
          */}
          <PendingFigures pending={!hydrated}>
          <AnswerHead
            eyebrow={t("title")}
            figure={fmt(result.paymentAfterRenewal)}
            pulseKey={jurisdiction.id}
            head={head}
            sub={sub}
            tag={isPersonalised(stored) ? t("tagYours") : t("tagTypical")}
            stats={[
              { label: t("rPayNow"), value: fmt(result.firstPayment), mark: "rule" },
              {
                label: t("rChange"),
                // money() puts the sign outside the symbol already; doing it again here
                // is how one screen ends up disagreeing with another about "− $340".
                value: fmt(shock),
                note: rising ? t("shockUpTag") : falling ? t("shockDownTag") : t("shockNoneTag"),
              },
              { label: t("rInterest"), value: fmt(result.totalInterest), mark: "rule" },
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
              "payment",
              "none",
              t("setupLine", {
                mort: fmt(result.fin.loan),
                rate: pct(resolved.contractRate, 2),
                ren: resolved.renewalRate === null ? pct(resolved.contractRate, 2) : pct(resolved.renewalRate, 2),
              }),
              fmt(result.firstPayment),
              t("paymentWhy"),
              <>
                <PanelRow label={t("mortgageAmount")} value={fmt(result.fin.loan)} strong />
                {result.fin.premium > 0 ? (
                  <PanelRow
                    label={t("premium")}
                    value={fmt(result.fin.premium)}
                    provenance={<Provenance kind="rule" />}
                  />
                ) : null}
                <PanelRow
                  label={t("contractNow")}
                  value={pct(resolved.contractRate, 2)}
                  provenance={<Provenance kind="rule" />}
                />
                <PanelRow label={t("rPayNow")} value={fmt(result.firstPayment)} strong />
                <PanelRow label={t("payoffLabel")} value={t("payoffYear", { n: result.payoffYear })} />
                {/*
                  Directly under "Paid off in year 30", because that row is where
                  the misreading is made: a newcomer reads a 30-year payoff beside
                  a single rate and concludes the rate is theirs for 30 years. The
                  term and the amortization are both the reader's own inputs, so
                  this states no figure the app invented — and the link is an
                  in-page jump, not a CrossLink: it goes to this page's own
                  `renewal` section, which `useHashTarget` then opens and focuses.
                */}
                <NoteLine>
                  {t.rich("termNote", {
                    term: result.term,
                    amort: resolved.amortYears,
                    jump: (chunks) => (
                      <a href="#renewal" className="text-ac underline underline-offset-2">
                        {chunks}
                      </a>
                    ),
                  })}
                </NoteLine>
              </>,
            )}

            {section(
              "renewal",
              rising ? "blocked" : falling ? "pass" : "caution",
              rising ? t("shockUpTag") : falling ? t("shockDownTag") : t("shockNoneTag"),
              fmt(shock),
              t("renewalWhy"),
              <>
                <p className="mb-3 max-w-[620px] text-[13px] leading-[1.65] font-medium text-pretty">
                  {t("riskTitle")}
                </p>
                <p className="mb-4 max-w-[620px] text-[13px] leading-[1.65] text-ink2 text-pretty">
                  {t("riskBody")}
                </p>
                <PanelRow label={t("termLabel")} value={t("yearsWord", { n: result.term })} />
                <PanelRow label={t("rPayNow")} value={fmt(result.firstPayment)} />
                <PanelRow label={t("rPayAfter")} value={fmt(result.paymentAfterRenewal)} strong />
                <PanelRow
                  label={t("rAnnual")}
                  value={fmt(result.paymentAfterRenewal * 12)}
                />
                <PanelRow label={t("rExtra")} value={fmt(extraInterest)} strong />
                {resolved.renewalRate === null ? (
                  <p className="pt-2 text-[12.5px] text-ink3">{t("noRenewalSet")}</p>
                ) : null}

                <div className="mt-4 flex max-w-[520px] flex-col gap-3">
                  <div className="flex flex-wrap gap-2">
                    {presets.map((preset) => (
                      <button
                        key={preset.key}
                        type="button"
                        onClick={() => update({ renewalRate: preset.value })}
                        aria-pressed={stored.renewalRate === preset.value}
                        className={
                          stored.renewalRate === preset.value
                            ? "rounded-full border border-acbr bg-acbg px-3.5 py-1.5 text-[12.5px] font-medium text-ac"
                            : "rounded-full border border-border px-3.5 py-1.5 text-[12.5px] text-ink2 hover:border-acbr hover:text-ac"
                        }
                      >
                        {t(preset.key)}
                      </button>
                    ))}
                  </div>
                  <NumberField
                    id="renewalRate"
                    label={t("renewalControl")}
                    value={stored.renewalRate}
                    placeholder={resolved.contractRate}
                    min={0}
                    max={30}
                    onCommit={(renewalRate) => update({ renewalRate })}
                  />
                  <SegmentedGroup
                    label={t("termYears")}
                    value={stored.termYears}
                    onChange={(termYears) => update({ termYears })}
                    options={TERM_CHOICES.map((v) => ({ value: v, label: t("yearsWord", { n: v }) }))}
                  />
                </div>
              </>,
            )}

            {section(
              "interest",
              "none",
              // The figure is interest PLUS premium, so a line reading "Total
              // interest over the loan" labelled it as something it is not. Name
              // the two parts when there are two; otherwise say what the loan costs
              // in total, which the figure alone does not.
              result.fin.premium > 0
                ? `${t("rInterest")} ${fmt(result.totalInterest)} · ${t("premium")} ${fmt(result.fin.premium)}`
                : `${t("totalPaid")} ${fmt(result.totalPaid)}`,
              fmt(result.totalInterest + result.fin.premium),
              t("interestWhy"),
              <>
                <PanelRow label={t("rInterest")} value={fmt(result.totalInterest)} />
                {result.fin.premium > 0 ? (
                  <PanelRow label={t("premium")} value={fmt(result.fin.premium)} />
                ) : null}
                <PanelRow
                  label={t("costOfBorrowing")}
                  value={fmt(result.totalInterest + result.fin.premium)}
                  strong
                />
                <PanelRow label={t("totalPaid")} value={fmt(result.totalPaid)} />
                <PanelRow label={t("rExtra")} value={fmt(extraInterest)} />
              </>,
            )}

            {/*
              `tableTitle` and this section's name are the same three words, so the
              row printed "Year by year · Year by year". The schedule's one finding
              the reader cannot get from the collapsed row is where it ends.
            */}
            {section("schedule", "none", t("payoffYear", { n: result.payoffYear }), "", t("scheduleWhy"), (
              <>
                <ScheduleChart result={result} />
                <div
                  // min-w-0 is load-bearing: this is a flex item, and `min-width: auto` is
                  // the flex default, so without it the container refuses to shrink below
                  // the 560px table and overflow-x-auto never engages — the PAGE scrolls
                  // sideways instead of the table. Only visible with the section open, which
                  // is why it survived a sweep that measured closed pages.
                  className="relative min-w-0 overflow-x-auto"
                >
                  <table className="w-full min-w-[560px] border-collapse text-[12.5px]">
                    <caption className="sr-only">{t("tableTitle")}</caption>
                    <thead>
                      <tr className="border-b border-border text-ink3">
                        <th scope="col" className="py-1.5 pr-3 text-left font-medium">{t("yr")}</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t("cRate")}</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t("cPayment")}</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t("cInterest")}</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t("cPrincipal")}</th>
                        <th scope="col" className="py-1.5 text-right font-medium">{t("cBalance")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.rows.map((row) => {
                        // The year principal first exceeds interest. The chart calls
                        // it out and the table did not, so the one row worth finding
                        // in thirty looked like the other twenty-nine.
                        const crossover = row.t === flipYear;
                        return (
                          <tr
                            key={row.t}
                            className={
                              crossover
                                ? "border-b border-acbr bg-acbg"
                                : "border-b border-hairline"
                            }
                          >
                            <th
                              scope="row"
                              className={cn(
                                "py-1.5 pr-3 text-left",
                                crossover ? "font-semibold text-ac" : "font-normal text-ink2",
                              )}
                            >
                              {row.t}
                              {row.renewed ? (
                                <span className="ml-1.5 text-[10.5px] font-normal text-caution">
                                  {t("termMark")}
                                </span>
                              ) : null}
                              {crossover ? (
                                <span className="ml-1.5 text-[10.5px] font-normal text-ac">
                                  {t("flipLabel")}
                                </span>
                              ) : null}
                            </th>
                            {/* Right-aligned and tabular: read down a column, digits aligned. */}
                            <td className="py-1.5 pr-3 text-right tabular-nums">{pct(row.rate, 2)}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(row.payment)}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(row.interest)}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(row.principal)}</td>
                            <td className="py-1.5 text-right tabular-nums">{fmt(row.closing)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
            ))}
          </div>
        </>
      ) : (
        <AnswerHead
          eyebrow={t("title")}
          head={tInputs("noPriceHead", { place: tJur(`at.${jurisdiction.id}`) })}
          sub={tInputs("noPriceSub")}
        />
      )}

      <section aria-labelledby="am-inputs" className="mt-8 flex flex-col gap-3">
        <h2 id="am-inputs" className="text-[13px] font-semibold">
          {t("adjust")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {/*
            No `residency` here, and that is the rule the prop's own doc states rather
            than an omission of it: this page shows no closing bill. Nothing it computes
            — loan, premium, payment, renewal shock — reads `residency`, so the switch
            would ask a question no figure on the screen could answer. The four pages
            that price the purchase bind it.
          */}
          <PurchaseInputs
            price={stored.price}
            pricePlaceholder={resolved.priceKnown ? resolved.price : null}
            dpPct={stored.dpPct}
            dpPctEffective={resolved.dpPct}
            belowMinimum={resolved.belowMinimum}
            amortYears={stored.amortYears}
            ftbEffective={resolved.ftb}
            ptypeEffective={resolved.ptype}
            jurisdiction={jurisdiction}
            onChange={update}
          />
        </div>
      </section>

      <FigureFooter jurisdiction={jurisdiction} />
    </ToolMain>
  );
}
