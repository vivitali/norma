"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { affordability, scenario } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSharedState } from "@/hooks/use-shared-state";
import { useSections } from "@/hooks/use-sections";
import { TOOL_DEFAULTS, TOOL_KEYS } from "@/lib/shared-inputs";
import { isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
import { AFFORDABILITY_SECTIONS, type AffordabilitySectionId } from "@/lib/sections";
import {
  approvalState,
  cashState,
  comfortState,
  decidingSectionId,
  verdictKey,
  type CheckState,
} from "@/lib/affordability-view";
import { SCENARIO_PERCENTS } from "@/lib/scenarios-view";
import type { Tone } from "@/lib/tone";
import { useMoney, usePercent } from "@/lib/format";
import { PanelRow, SectionRow } from "@/components/affordability/section-row";
import { CrossLink, TraceLabel } from "@/components/cross-link";
import { GapBand } from "@/components/affordability/gap-band";
import { Gauges } from "@/components/affordability/gauges";
import { MathColumns } from "@/components/affordability/math-columns";
import { InputGroups } from "@/components/affordability/input-groups";
import { NumberField } from "@/components/number-field";
import { Provenance } from "@/components/provenance";
import { AnswerHead, FigureFooter, SectionsHeader, ToolMain } from "@/components/tool-page";

/** A check state maps onto a dot tone; the derivation has no state at all. */
const TONE: Record<CheckState, Tone> = {
  pass: "pass",
  caution: "caution",
  blocked: "blocked",
  unanswered: "none",
};

export default function AffordabilityPage() {
  const t = useTranslations("Affordability");
  // The reader-facing place name; `jurisdiction.city` is the lowercase record key.
  const tJur = useTranslations("Jurisdictions");
  const [jurisdiction] = useJurisdiction();
  const [stored, update] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const fmt = useMoney();
  const pct = usePercent();

  const resolved = useMemo(
    () => resolveInputs(stored, jurisdiction, federal),
    [stored, jurisdiction],
  );
  const result = useMemo(
    () => affordability(jurisdiction, federal, resolved),
    [jurisdiction, resolved],
  );

  // The section whose check produced the verdict, open on arrival. Derived from
  // the same result the answer is, so the prerendered paint and the hydrated one
  // each open whichever section their own figures make decisive.
  const { isOpen, toggle, expanded, toggleAll } = useSections(
    AFFORDABILITY_SECTIONS,
    decidingSectionId(result),
  );

  /**
   * The smallest of the four compared deposits a lender would actually approve,
   * or null when none does.
   *
   * Computed here rather than promised: the Scenarios line has to say something
   * true, and "would more down fix it?" has exactly two honest answers.
   */
  const approvingPct = useMemo(() => {
    if (approvalState(result) !== "blocked") return null;
    const qualIncome =
      (resolved.income1 + resolved.income2 + resolved.otherIncome) * (1 - resolved.haircut / 100);
    for (const dpPct of SCENARIO_PERCENTS) {
      const column = scenario(jurisdiction, federal, {
        ...resolved,
        dpPct,
        qualIncome,
        debts: resolved.debts,
      });
      if (column.qualifies) return dpPct;
    }
    return null;
  }, [jurisdiction, resolved, result]);

  const propTaxProv =
    jurisdiction.provenance["propTax.publishedRate"] ?? jurisdiction.provenance["propTax.effective"];

  const verdict = verdictKey(result);
  const approval = approvalState(result);
  const comfort = comfortState(result);
  const cash = cashState(result);

  const head =
    verdict === "comfortable"
      ? `${t("vComfort")} ${fmt(result.comfort)}.`
      : verdict === "over"
        ? t("vOver")
        : verdict === "declined"
          ? t("vDeclined")
          : t("vShortCash");
  const sub =
    verdict === "declined"
      ? result.tdsBinds
        ? t("ckTds")
        : t("ckGds")
      : verdict === "shortCash"
        ? result.monthsToClose === null
          ? t("ckCsNo")
          : t("vMonths", { n: result.monthsToClose })
        : t("subComfort");

  /** Comfort: positive means over the ceiling you set. */
  const headroom = (n: number) => (n <= 0 ? `${fmt(-n)} ${t("headroom")}` : `${fmt(n)} ${t("over")}`);
  /**
   * Cash has its own word. A shortfall is money you do not have yet — "short" —
   * not money you are "over" by, which is what a comfort overrun means. Reusing
   * the comfort helper here read as though having too little cash were the same
   * kind of fact as spending too much per month.
   */
  const cashFigure = () => {
    if (cash === "unanswered") return fmt(result.cc.net);
    const gap = result.cashGap ?? 0;
    return gap >= 0 ? `${fmt(gap)} ${t("headroom")}` : `${fmt(-gap)} ${t("short")}`;
  };

  const section = (
    id: AffordabilitySectionId,
    tone: Tone,
    line: string,
    figure: string,
    why: string,
    body: ReactNode,
  ) => {
    const def = AFFORDABILITY_SECTIONS.find((s) => s.id === id)!;
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
        This page keeps its answer where nobody publishes a price, and it is the only
        one that can: the hero is the ceiling your INCOME supports, and no benchmark
        stands behind it. What it loses is the half that tests a price against that
        ceiling — the verdict sentence, the monthly cost, the cash to close and all
        five sections, every one of which compares something to `resolved.price`, which
        is 0 here. "Within reach" computed from a $0 house is the exact claim this
        product exists not to make, so the sub-line says so and asks for a price
        instead. The inputs below are where it is answered.
      */}
      <AnswerHead
        eyebrow={t("aTitle")}
        figure={fmt(result.comfort)}
        pulseKey={jurisdiction.id}
        head={resolved.priceKnown ? head : `${t("vComfort")} ${fmt(result.comfort)}.`}
        sub={
          resolved.priceKnown
            ? sub
            : t("noPriceSub", { place: tJur(`at.${jurisdiction.id}`) })
        }
        tag={isPersonalised(stored) ? t("tagYours") : t("tagTypical")}
        stats={
          resolved.priceKnown
            ? [
                { label: t("stCeiling"), value: fmt(result.ceiling), note: t("stCeilingNote"), mark: "rule" as const },
                { label: t("stMonthly"), value: fmt(result.monthly.total), note: headroom(result.comfortGap), mark: "estimate" as const },
                { label: t("stCash"), value: fmt(result.cc.net) },
              ]
            : // The lender ceiling is a price the reader's income supports, computed the
              // same way with no benchmark in it. The other two are the price's own
              // monthly cost and the cash to close on it, and both would read $0.
              [{ label: t("stCeiling"), value: fmt(result.ceiling), note: t("stCeilingNote"), mark: "rule" as const }]
        }
      />

      {resolved.priceKnown ? (
        <div className="pt-8 sm:pt-[34px]">
          <SectionsHeader
            label={t("breakdown")}
            expanded={expanded}
            onToggleAll={toggleAll}
            expandLabel={t("expandAll")}
            collapseLabel={t("collapseAll")}
          />

          {section(
            "approval",
            TONE[approval],
            // NOT `ckApNo + ckGds` — that was the head's first sentence plus the
            // sub-line verbatim, both a few hundred pixels above. The deciding
            // section's one always-visible line has to earn its place.
            result.tdsBinds
              ? t("ckApTds", { a: fmt(result.binding), d: fmt(resolved.debts) })
              : t("ckApGds", { a: fmt(result.binding) }),
            fmt(result.ceiling),
            t("mStressWhy", { floor: pct(federal.stressTest.floor, 2) }),
            <>
              <PanelRow label={t("mQualInc")} value={fmt(result.qualIncome)} />
              <PanelRow label={t("mStressRate")} value={pct(result.qualRate, 2)} provenance={<Provenance kind="rule" />} />
              <PanelRow label={t("mFactor")} value={result.fq.toFixed(6)} />
              <PanelRow label={`${t("mGdsAllow")} · GDS ${pct(federal.gds)}`} value={fmt(result.gdsAllow)} provenance={<Provenance kind="rule" />} />
              <PanelRow label={`${t("mTdsAllow")} · TDS ${pct(federal.tds)}`} value={fmt(result.tdsAllow)} provenance={<Provenance kind="rule" />} />
              <PanelRow label={t("mBinding")} value={`${fmt(result.binding)} · ${result.tdsBinds ? "TDS" : "GDS"}`} strong />
              <PanelRow label={t("mMaxPrice")} value={fmt(result.ceiling)} strong />
              <Gauges result={result} />
              <p className="mt-[18px] max-w-[700px] text-[12.5px] leading-[1.6] text-ink3 text-pretty">
                {t("heatNote", { h: fmt(federal.heatAllowance) })}
              </p>
              {/*
                VERDICT. Declined only, and suppressed when the cash panel is
                already carrying its second line -- the cap is two per page, and a
                reader who cannot fund the purchase has a nearer question than
                which deposit a lender would accept.

                The clause is computed, not promised: scenario() runs the four
                columns, so this says either which deposit passes or that none
                does. Either answer saves the reader a trip.
              */}
              {approval === "blocked" && cash !== "blocked" ? (
                approvingPct === null ? (
                  <CrossLink namespace="Affordability" id="xScenariosNone" href="/scenarios" />
                ) : (
                  <CrossLink
                    namespace="Affordability"
                    id="xScenariosSome"
                    href="/scenarios"
                    values={{ p: pct(approvingPct) }}
                  />
                )
              ) : null}
            </>,
          )}

          {section(
            "comfort",
            TONE[comfort],
            comfort === "pass" ? t("ckCfOk") : t("ckCfNo"),
            headroom(result.comfortGap),
            t("subComfort"),
            <>
              {/*
                TRACE, on the label. `monthly.pi` is `cc.fin.loan *
                payFactor(contractRate, amortYears)` and `amortization()`'s
                `firstPayment` is the same expression on the same financing off the
                same shared inputs — not "related to", identical to the dollar. It
                is also the largest row in this panel and the one the reader is most
                likely to want taken apart, and taking it apart is the whole of the
                amortization page. The hash lands them on the section that derives
                it rather than on the page's own default.

                The comfort panel carries no sentence: the two this page is allowed
                are spent in approval and cash, which is exactly why a third
                question had no way to be answered until the label could carry it.
              */}
              <PanelRow
                label={
                  <TraceLabel
                    namespace="Affordability"
                    id="mPi"
                    href={{ pathname: "/amortization", hash: "#payment" }}
                  />
                }
                value={fmt(result.monthly.pi)}
              />
              <PanelRow label={t("mPropTax")} value={fmt(result.monthly.propTax)} provenance={<Provenance kind="estimate" />} />
              <PanelRow label={t("cInsurance")} value={fmt(result.monthly.insurance)} provenance={<Provenance kind="estimate" />} />
              <PanelRow label={t("cUtilities")} value={fmt(result.monthly.utilities)} provenance={<Provenance kind="estimate" />} />
              {result.monthly.condoFee > 0 ? (
                <PanelRow label={t("cCondoFee")} value={fmt(result.monthly.condoFee)} />
              ) : null}
              <PanelRow label={t("mMaint")} value={fmt(result.monthly.maintenance)} provenance={<Provenance kind="estimate" />} />
              <PanelRow label={t("mTotal")} value={fmt(result.monthly.total)} strong />
              <PanelRow label={t("mStated")} value={fmt(resolved.comfortCeiling)} strong />
              {resolved.ptype === "condo" && stored.condoFee === null ? (
                <InlineAsk prompt={t("condoFeePrompt")}>
                  <NumberField
                    id="condoFee-inline"
                    label={t("cCondoFee")}
                    value={stored.condoFee}
                    placeholder={resolved.condoFee}
                    min={0}
                    onCommit={(condoFee) => update({ condoFee })}
                  />
                </InlineAsk>
              ) : null}
            </>,
          )}

          {section(
            "cash",
            TONE[cash],
            // Not `separateNote` — that is this section's `why`, and repeating it
            // verbatim on the row above said the same sentence twice.
            cash === "unanswered" ? t("stCash") : cash === "blocked" ? t("ckCsNo") : t("ckCsOk"),
            cashFigure(),
            t("separateNote"),
            <>
              <PanelRow label={t("downPaymentRow")} value={fmt(result.cc.fin.down)} />
              <PanelRow label={t("closingCosts")} value={fmt(result.cc.total)} provenance={<Provenance kind="estimate" />} />
              {/*
                TRACE, and it sits directly under the row it traces rather than at
                the panel foot. That figure IS the closing-costs page's whole
                answer, from the same closingTotal() call, and its provenance mark
                explains what "estimate" means rather than where the number came
                from. Stacking this with the verdict line at the foot read as a
                related-links block -- the one shape this feature must not take.
              */}
              <CrossLink namespace="Affordability" id="xClosing" href="/closing-costs" placement="row" />
              {result.cc.creditsAtClosing > 0 ? (
                <PanelRow label={t("grpAtClosing")} value={`− ${fmt(result.cc.creditsAtClosing)}`} provenance={<Provenance kind="rule" />} />
              ) : null}
              <PanelRow label={t("netCash")} value={fmt(result.cc.net)} strong />
              <PanelRow label={t("cFunds")} value={resolved.funds === null ? "—" : fmt(resolved.funds)} />
              <PanelRow
                label={t("monthsToClose")}
                value={result.monthsToClose === null ? "—" : String(result.monthsToClose)}
                strong
              />
              {/*
                VERDICT. Only when there is a shortfall: with no gap there is no
                question, and an invitation without a question is an advertisement.
                The figure travels because cashGap derives from funds the reader
                actually gave -- `cash === "blocked"` cannot be true otherwise.
              */}
              {cash === "blocked" && result.cashGap !== null ? (
                <CrossLink
                  namespace="Affordability"
                  id="xDownPayment"
                  href="/down-payment"
                  values={{ a: fmt(Math.abs(result.cashGap)) }}
                />
              ) : null}
              {cash === "unanswered" ? (
                <InlineAsk prompt={t("cashUnanswered")}>
                  <NumberField
                    id="funds-inline"
                    label={t("available")}
                    value={stored.funds}
                    min={0}
                    onCommit={(funds) => update({ funds })}
                  />
                </InlineAsk>
              ) : null}
            </>,
          )}

          {section(
            "gap",
            result.gap < 0 ? "none" : "caution",
            t("gapLine"),
            fmt(Math.abs(result.gap)),
            t("gapWhy"),
            <>
              <GapBand result={result} price={resolved.price} />
              <div className="max-w-[620px]">
                <PanelRow label={t("stComfort")} value={fmt(result.comfort)} strong />
                <PanelRow label={t("stCeiling")} value={fmt(result.ceiling)} />
                <PanelRow label={t("gapTarget")} value={fmt(resolved.price)} />
              </div>
            </>,
          )}

          {section("math", "none", t("mLine"), "", t("mWhy"), (
            <MathColumns result={result} resolved={resolved} />
          ))}
        </div>
      ) : null}

      <InputGroups
        stored={stored}
        resolved={resolved}
        result={result}
        jurisdiction={jurisdiction}
        update={update}
      />

      {/*
        The property tax rate is the ONLY jurisdiction figure this page displays,
        so it is the only one whose provenance belongs here. Prefer the published
        rate's source; fall back to the effective rate's, which is where a
        jurisdiction with no published rate carries its explanation.
      */}
      <FigureFooter jurisdiction={jurisdiction}>
        {propTaxProv?.src ? (
          <p>
            {t("propTaxSource")}: {propTaxProv.src}
            {propTaxProv.asOf ? ` (${propTaxProv.asOf})` : null}
          </p>
        ) : null}
        {propTaxProv?.conf === "assumption" || jurisdiction.propTax.basis !== "market" ? (
          <p>{t("propTaxEstimated")}</p>
        ) : null}
      </FigureFooter>
    </ToolMain>
  );
}

/**
 * An input the owning section asks for in place, because that section cannot
 * finish its sentence without it. Nothing on the screen is gated behind it.
 */
function InlineAsk({ prompt, children }: { prompt: string; children: ReactNode }) {
  return (
    <div className="mt-4 flex max-w-[420px] flex-col gap-2 rounded-lg border border-acbr bg-acbg p-3">
      <p className="text-[13px] leading-[1.5] text-ink2 text-pretty">{prompt}</p>
      {children}
    </div>
  );
}
