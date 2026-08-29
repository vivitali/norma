"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { closingTotal, glidePath, minDown, waterfall, type SourceKey } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { CalcTrace } from "@/components/calc/calc-trace";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSections } from "@/hooks/use-sections";
import { useSharedState } from "@/hooks/use-shared-state";
import { TOOL_DEFAULTS, TOOL_KEYS, type ToolFormState } from "@/lib/shared-inputs";
import { anySourceGiven, isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
import { DOWN_PAYMENT_SECTIONS } from "@/lib/sections";
import type { Tone } from "@/lib/tone";
import { useMoney, usePercent } from "@/lib/format";
import { PanelRow, SectionRow } from "@/components/affordability/section-row";
import { CrossLink, TraceLabel } from "@/components/cross-link";
import { GlideChart } from "@/components/down-payment/glide-chart";
import { NumberField } from "@/components/number-field";
import { Provenance } from "@/components/provenance";
import { PurchaseInputs } from "@/components/purchase-inputs";
import { AnswerHead, FigureFooter, InlineAsk, PendingFigures, SectionsHeader, ToolMain } from "@/components/tool-page";
import { NOT_MODELLED } from "./omissions";

/**
 * Each waterfall source, and the stored key holding its balance. Typed against
 * ToolFormState rather than SharedInputs so a key the pages cannot persist --
 * jurId lives in its own provider -- is a compile error rather than undefined.
 */
const SOURCE_FIELD: Record<SourceKey, keyof ToolFormState> = {
  fhsa: "fhsa",
  cash: "cashSav",
  hbp: "rrsp",
  tfsa: "tfsa",
  gift: "gift",
  nonreg: "nonreg",
};

const SOURCE_LABEL: Record<SourceKey, string> = {
  fhsa: "srcFhsa",
  cash: "srcCash",
  hbp: "srcHbp",
  tfsa: "srcTfsa",
  gift: "srcGift",
  nonreg: "srcNonreg",
};

export default function DownPaymentPage() {
  const t = useTranslations("DownPayment");
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
  const closing = useMemo(
    () => closingTotal(jurisdiction, federal, resolved),
    [jurisdiction, resolved],
  );

  // The target is net cash at closing, not the down payment alone: closing costs
  // are due the same day, and assembling only the down payment is the mistake
  // this page exists to prevent.
  const need = closing.net;

  const flow = useMemo(
    () =>
      waterfall(federal, {
        need,
        prov: jurisdiction.prov,
        // Required, not defaulted: the FHSA and the Home Buyers' Plan are
        // first-time-buyer programmes in law, and the engine now blocks both rather
        // than spending money the reader cannot legally use.
        ftb: resolved.ftb,
        income: resolved.taxIncome,
        fhsa: resolved.fhsa,
        cash: resolved.cashSav,
        rrsp: resolved.rrsp,
        tfsa: resolved.tfsa,
        gift: resolved.gift,
        nonreg: resolved.nonreg,
        nonregGain: resolved.nonregGain,
      }),
    [need, jurisdiction.prov, resolved],
  );

  const glide = useMemo(
    () => glidePath(federal, flow.shortfall, resolved.save ?? 0),
    [flow.shortfall, resolved.save],
  );

  const described = anySourceGiven(stored);

  const { isOpen, toggle, expanded, toggleAll } = useSections(
    DOWN_PAYMENT_SECTIONS,
    // Nothing is described on a first visit, so the target -- what has to be
    // assembled -- is the only section with something to say. Once balances
    // exist, the waterfall is the answer.
    described ? "waterfall" : "target",
  );
  const funded = described && flow.shortfall <= 0.5;
  const obligations = flow.rows.reduce((sum, row) => sum + row.repayAnnual, 0);

  const head = !described
    ? t("assembled")
    : funded
      ? flow.taxTotal > 0
        ? t("fullyFundedBeforeTax", { a: fmt(flow.surplus), tax: fmt(flow.taxTotal) })
        : t("fullyFunded", { a: fmt(flow.surplus) })
      : t("shortBy", { a: fmt(flow.drawnTotal), b: fmt(flow.shortfall) });

  const section = (id: string, tone: Tone, line: string, figure: string, why: string, body: ReactNode) => {
    const def = DOWN_PAYMENT_SECTIONS.find((entry) => entry.id === id)!;
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

  const legal = minDown(federal, resolved.price);
  // The REQUESTED percentage, deliberately: resolved.dpPct already has the floor
  // applied, so comparing it against the floor could never report a raise.
  const chosen = (resolved.price * resolved.dpPctRequested) / 100;

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
            every tool page — see `PendingFigures` in tool-page.tsx for why it hides
            rather than omits, and what that trades.
          */}
          <PendingFigures pending={!hydrated}>
          <AnswerHead
            eyebrow={t("title")}
            figure={fmt(need)}
            pulseKey={jurisdiction.id}
            head={head}
            sub={described ? t("subtitle") : t("unanswered")}
            tag={isPersonalised(stored) ? t("tagYours") : t("tagTypical")}
            stats={[
              { label: t("downPaymentRow"), value: fmt(closing.fin.down) },
              { label: t("closingCosts"), value: fmt(closing.total), mark: "rule" },
              {
                label: described ? t("totalDrawn") : t("totalAvailable"),
                value: fmt(described ? flow.drawnTotal : flow.totalAvailable),
              },
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
              "target",
              resolved.belowMinimum ? "caution" : "none",
              t("needLabel"),
              fmt(need),
              t("targetWhy"),
              <>
                <PanelRow
                  label={t("minDown")}
                  value={fmt(legal)}
                  provenance={<Provenance kind="rule" />}
                />
                <PanelRow label={`${t("chosenDown")} · ${pct(resolved.dpPctRequested)}`} value={fmt(chosen)} />
                {resolved.belowMinimum ? (
                  <p className="pt-1 text-[12.5px] text-caution">{t("belowMin")}</p>
                ) : null}
                {/*
                  TRACE, on the label rather than under it. DESIGN.md §5.2 names this
                  panel — "Down Payment reprints it entire" — as one of the three
                  printing another page's answer with a provenance mark that says
                  what "estimate" means and nothing about where the figure came from.
                  It IS closingTotal().total, the closing-costs page's headline, off
                  the same shared inputs.

                  A sentence here would have cost this page one of its two, to say in
                  prose what the two words already say. The words are the link.
                */}
                <PanelRow
                  label={<TraceLabel namespace="DownPayment" id="closingCosts" href="/closing-costs" />}
                  value={fmt(closing.total)}
                  provenance={<Provenance kind="rule" />}
                />
                {closing.creditsAtClosing > 0 ? (
                  <PanelRow label={t("grpAtClosing")} value={`− ${fmt(closing.creditsAtClosing)}`} />
                ) : null}
                <PanelRow label={t("netCash")} value={fmt(need)} strong />
                {/*
                  THE ASK, in the section that is actually open when it is made.
                  The hero's sub-line asks the reader to add their balances, and
                  every one of the six fields that answers it sits inside the
                  CLOSED waterfall section — so the page asked a question in a
                  place where it could not be answered.

                  A link rather than a copy of the fields. Duplicating them would
                  put two controls on one key (the defect this review found on
                  /affordability), and a field placed HERE would unmount under the
                  reader's cursor the moment it took a value: `described` flips,
                  the default open section moves to `waterfall`, and this panel
                  closes. The hash is the mechanism the product already has —
                  `useHashTarget` opens the named section and moves FOCUS to it,
                  not just the scroll position.
                */}
                {!described ? (
                  <InlineAsk>
                    {t.rich("askBalances", {
                      link: (chunks) => (
                        <a
                          href="#waterfall"
                          className="font-medium text-ac underline-offset-2 hover:underline"
                        >
                          {chunks}
                        </a>
                      ),
                    })}
                  </InlineAsk>
                ) : null}
              </>,
            )}

            {section(
              "waterfall",
              !described ? "none" : funded ? "pass" : "blocked",
              // With balances given the row states what the waterfall reached.
              // "Cheapest money first" is the ordering RULE -- true of the section
              // whatever the numbers, which is why it is kept only for the state
              // where there are no numbers yet.
              !described
                ? t("cheapest")
                : funded
                  ? `${t("surplusLabel")} ${fmt(flow.surplus)}`
                  : `${t("shortfallLabel")} ${fmt(flow.shortfall)}`,
              // Nothing drawn yet is not a value of "—": an em-dash reads as a
              // figure that failed to render. An empty figure is the contract's
              // marker for a section with no number of its own yet.
              described ? fmt(flow.drawnTotal) : "",
              t("waterfallWhy"),
              <>
                {flow.rows.map((row) => (
                  <div key={row.key} className="border-b border-hairline pb-2">
                    <PanelRow
                      label={`${t(SOURCE_LABEL[row.key])} · ${t(row.cost === "free" ? "free" : row.cost === "strings" ? "strings" : "costs")}`}
                      // "Not needed" is what an untouched row says, and it is false
                      // of a blocked one: the money is there and the programme is
                      // shut. The row stays, at zero, saying which.
                      value={
                        row.blocked === "ftb"
                          ? t("notAvailable")
                          : row.drawn > 0
                            ? fmt(row.drawn)
                            : t("untouched")
                      }
                      strong={row.drawn > 0}
                    />
                    {/*
                      ONE call site for all six Why keys, which is what lets a key
                      grow an argument without the loop learning about it. `a` and
                      `l` are the FHSA's annual and lifetime room — `conf: "high"`,
                      asOf 2026-08-24, CRA "Participating in your FHSAs" — sourced
                      since #5 landed and read by NO screen until now. They travel
                      as arguments rather than as typed copy so the catalogue can
                      never drift from `federal`.
                    */}
                    <p className="pt-1 text-[12px] leading-[1.55] text-ink3 text-pretty">
                      {t(`${SOURCE_LABEL[row.key]}Why`, {
                        y: federal.hbp.repayYears,
                        a: fmt(federal.fhsa.annual),
                        l: fmt(federal.fhsa.lifetime),
                      })}
                    </p>
                    {row.blocked === "ftb" ? (
                      <p className="pt-1 text-[12px] leading-[1.55] text-caution text-pretty">
                        {t("srcBlockedFtb")}
                      </p>
                    ) : null}
                    {/*
                      Once, on the first of the two gated rows rather than on both.
                      "First-time" is narrower than it sounds and the trap is
                      specific to this reader: CRA counts a home owned and lived in
                      anywhere in the world, so someone who left a flat behind can
                      arrive here, tick the box and be shown money they may not be
                      able to use. No period is named — it is not in `src/domain`,
                      so under the sourcing rule it may not travel.
                    */}
                    {row.key === "fhsa" ? (
                      <p className="pt-1 text-[12px] leading-[1.55] text-ink3 text-pretty">
                        {t("srcFtbCheck")}
                      </p>
                    ) : null}
                    {row.drawn > 0 && row.repayAnnual > 0 ? (
                      <p className="pt-1 text-[12px] text-caution">
                        {t("repayAnnual", { a: fmt(row.repayAnnual), y: federal.hbp.repayYears })}
                      </p>
                    ) : null}
                    {row.key === "tfsa" && row.drawn > 0 ? (
                      <p className="pt-1 text-[12px] text-caution">{t("roomLost")}</p>
                    ) : null}
                    {row.gainRealised > 0 ? (
                      <p className="pt-1 text-[12px] text-caution">
                        {t("gainRealised", {
                          g: fmt(row.gainRealised),
                          i: pct(federal.capGainsInclusion * 100),
                          r: pct(flow.rate * 100, 1),
                        })}
                      </p>
                    ) : null}
                    {/*
                      A blocked row has `avail: 0`, so "Left in the account: $0"
                      would report an empty account to a reader looking at their own
                      balance in the field two lines below.
                    */}
                    {row.blocked === undefined ? (
                      <div className="flex gap-4 pt-1 text-[11.5px] text-ink3">
                        <span>
                          {t("left")}: {fmt(row.left)}
                        </span>
                        {row.exhausted ? <span>{t("exhausted")}</span> : null}
                      </div>
                    ) : null}
                    <div className="mt-2 max-w-[320px]">
                      <NumberField
                        id={`src-${row.key}`}
                        label={t(SOURCE_LABEL[row.key])}
                        value={stored[SOURCE_FIELD[row.key]] as number | null}
                        min={0}
                        onCommit={(next) => update({ [SOURCE_FIELD[row.key]]: next })}
                      />
                      {row.key === "nonreg" ? (
                        <div className="mt-2">
                          <NumberField
                            id="nonregGain"
                            label={t("unrealised")}
                            value={stored.nonregGain}
                            min={0}
                            onCommit={(nonregGain) => update({ nonregGain })}
                          />
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
                {/*
                  TRACE. The waterfall draws on the Home Buyers' Plan and states the
                  15-year obligation in one clause; the mechanism — the refund, the
                  90-day rule, what a missed year costs — is that page's whole
                  subject.
                */}
                <CrossLink namespace="DownPayment" id="xRrspHbp" href="/rrsp-hbp" />
                <PanelRow label={t("totalDrawn")} value={fmt(flow.drawnTotal)} strong />
                {flow.shortfall > 0.5 ? (
                  <PanelRow label={t("shortfallLabel")} value={fmt(flow.shortfall)} strong />
                ) : (
                  <PanelRow label={t("surplusLabel")} value={fmt(flow.surplus)} strong />
                )}
              </>,
            )}

            {section(
              "cost",
              flow.taxTotal > 0 || obligations > 0 ? "caution" : "none",
              // "Costs tax" under a section called "Tax cost" is the same two words
              // reordered. What the reader cannot see from the figure is the rate
              // it was struck at, or that an obligation exists with no tax at all.
              flow.taxTotal > 0
                ? `${t("marginal")} ${pct(flow.rate * 100, 1)}`
                : obligations > 0
                  ? t("repayAnnual", { a: fmt(obligations), y: federal.hbp.repayYears })
                  : t("noCostAtAll"),
              // No tax is an absence, not a value: "$0" would assert a tax bill
              // exists and happens to be nil, and an em-dash reads as a figure that
              // failed to render. The line carries which of the two is true, and it
              // now distinguishes the case with no tax but a repayment obligation.
              flow.taxTotal > 0 ? fmt(flow.taxTotal) : "",
              t("costWhy"),
              <>
                <PanelRow
                  label={t("marginal")}
                  value={pct(flow.rate * 100, 1)}
                  provenance={<Provenance kind="rule" />}
                />
                <PanelRow
                  label={t("income")}
                  value={fmt(resolved.taxIncome)}
                  provenance={<Provenance kind="estimate" />}
                />
                <PanelRow label={t("taxCost")} value={fmt(flow.taxTotal)} strong />
                {obligations > 0 ? (
                  <PanelRow label={t("obligationsLabel")} value={t("repayAnnual", { a: fmt(obligations), y: federal.hbp.repayYears })} strong />
                ) : null}
                <div className="mt-4 max-w-[320px]">
                  <NumberField
                    id="taxIncome"
                    label={t("income")}
                    value={stored.taxIncome}
                    placeholder={resolved.taxIncome}
                    min={0}
                    onCommit={(taxIncome) => update({ taxIncome })}
                  />
                </div>
              </>,
            )}

            {section(
              "glide",
              // A saving rate nobody gave cannot fail to reach a target. Reporting
              // "not reached at this savings rate" over an empty form blames the
              // reader for an input they were never asked for on this screen.
              !described || resolved.save === null
                ? "none"
                : flow.shortfall <= 0.5
                  ? "pass"
                  : glide.reach === null
                    ? "blocked"
                    : "caution",
              !described || resolved.save === null
                ? t("noSaveRate")
                : flow.shortfall <= 0.5
                  ? t("already")
                  : glide.reach === null
                    ? t("never")
                    : t("reached", { m: glide.reach }),
              // A shortfall that has been closed is not a shortfall, and no
              // balances given at all is not a figure yet. The em-dash covered both
              // and distinguished neither; the line says which one this is.
              described && flow.shortfall > 0.5 ? fmt(flow.shortfall) : "",
              t("glideWhy"),
              <>
                {described && flow.shortfall > 0.5 ? (
                  <>
                    {resolved.save !== null && resolved.save > 0 ? <GlideChart glide={glide} /> : null}
                    <PanelRow label={t("shortfallLabel")} value={fmt(flow.shortfall)} strong />
                    <PanelRow
                      label={t("monthlySavings")}
                      value={resolved.save === null ? "—" : fmt(resolved.save)}
                    />
                    {resolved.save === null || resolved.save <= 0 ? (
                      <p className="pt-2 text-[12.5px] text-ink3">{t("noSaveRate")}</p>
                    ) : null}
                    <p className="pt-2 text-[12px] text-ink3">
                      {t("glideNote", { r: pct(federal.savingsReturn * 100, 1) })}
                    </p>
                  </>
                ) : (
                  <p className="text-[13.5px] text-ink2">
                    {described ? t("noShortfall") : t("unanswered")}
                  </p>
                )}
                <div className="mt-4 max-w-[320px]">
                  <NumberField
                    id="save"
                    label={t("monthlySavings")}
                    value={stored.save}
                    min={0}
                    onCommit={(save) => update({ save })}
                  />
                </div>
              </>,
            )}
            {/*
              "Show me how you got that."

              The target, then the draw. Every operand comes off `closing` and `flow`
              rather than being recomputed, so a reader following the trace lands on
              the same shortfall the head reports — and can see WHICH account it turns
              on, which is the thing a list of balances does not tell them.
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
                  { label: t("calcTargetDown"), value: fmt(closing.fin.down) },
                  { label: t("calcTargetCosts"), value: fmt(closing.total), op: "plus" },
                  ...(closing.creditsAtClosing > 0
                    ? [{ label: t("calcCredits"), value: fmt(closing.creditsAtClosing), op: "minus" as const }]
                    : []),
                  { label: t("needLabel"), value: fmt(need), op: "equals", strong: true },
                  { label: t("calcDrawn"), value: fmt(flow.drawnTotal), op: "minus", rule: true },
                  {
                    // One line or the other, never a zero of both: "short by $0" and
                    // "left over $0" are each a claim, and only one of them is ever true.
                    label: flow.shortfall > 0.5 ? t("calcShortfall") : t("calcSurplus"),
                    value: fmt(flow.shortfall > 0.5 ? flow.shortfall : flow.surplus),
                    op: "equals",
                    strong: true,
                  },
                ]}
              />,
            )}
          </div>

          {/*
            MOVE 3 — the same omissions inventory Rent vs Buy already ships and
            Closing Costs now carries: a module-level list whose LENGTH feeds the
            sentence introducing it, so the count cannot drift from the list.

            Both entries are the reason it exists. Neither can ever carry a figure —
            seasoning periods are lender policy and unpublished, and the per-person
            caps question needs a fact about a second buyer this app never asks for
            — so before this list they were silence, which reads as "does not
            apply" to exactly the reader who most needs to know it does.

            Not a section: it hides nothing, and DESIGN.md §8 forbids a second way
            to REVEAL, not a paragraph.
          */}
          <section aria-labelledby="dp-omissions" className="mt-10 flex flex-col gap-2">
            <h2 id="dp-omissions" className="text-[13px] font-semibold">
              {t("notModelledTitle")}
            </h2>
            <p className="max-w-[620px] text-[12.5px] leading-[1.6] text-ink3 text-pretty">
              {t("notModelledLine", { n: NOT_MODELLED.length })}
            </p>
            <ul className="m-0 flex list-none flex-col gap-2 p-0">
              {NOT_MODELLED.map((key) => (
                <li
                  key={key}
                  className="max-w-[620px] text-[12.5px] leading-[1.6] text-ink2 text-pretty"
                >
                  {t(key)}
                </li>
              ))}
            </ul>
          </section>
        </>
      ) : (
        <AnswerHead
          eyebrow={t("title")}
          head={tInputs("noPriceHead", { place: tJur(`at.${jurisdiction.id}`) })}
          sub={tInputs("noPriceSub")}
        />
      )}

      <section aria-labelledby="dp-inputs" className="mt-8 flex flex-col gap-3">
        <h2 id="dp-inputs" className="text-[13px] font-semibold">
          {t("balances")}
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

/**
 * The ask, where the section making it cannot answer it.
 *
 * The same treatment /affordability uses, with one difference: its children are a
 * control, and these are a sentence carrying a link. Nothing on the screen is
 * gated behind either.
 */

