"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { affordability, scenario } from "@/domain/engine";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useRules } from "@/hooks/use-country";
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
import { countryKey } from "@/lib/country-key";
import { PanelRow, SectionRow } from "@/components/affordability/section-row";
import { CrossLink, TraceLabel } from "@/components/cross-link";
import { GapBand } from "@/components/affordability/gap-band";
import { Gauges } from "@/components/affordability/gauges";
import { MathColumns } from "@/components/affordability/math-columns";
import { InputGroups } from "@/components/affordability/input-groups";
import { NumberField } from "@/components/number-field";
import { Provenance } from "@/components/provenance";
import { AnswerHead, FigureFooter, InlineAsk, NoteLine, PendingFigures, SectionsHeader, ToolMain } from "@/components/tool-page";

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
  const rules = useRules();
  const [stored, update, hydrated] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const fmt = useMoney();
  const pct = usePercent();

  const resolved = useMemo(
    () => resolveInputs(stored, jurisdiction, rules),
    [stored, jurisdiction, rules],
  );
  const result = useMemo(
    () => affordability(jurisdiction, rules, resolved),
    [jurisdiction, rules, resolved],
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
      const column = scenario(jurisdiction, rules, {
        ...resolved,
        dpPct,
        qualIncome,
        debts: resolved.debts,
      });
      if (column.qualifies) return dpPct;
    }
    return null;
  }, [jurisdiction, rules, resolved, result]);

  const propTaxProv =
    jurisdiction.provenance["propTax.publishedRate"] ?? jurisdiction.provenance["propTax.effective"];

  const verdict = verdictKey(result);
  const approval = approvalState(result);
  const comfort = comfortState(result);
  const cash = cashState(result);

  /**
   * The sentence under the hero, and in all four states it now CAPTIONS the hero.
   *
   * It did not. `comfortable` and `over` both describe the comfort price — which is
   * what the figure above them is — but `declined` and `shortCash` were about the
   * TARGET price and the cash gap, leaving the largest number on the page with no
   * sentence attached to it in half of its states. The reader was left to assume the
   * figure was whatever the sentence was about, which is the one thing it is not.
   *
   * Fixed in the copy, not in the arithmetic. Putting `result.ceiling` in the hero
   * for those two states — the other obvious repair — would reverse the decision
   * pinned by page.test.tsx's "the headline is the comfort price, never the lower
   * ceiling": the comfort price answers "what can I carry", the lender ceiling is
   * shown beside it, and the home page's claim that the lower one wins was removed
   * in all four locales. So both branches now open by naming the figure and then say
   * what is wrong with the target.
   */
  const head =
    verdict === "comfortable"
      ? `${t("vComfort")} ${fmt(result.comfort)}.`
      : verdict === "over"
        ? t("vOver")
        : verdict === "declined"
          ? t("vDeclined", { a: fmt(result.comfort) })
          : t("vShortCash", { a: fmt(result.comfort) });
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

  /**
   * The two fields that used to exist TWICE on this screen.
   *
   * `funds` shipped as "Funds available" in the input grid and again as "Funds
   * available for this purchase" in the cash panel's ask; `condoFee` shipped under
   * the same key in both places. Each ask fires on exactly the condition that leaves
   * its grid twin empty, so one press of Expand all put two fields for one value on
   * screen, under two different labels in the `funds` case. They always agreed —
   * both write the same key — so the defect was redundancy and a split label, not a
   * contradiction.
   *
   * The in-place ask is the endorsed placement (DESIGN.md §5.3: the field asks where
   * the sentence that needs it is), so the grid copies are gone and these are the
   * survivors. What the audit's "remove the two from the flat grid" misses is that
   * both asks are gated on the value being ABSENT — removing the grid field alone
   * would have made each of them write-once, with no way to correct a typo. So each
   * renders in both states: boxed with its prompt while the panel cannot finish its
   * sentence without it, and as a plain field once it can.
   */
  const fundsField = (
    <NumberField
      id="funds-inline"
      // The SAME key the read-only row four lines above it uses. `Affordability.available`
      // — "Funds available for this purchase" — was the second half of the split label the
      // comment above says was closed: the duplicate FIELD went, and the panel was still
      // naming one figure two ways, `cFunds` on the row and `available` on the field
      // directly under it. The key is deleted rather than left orphaned.
      label={t("cFunds")}
      value={stored.funds}
      min={0}
      onCommit={(funds) => update({ funds })}
    />
  );
  const condoFeeField = (
    <NumberField
      id="condoFee-inline"
      label={t("cCondoFee")}
      value={stored.condoFee}
      placeholder={resolved.condoFee}
      min={0}
      onCommit={(condoFee) => update({ condoFee })}
    />
  );

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
      {/*
        One mechanism for "the stored inputs have not landed yet", shared by every tool
        page — see `PendingFigures` in tool-page.tsx.

        This page argued its way out of gating and the argument was structurally sound
        against the mechanism it had. Both of its objections were about `figure={undefined}`:
        that would blank the answer in the PRERENDERED html, and it flips `AnswerHead` into
        DESIGN.md §5.3's ask state, resizing the head and shifting ~70px of layout at
        hydration. `visibility: hidden` answers both — the figure keeps its text, so the
        static document still carries the answer, and it keeps its box, so nothing moves.
        The remaining reason to differ was a preference, and a preference is not worth a
        fifth way of doing one thing.

        The pulse is untouched and orthogonal: it ACKNOWLEDGES the recomputation at the
        moment the reader's own saved numbers land (DESIGN.md §6), which is a different
        job from not showing a figure that is about to change.
      */}
      <PendingFigures pending={!hydrated}>
      <AnswerHead
        eyebrow={t("aTitle")}
        figure={fmt(result.comfort)}
        pulseKey={hydrated && isPersonalised(stored) ? `${jurisdiction.id}:yours` : jurisdiction.id}
        head={resolved.priceKnown ? head : `${t("vComfort")} ${fmt(result.comfort)}.`}
        sub={
          resolved.priceKnown
            ? sub
            : t("noPriceSub", { place: tJur(`at.${jurisdiction.id}`) })
        }
        /*
          "Typical for your city" was false twice over on a fresh visit. The hero is
          driven by DEFAULT_COMFORT_CEILING, DEFAULT_INSURANCE_ANNUAL and
          DEFAULT_UTILITIES (resolve-inputs.ts:18-20) — national prototype carry-overs
          that no city derived and no publisher produced — so the tag claimed a
          provenance the figure does not have AND named a place that had nothing to do
          with it. The tag now NAMES the two assumptions the reader can act on
          instead, which is the disclosure the figures could always have carried.

          Both arguments read off the RESOLVED inputs rather than being written into
          the copy, so a translator cannot pin a stale figure into a sentence. They
          are safe as `income1` and `comfortCeiling` alone because this branch only
          renders while `isPersonalised` is false — i.e. while every PERSONAL_KEY,
          `income2` and `otherIncome` among them, is untouched.

          `comfortCeiling` deliberately stays a flat constant rather than becoming an
          UNKNOWN the page asks for: resolve-inputs.ts:5-13 records that deriving it
          would mean inventing an affordability heuristic with no source. Disclosing
          the assumption is the fix; removing the answer is not.
        */
        tag={
          isPersonalised(stored)
            ? t("tagYours")
            : t("tagTypical", {
                income: fmt(resolved.income1),
                budget: fmt(resolved.comfortCeiling),
              })
        }
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
      </PendingFigures>

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
              ? t(countryKey("ckApTds", rules.country), { a: fmt(result.binding), d: fmt(resolved.debts) })
              : t(countryKey("ckApGds", rules.country), { a: fmt(result.binding) }),
            fmt(result.ceiling),
            // No federal stress test exists on a US mortgage — rules.stressTest is null
            // there, and the qualifying rate below IS the contract rate.
            rules.stressTest
              ? t("mStressWhy", { floor: pct(rules.stressTest.floor, 2) })
              : t("mNoStressTest"),
            <>
              <PanelRow label={t("mQualInc")} value={fmt(result.qualIncome)} />
              <PanelRow
                label={t(countryKey("mStressRate", rules.country))}
                value={pct(result.qualRate, 2)}
                provenance={<Provenance kind="rule" />}
              />
              <PanelRow label={t("mFactor")} value={result.fq.toFixed(6)} />
              <PanelRow
                label={`${t("mGdsAllow")} · ${t(countryKey("dtiFrontAbbr", rules.country))} ${pct(rules.gds)}`}
                value={fmt(result.gdsAllow)}
                provenance={<Provenance kind="rule" />}
              />
              <PanelRow
                label={`${t("mTdsAllow")} · ${t(countryKey("dtiBackAbbr", rules.country))} ${pct(rules.tds)}`}
                value={fmt(result.tdsAllow)}
                provenance={<Provenance kind="rule" />}
              />
              <PanelRow
                label={t("mBinding")}
                value={`${fmt(result.binding)} · ${t(countryKey(result.tdsBinds ? "dtiBackAbbr" : "dtiFrontAbbr", rules.country))}`}
                strong
              />
              <PanelRow label={t("mMaxPrice")} value={fmt(result.ceiling)} strong />
              {/*
                WHICH LIMIT PRODUCED THE NUMBER ABOVE.

                PRODUCT.md's fourth principle is that the binding constraint is the
                insight, and the page acted on that structurally — `decidingSectionId`
                opens the section that decided — without ever saying it in words on the
                row where the ceiling is derived. `mBinding` prints "GDS" or "TDS",
                which is the fact in the reader's vocabulary only if they already have
                the vocabulary.

                It introduces no figure. Each branch prints a DIFFERENCE the engine
                already computes and the page already renders elsewhere: `gap` in the
                gap band, `debtCapacity` in ImpactRow, `qualRate` two rows up. That is
                what makes a consequence line cheap in a product where every number
                needs a source — it is arithmetic over numbers that already have one.

                Deliberately NOT a second ImpactRow: DESIGN.md:115 records one 3px
                accent, singular, and replicating it spends the signal. This is the
                quiet form, in the same note treatment as `heatNote` below.

                Silent at a zero ceiling, for ImpactRow's own reason (impact-row.tsx):
                when nothing is approvable, nothing binds, and every sentence about
                which limit did the binding is false rather than merely unhelpful.
              */}
              {result.ceiling > 0 ? (
                <p className="mt-[18px] max-w-[700px] text-[12.5px] leading-[1.6] text-ink3 text-pretty">
                  {result.gap > 0
                    ? t("boundComfort", { a: fmt(result.gap) })
                    : result.tdsBinds
                      ? t("boundDebts", { a: fmt(result.debtCapacity) })
                      : t("boundIncome", { r: pct(result.qualRate, 2) })}
                </p>
              ) : null}
              <Gauges result={result} />
              {/*
                No heat-allowance concept exists on a US mortgage — `rules.heatAllowance`
                is CA-only, and `condoFeeInclusion` is 1 on every US record (Fannie
                Mae/FHA DTI guidance counts the full HOA fee, not CMHC's 50%
                convention), so there is no lender-vs-household gap left to disclose.
                Both halves of this paragraph are CA-specific; it renders nothing at all
                on a US call rather than a half-true sentence.
              */}
              {rules.country === "ca" ? (
                <p className="mt-[18px] max-w-[700px] text-[12.5px] leading-[1.6] text-ink3 text-pretty">
                  {t("heatNote", { h: fmt(rules.heatAllowance) })}
                  {/*
                    The other thing this panel does on the reader's behalf and never
                    said: a condo fee is counted at `rules.condoFeeInclusion` in the
                    ratios above and at 100% in the monthly total below, and both are
                    correct. It rides on `heatNote` rather than taking a paragraph of
                    its own because it is the same disclosure — what a LENDER counts,
                    as against what the household pays — and the clause renders only
                    when there is a fee to disclose.
                  */}
                  {result.monthly.condoFee > 0
                    ? ` ${t("condoLenderNote", { share: pct(rules.condoFeeInclusion * 100) })}`
                    : null}
                </p>
              ) : null}
              {/*
                FHA is DATA ONLY on `rules.programs.fha` (see UsRules's own doc
                comment) — no engine function reads it, so nothing on this screen
                computes an FHA figure. The tip names the programme and says so,
                rather than silently omitting the one alternative-financing fact a
                declined US buyer most wants: a 3.5% down payment exists, just not
                through the conventional-loan math this page models.
              */}
              {rules.country === "us" ? (
                <NoteLine tight>
                  {t("fhaTip", { p: pct(rules.programs.fha.minDown * 100) })}
                </NoteLine>
              ) : null}
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
              {/*
                PMI — zero on every Canadian record (CMHC's premium is financed into
                the loan, not billed monthly; see financing()'s own doc comment), so
                this row is silent there rather than a permanent $0 line.
              */}
              {result.monthly.pmi > 0 ? (
                <PanelRow label={t("cPmi")} value={fmt(result.monthly.pmi)} provenance={<Provenance kind="rule" />} />
              ) : null}
              <PanelRow label={t("cUtilities")} value={fmt(result.monthly.utilities)} provenance={<Provenance kind="estimate" />} />
              {result.monthly.condoFee > 0 ? (
                <PanelRow label={t("cCondoFee")} value={fmt(result.monthly.condoFee)} />
              ) : null}
              <PanelRow label={t("mMaint")} value={fmt(result.monthly.maintenance)} provenance={<Provenance kind="estimate" />} />
              <PanelRow label={t("mTotal")} value={fmt(result.monthly.total)} strong />
              <PanelRow label={t("mStated")} value={fmt(resolved.comfortCeiling)} strong />
              {/*
                Reachable wherever a strata fee can exist, not only where we ask for
                one. The prompt is still gated to an unanswered CONDO — "You picked a
                condo" is false of a new build and of a house — but the field itself
                survives the answer, and a new-build condo can reach it at all.
                A house keeps it only if a fee was somehow stored, so there is
                something to clear.
              */}
              {resolved.ptype === "condo" && stored.condoFee === null ? (
                <InlineAsk prompt={t("condoFeePrompt")}>{condoFeeField}</InlineAsk>
              ) : resolved.ptype !== "house" || stored.condoFee !== null ? (
                <div className="mt-4 max-w-[420px]">{condoFeeField}</div>
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
                <InlineAsk prompt={t("cashUnanswered")}>{fundsField}</InlineAsk>
              ) : (
                // Answered, and still editable. The prompt goes — it asks a question
                // the reader has already answered — but the field stays, because the
                // grid copy that used to be the only way back is gone.
                <div className="mt-4 max-w-[420px]">{fundsField}</div>
              )}
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

