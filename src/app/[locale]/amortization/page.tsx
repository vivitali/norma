"use client";

import { useMemo, useState, type MouseEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { amortization, rowAt } from "@/domain/engine";
import { CalcTrace } from "@/components/calc/calc-trace";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useRules } from "@/hooks/use-country";
import { useSections } from "@/hooks/use-sections";
import { useSharedState } from "@/hooks/use-shared-state";
import { TOOL_DEFAULTS, TOOL_KEYS } from "@/lib/shared-inputs";
import { isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
import { AMORTIZATION_SECTIONS } from "@/lib/sections";
import type { Tone } from "@/lib/tone";
import { useDecimal, useMoney, usePercent } from "@/lib/format";
import { countryKey } from "@/lib/country-key";
import { cn } from "@/lib/utils";
import { PanelRow, SectionRow } from "@/components/affordability/section-row";
import { SegmentedGroup } from "@/components/affordability/segmented-group";
import { ScheduleChart } from "@/components/amortization/schedule-chart";
import { NumberField } from "@/components/number-field";
import { Provenance } from "@/components/provenance";
import { PurchaseInputs } from "@/components/purchase-inputs";
import { AnswerHead, FigureFooter, NoteLine, PendingFigures, SectionsHeader, ToolMain } from "@/components/tool-page";

/**
 * Edge shadows for a horizontally scrolling table: each paints only on the side that has more to
 * scroll to (`local` covers it once the edge is reached, `scroll` stays put), so a table that fits
 * shows none. Colours come from the theme tokens.
 */
const SCROLL_SHADOWS = {
  background:
    "linear-gradient(to right, var(--paper) 30%, transparent) left center / 24px 100% no-repeat local, linear-gradient(to left, var(--paper) 30%, transparent) right center / 24px 100% no-repeat local, linear-gradient(to right, color-mix(in oklab, var(--ink3) 45%, transparent), transparent) left center / 10px 100% no-repeat scroll, linear-gradient(to left, color-mix(in oklab, var(--ink3) 45%, transparent), transparent) right center / 10px 100% no-repeat scroll",
} as const;

export default function AmortizationPage() {
  const t = useTranslations("Amortization");
  // The ask that replaces the answer where nobody publishes a price, and the
  // reader-facing name of the place that publishes none. `jurisdiction.city` is
  // the lowercase record key and renders "winnipeg"; the name lives here.
  const tInputs = useTranslations("Inputs");
  const tJur = useTranslations("Jurisdictions");
  const [jurisdiction] = useJurisdiction();
  const rules = useRules();
  const [stored, update, hydrated] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const { isOpen, toggle, expanded, toggleAll } = useSections(
    AMORTIZATION_SECTIONS,
    /*
     * Nothing opens on a first visit: the answer head and its three stats carry the verdict, and a
     * reader who has given nothing must not land on an open derivation of figures they never
     * entered. Once the reader has personalised the page — or chosen a renewal rate, which is the
     * one question this page asks — the section whose check produced the verdict opens.
     *
     * That section is renewal, in every state: the hero figure IS `paymentAfterRenewal`, the head
     * is `shockUp`/`shockDown`/`shockNone` and the second head stat is the shock itself.
     * `rules.mortgage.renews` guards it: a US fixed loan has no renewal section to open at all, so
     * `payment` — which carries the same `rPayNow`/`rInterest` figures — opens instead.
     */
    isPersonalised(stored) || stored.renewalRate !== null
      ? rules.mortgage.renews
        ? "renewal"
        : "payment"
      : null,
  );
  const fmt = useMoney();
  const pct = usePercent();
  const dec = useDecimal();
  // Which renewal scenario is CHOSEN, as against which rate is stored: "Custom" is a mode the
  // reader enters, and it must hold while the field is still empty.
  const [customRate, setCustomRate] = useState(false);

  const resolved = useMemo(
    () => resolveInputs(stored, jurisdiction, rules),
    [stored, jurisdiction, rules],
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

  const result = useMemo(() => amortization(rules, input), [rules, input]);
  /**
   * The same loan renewed at today's rate. Without it "extra interest" has no
   * referent — the reader would be comparing a renewal scenario against nothing.
   */
  const baseline = useMemo(
    () => amortization(rules, { ...input, renewalRate: null }),
    [rules, input],
  );
  const extraInterest = result.totalInterest - baseline.totalInterest;

  const hasPmi = result.rows.some((r) => (r.insurance ?? 0) > 0);
  const firstRenewal = result.rows.find((row) => row.renewed)?.t ?? null;
  /** Where principal first outruns interest — the moment the chart names and the table did not. */
  const flipYear = result.rows.find((row) => row.principal > row.interest)?.t ?? null;
  const shock = result.shock;
  const rising = shock > 0.5;
  const falling = shock < -0.5;

  /**
   * `rules.mortgage.renews` — never `rules.country` — is what a page branches on
   * (CLAUDE.md, "Pages branch on rules, not on country strings"). A US 30-year
   * fixed has no term and no renewal: `shock` is always 0 and `firstRenewal` is
   * always null on that branch (see `amortizationToMaturity`'s own doc comment),
   * so the CA shock sentence would render "no shock" while still implying a
   * renewal that cannot happen. One honest sentence replaces it instead.
   */
  /**
   * The hero's "try a higher renewal rate" lands ON the control, not on a section header: open the
   * renewal panel if it is shut, then put focus on the chosen scenario, which is the first thing in
   * it. A plain `#renewal` hash opens the panel and focuses its header button, one tab stop short.
   */
  const jumpToRenewal = (event: MouseEvent) => {
    event.preventDefault();
    if (!isOpen("renewal")) toggle("renewal");
    window.setTimeout(() => {
      const panel = document.getElementById("renewal");
      if (!panel) return;
      panel.scrollIntoView({ block: "start", behavior: "smooth" });
      panel
        .querySelector<HTMLElement>("[role=radio][aria-checked=true]")
        ?.focus({ preventScroll: true });
    }, 60);
  };
  // The figures rest on the typical price for this place until the reader gives one, so the tag
  // says so and jumps to the field that replaces it.
  const assumedPrice = !(stored.price !== null && stored.price > 0);
  const focusPrice = () => {
    const el = document.getElementById("price");
    if (!el) return;
    el.scrollIntoView({ block: "center", behavior: "smooth" });
    el.focus({ preventScroll: true });
  };

  const head = !rules.mortgage.renews
    ? t("usFixedHead", { rate: pct(resolved.contractRate, 2) })
    : rising
      ? t("shockUp", { amt: fmt(shock) })
      : falling
        ? t("shockDown", { amt: fmt(-shock) })
        : t("shockNone");
  const sub = !rules.mortgage.renews
    ? t("usFixedSub")
    : rising
      ? t("shockUpSub", { n: firstRenewal ?? 0, extra: fmt(extraInterest) })
      : falling
        ? t("shockDownSub")
        : t.rich("shockNoneSub", {
            n: firstRenewal ?? 0,
            jump: (chunks) => (
              <a href="#renewal" onClick={jumpToRenewal} className="text-ac underline underline-offset-2">
                {chunks}
              </a>
            ),
          });

  // Presets feed the renewal-rate control, which only exists where a mortgage
  // renews — `rules.stressTest` is null on the US branch, so this whole table
  // would read a null floor. Never referenced when `!rules.mortgage.renews`, but
  // typed as possibly-empty here rather than asserted, so a future call site
  // cannot read it unguarded.
  const presets =
    rules.mortgage.renews && rules.stressTest
      ? ([
          { key: "presetToday", value: null },
          { key: "presetFloor", value: rules.stressTest.floor },
          { key: "presetPlus2", value: Math.round((resolved.contractRate + 2) * 100) / 100 },
          { key: "presetPlus4", value: Math.round((resolved.contractRate + 4) * 100) / 100 },
        ] as const)
      : ([] as const);

  /**
   * Which scenario the radiogroup shows as chosen. "Custom" is entered by choosing it, and it is
   * also what a stored rate that matches no preset IS — a rate typed earlier, or carried from a
   * link — so the control never shows nothing selected.
   */
  const matchedPreset = presets.find((preset) => preset.value === stored.renewalRate)?.key;
  const renewalChoice: string = customRate ? "presetCustom" : (matchedPreset ?? "presetCustom");

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
            eyebrow={t(countryKey("title", rules.country))}
            figure={fmt(result.paymentAfterRenewal)}
            pulseKey={jurisdiction.id}
            head={head}
            sub={sub}
            tag={
              assumedPrice
                ? t("tagAssumed", { place: tJur(`at.${jurisdiction.id}`), price: fmt(resolved.price) })
                : t("tagGiven", { price: fmt(resolved.price) })
            }
            onTagActivate={assumedPrice ? focusPrice : undefined}
            adjust
            stats={
              rules.mortgage.renews
                ? [
                    { label: t("rPayNow"), value: fmt(result.firstPayment), mark: "rule" },
                    {
                      label: t("rChange"),
                      // money() puts the sign outside the symbol already; doing it again here
                      // is how one screen ends up disagreeing with another about "− $340".
                      value: fmt(shock),
                      note: rising ? t("shockUpTag") : falling ? t("shockDownTag") : t("shockNoneTag"),
                      // The same colour as the renewal row that owns this figure.
                      tone: rising ? ("blocked" as const) : undefined,
                    },
                    { label: t("rInterest"), value: fmt(result.totalInterest), mark: "rule" },
                  ]
                : [
                    // No renewal, no shock to name — the second stat instead says the
                    // one fact that replaces it: the rate that holds for the whole loan.
                    { label: t("rPayNow_us"), value: fmt(result.firstPayment), mark: "rule" },
                    { label: t("cRate"), value: pct(resolved.contractRate, 2), note: t("usFixedTag") },
                    { label: t("rInterest"), value: fmt(result.totalInterest), mark: "rule" },
                  ]
            }
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
              rules.mortgage.renews
                ? t("setupLine", {
                    mort: fmt(result.fin.loan),
                    rate: pct(resolved.contractRate, 2),
                    ren: resolved.renewalRate === null ? pct(resolved.contractRate, 2) : pct(resolved.renewalRate, 2),
                  })
                : t("setupLine_us", { mort: fmt(result.fin.loan), rate: pct(resolved.contractRate, 2) }),
              fmt(result.firstPayment),
              t(countryKey("paymentWhy", rules.country)),
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
                {/*
                  PMI — billed monthly, unlike CMHC's one-time financed premium above
                  (which is why this is a second row rather than folded into it) — and
                  silent once `result.fin.monthlyInsurance` is 0, exactly as the premium
                  row above is silent on every US call.
                */}
                {result.fin.monthlyInsurance > 0 ? (
                  <PanelRow
                    label={t("pmiMonthly")}
                    value={fmt(result.fin.monthlyInsurance)}
                    provenance={<Provenance kind="rule" />}
                  />
                ) : null}
                {/*
                  Metadata.amortization.description_us promises "what PMI
                  cancellation is worth" — the schedule and the chart imply it
                  through the PMI column dropping to zero, but name it nowhere.
                  `result.fin.insuranceMonths` is non-null whenever
                  `monthlyInsurance > 0` (financing()'s own invariant), so this
                  reads off the SAME two fields the row above does rather than
                  re-deriving anything.
                */}
                {result.fin.monthlyInsurance > 0 && result.fin.insuranceMonths !== null ? (
                  <NoteLine>
                    {t("pmiCancelYear", {
                      n: Math.ceil(result.fin.insuranceMonths / 12),
                      amt: fmt(result.fin.monthlyInsurance),
                    })}
                  </NoteLine>
                ) : null}
                <PanelRow label={t(countryKey("rPayNow", rules.country))} value={fmt(result.firstPayment)} strong />
                <PanelRow label={t("payoffLabel")} value={t("payoffYear", { n: result.payoffYear })} />
                {/*
                  A US 30-year fixed holds its rate to maturity — there is no term to
                  distinguish from the amortization, so `termNote`'s "priced today / the
                  rest is repriced at every renewal" split, and its jump to the (absent)
                  #renewal section, would name a mechanism this mortgage does not have.
                */}
                {!rules.mortgage.renews ? (
                  <NoteLine>{t("holdsToMaturity")}</NoteLine>
                ) : null}
                {/*
                  Directly under "Paid off in year 30", because that row is where
                  the misreading is made: a newcomer reads a 30-year payoff beside
                  a single rate and concludes the rate is theirs for 30 years. The
                  term and the amortization are both the reader's own inputs, so
                  this states no figure the app invented — and the link is an
                  in-page jump, not a CrossLink: it goes to this page's own
                  `renewal` section, which `useHashTarget` then opens and focuses.
                  CA only — see `holdsToMaturity` above for the US's own version of
                  this fact, which needs no jump because there is no renewal section.
                */}
                {rules.mortgage.renews ? (
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
                ) : null}
              </>,
            )}

            {/*
              A US 30-year fixed has no term and no renewal (`rules.mortgage.renews`
              is false) — this whole section, its shock verdict, its term/renewal-rate
              controls, all name a mechanism that mortgage does not have, so it does
              not render at all rather than showing a permanent "no change" verdict.
              `holdsToMaturity` above (in the payment section) carries the one honest
              sentence in its place.
            */}
            {rules.mortgage.renews &&
              section(
              "renewal",
              // No shock is not a warning: "No change" in the caution colour called a fine
              // outcome a risk. Only a rise wears a state colour, and only a fall passes.
              rising ? "blocked" : falling ? "pass" : "none",
              rising ? t("shockUpTag") : falling ? t("shockDownTag") : t("shockNoneTag"),
              fmt(shock),
              t("renewalWhy"),
              <>
                {/*
                  The controls come FIRST. They used to sit after seven result rows and a
                  ninety-word paragraph, so the reader who opened this panel to try a rate read
                  a screen of consequences of a rate they had not chosen yet. One radiogroup
                  for the scenario, the rate field only when "Custom" is chosen, then the term.
                */}
                <div className="flex max-w-[520px] flex-col gap-3 pb-4">
                  <SegmentedGroup
                    label={t("renewalControl")}
                    value={renewalChoice}
                    onChange={(next) => {
                      setCustomRate(next === "presetCustom");
                      const preset = presets.find((entry) => entry.key === next);
                      if (preset) update({ renewalRate: preset.value });
                    }}
                    options={[
                      ...presets.map((preset) => ({ value: preset.key as string, label: t(preset.key) })),
                      { value: "presetCustom", label: t("presetCustom") },
                    ]}
                  />
                  {renewalChoice === "presetCustom" ? (
                    <NumberField
                      id="renewalRate"
                      label={t("renewalCustom")}
                      value={stored.renewalRate}
                      placeholder={resolved.contractRate}
                      min={0}
                      max={30}
                      dp={2}
                      onCommit={(renewalRate) => update({ renewalRate })}
                    />
                  ) : null}
                  <SegmentedGroup
                    label={t("termYears")}
                    value={stored.termYears}
                    onChange={(termYears) => update({ termYears })}
                    options={(rules.mortgage.kind === "term" ? rules.mortgage.termYears : []).map(
                      (v) => ({ value: v, label: t("yearsWord", { n: v }) }),
                    )}
                  />
                </div>
                <PanelRow label={t("termLabel")} value={t("yearsWord", { n: result.term })} />
                <PanelRow label={t("rPayNow")} value={fmt(result.firstPayment)} />
                <PanelRow label={t("rPayAfter")} value={fmt(result.paymentAfterRenewal)} strong />
                {/* "At the higher payment" is only true when the payment is higher. */}
                {rising ? (
                  <PanelRow
                    label={t("rAnnual")}
                    value={fmt(result.paymentAfterRenewal * 12)}
                  />
                ) : null}
                {/* Extra interest is measured against renewing at today's rate: no renewal rate
                    that differs from it, no comparison to make. */}
                {rising || falling ? (
                  <PanelRow label={t("rExtra")} value={fmt(extraInterest)} strong />
                ) : null}
                {resolved.renewalRate === null ? (
                  <p className="pt-2 text-[12.5px] text-ink3">{t("noRenewalSet")}</p>
                ) : null}
                <p className="mt-4 mb-1 max-w-[620px] text-[13px] leading-[1.65] font-medium text-pretty">
                  {t("riskTitle")}
                </p>
                <p className="max-w-[620px] text-[13px] leading-[1.65] text-ink2 text-pretty">
                  {t("riskBody")}
                </p>
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
                {/*
                  A US 30-year fixed never renews, so `extraInterest` is always exactly 0
                  here (the baseline it is measured against ignores `renewalRate`, which
                  `amortizationToMaturity` never reads at all) — a true but meaningless
                  zero next to a label that names a mechanism this mortgage does not have.
                */}
                {rules.mortgage.renews ? (
                  <PanelRow label={t("rExtra")} value={fmt(extraInterest)} />
                ) : null}
              </>,
            )}

            {/*
              `tableTitle` and this section's name are the same three words, so the
              row printed "Year by year · Year by year". The schedule's one finding
              the reader cannot get from the collapsed row is where it ends.
            */}
            {section("schedule", "none", t("payoffYear", { n: result.payoffYear }), "", t(countryKey("scheduleWhy", rules.country)), (
              <>
                <ScheduleChart result={result} />
                {/*
                  min-w-0 is load-bearing: this is a flex item, and `min-width: auto` is the flex
                  default, so without it the container refuses to shrink below the table's width
                  and overflow-x-auto never engages — the PAGE scrolls sideways instead of the
                  table. Only visible with the section open, which is why it survived a sweep that
                  measured closed pages.

                  A keyboard-reachable scroll region (tabIndex, role, name), and the edge shadows
                  are the classic background-attachment trick: they paint only on a side that has
                  more to scroll to, so nothing is drawn where the table already fits.
                */}
                <div
                  role="region"
                  tabIndex={0}
                  aria-label={t("tableTitle")}
                  className="relative min-w-0 overflow-x-auto"
                  style={SCROLL_SHADOWS}
                >
                  <table className="w-full border-collapse text-[12.5px]">
                    <caption className="sr-only">{t("tableTitle")}</caption>
                    <thead>
                      <tr className="border-b border-border text-ink3">
                        <th scope="col" className="py-1.5 pr-3 text-left font-medium">{t("yr")}</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t("cBalance")}</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t("cInterest")}</th>
                        <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t("cPrincipal")}</th>
                        {/*
                          PMI, only while it applies — absent for every Canadian row
                          (`row.insurance` is undefined there; CMHC's premium is the
                          one-time row above, not a recurring column) and absent past
                          the month it auto-terminates on a US row, so a column that
                          would be $0 for the whole loan's remaining life is not shown
                          at all rather than as a wall of zeroes.
                        */}
                        {hasPmi ? (
                          <th scope="col" className="py-1.5 pr-3 text-right font-medium">{t("cPmi")}</th>
                        ) : null}
                        {/*
                          Rate and payment are constant for years at a time, and on a phone they
                          pushed the three columns that CHANGE (interest, principal, balance) off
                          the edge. They read off the sections above; from sm up they return.
                        */}
                        <th scope="col" className="hidden py-1.5 pr-3 text-right font-medium sm:table-cell">{t("cRate")}</th>
                        <th scope="col" className="hidden py-1.5 text-right font-medium sm:table-cell">{t("cPayment")}</th>
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
                                <span className="ml-1.5 text-[11.5px] font-normal text-ink3">
                                  {t("termMark")}
                                </span>
                              ) : null}
                              {crossover ? (
                                <span className="ml-1.5 text-[11.5px] font-normal text-ac">
                                  {t("flipLabel")}
                                </span>
                              ) : null}
                            </th>
                            {/* Right-aligned and tabular: read down a column, digits aligned. */}
                            <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(row.closing)}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(row.interest)}</td>
                            <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(row.principal)}</td>
                            {hasPmi ? (
                              <td className="py-1.5 pr-3 text-right tabular-nums">{fmt(row.insurance ?? 0)}</td>
                            ) : null}
                            <td className="hidden py-1.5 pr-3 text-right tabular-nums sm:table-cell">{pct(row.rate, 2)}</td>
                            <td className="hidden py-1.5 text-right tabular-nums sm:table-cell">{fmt(row.payment)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {/* What the phone layout leaves out, said once instead of on 30 rows. */}
                <p className="mt-2 max-w-[560px] text-[11.5px] leading-[1.5] text-ink3 sm:hidden">
                  {t(countryKey("tablePhoneNote", rules.country), {
                    pay: fmt(result.firstPayment),
                    rate: pct(resolved.contractRate, 2),
                  })}
                </p>
              </>
            ))}
            {/*
              "Show me how you got that."

              A TRACE only, deliberately: the schedule section directly above already
              renders every year of the loan, and a second table of the same rows
              would be duplication wearing a new label. What was missing was the step
              BEFORE the schedule — how a price and a percentage become the payment
              the whole page is about, insurance premium included.
            */}
            {section(
              "calc",
              "none",
              t("calcLine"),
              "",
              t("calcWhy"),
              <CalcTrace
                caption={t("calcTraceCaption")}
                lines={[
                  { label: t("calcPrice"), value: fmt(resolved.price) },
                  { label: t("calcDown"), value: fmt(result.fin.down), op: "minus", note: pct(resolved.dpPct, 2) },
                  { label: t("calcBaseLoan"), value: fmt(result.fin.baseLoan), op: "equals", strong: true },
                  // Absent when 20% or more is down, or the price is above the
                  // insurable cap: there is no premium to show, and a $0 row reads as
                  // a charge the reader is carrying.
                  ...(result.fin.premium > 0
                    ? [{ label: t("premium"), value: fmt(result.fin.premium), op: "plus" as const }]
                    : []),
                  { label: t("calcLoan"), value: fmt(result.fin.loan), op: "equals", rule: true, strong: true },
                  // Mortgage × payment factor = payment. The factor is what rate and amortization
                  // turn into, read off the SAME result the hero uses (payment ÷ mortgage) rather
                  // than recomputed here, so this line cannot disagree with the figure it explains.
                  // It replaces "Rate × Amortization years", which did not multiply out to the
                  // payment ($408,339 × 3.94% × 30 is not $1,928). `firstPayment` and `fin.loan`
                  // are always defined, unlike `rows[0]`, which is empty when the loan is zero.
                  {
                    label: t(countryKey("calcFactor", rules.country), {
                      rate: pct(resolved.contractRate, 2),
                      n: resolved.amortYears,
                    }),
                    value: dec(result.fin.loan > 0 ? result.firstPayment / result.fin.loan : 0, 6),
                    op: "times",
                    rule: true,
                  },
                  { label: t("cPayment"), value: fmt(result.firstPayment), op: "equals", strong: true },
                  // The trace has to end where the PAGE ends. This screen's hero is the
                  // payment after renewal, not the first payment, and a derivation that
                  // stopped one step short left the figure at the top unexplained —
                  // the one thing the section exists to prevent. With no renewal rate
                  // given the two are the same number and the block is absent, because
                  // a second identical row would assert a step that never happened.
                  // `resolved.renewalRate`, not `firstRenewal`: the engine re-prices at
                  // every term boundary whether or not a rate was given — with none it
                  // renews at the contract rate — so `rows.find(r => r.renewed)` is
                  // non-null in both states and would have rendered a "renewal" that
                  // changed nothing. The reader's own choice is the condition.
                  ...(resolved.renewalRate !== null && firstRenewal !== null
                    ? [
                        {
                          label: t("calcBalanceAtRenewal"),
                          value: fmt(rowAt(result.rows, firstRenewal).opening),
                          rule: true,
                        },
                        {
                          // Same construction as the first payment: balance × factor. Read off
                          // the renewed payment and the balance it applies to.
                          label: t("calcFactorRenewal", {
                            rate: pct(resolved.renewalRate ?? resolved.contractRate, 2),
                            n: resolved.amortYears - (firstRenewal - 1),
                          }),
                          value: dec(
                            rowAt(result.rows, firstRenewal).opening > 0
                              ? result.paymentAfterRenewal / rowAt(result.rows, firstRenewal).opening
                              : 0,
                            6,
                          ),
                          op: "times" as const,
                        },
                        {
                          label: t("rPayAfter"),
                          value: fmt(result.paymentAfterRenewal),
                          op: "equals" as const,
                          strong: true,
                        },
                      ]
                    : []),
                ]}
              />,
            )}
          </div>
        </>
      ) : (
        <AnswerHead
          eyebrow={t(countryKey("title", rules.country))}
          head={tInputs("noPriceHead", { place: tJur(`at.${jurisdiction.id}`) })}
          sub={tInputs("noPriceSub")}
        />
      )}

      <section id="adjust" aria-labelledby="am-inputs" className="mt-8 flex scroll-mt-4 flex-col gap-3">
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
