"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { affordability } from "@/domain/engine";
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
  verdictKey,
  type CheckState,
} from "@/lib/affordability-view";
import type { Tone } from "@/lib/tone";
import { useMoney, usePercent } from "@/lib/format";
import { PanelRow, SectionRow } from "@/components/affordability/section-row";
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
  const [jurisdiction] = useJurisdiction();
  const [stored, update] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const { isOpen, toggle, expanded, toggleAll } = useSections(AFFORDABILITY_SECTIONS);
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
      <AnswerHead
        eyebrow={t("aTitle")}
        figure={fmt(result.comfort)}
        pulseKey={jurisdiction.id}
        head={head}
        sub={sub}
        tag={isPersonalised(stored) ? t("tagYours") : t("tagTypical")}
        stats={[
          { label: t("stCeiling"), value: fmt(result.ceiling), note: t("stCeilingNote"), mark: "rule" },
          { label: t("stMonthly"), value: fmt(result.monthly.total), note: headroom(result.comfortGap), mark: "estimate" },
          { label: t("stCash"), value: fmt(result.cc.net) },
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
          "approval",
          TONE[approval],
          `${approval === "pass" ? t("ckApOk") : t("ckApNo")} ${result.tdsBinds ? t("ckTds") : t("ckGds")}`,
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
          </>,
        )}

        {section(
          "comfort",
          TONE[comfort],
          comfort === "pass" ? t("ckCfOk") : t("ckCfNo"),
          headroom(result.comfortGap),
          t("subComfort"),
          <>
            <PanelRow label={t("mPi")} value={fmt(result.monthly.pi)} />
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

      <InputGroups
        stored={stored}
        resolved={resolved}
        result={result}
        jurisdiction={jurisdiction}
        update={update}
      />

      <FigureFooter jurisdiction={jurisdiction} />
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
