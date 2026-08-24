"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { affordability } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSharedState } from "@/hooks/use-shared-state";
import { useHashTarget } from "@/hooks/use-hash-target";
import { AFFORDABILITY_DEFAULTS, AFFORDABILITY_KEYS } from "@/lib/shared-inputs";
import { isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
import {
  AFFORDABILITY_SECTIONS,
  anySectionOpen,
  isSectionOpen,
  setAllSections,
  type OpenMap,
  type SectionId,
} from "@/lib/sections";
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
  const [stored, update] = useSharedState(AFFORDABILITY_KEYS, AFFORDABILITY_DEFAULTS);
  const hashTarget = useHashTarget();
  const [open, setOpen] = useState<OpenMap>({});
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

  // A hash arrival moves focus to the section it names — scrolling without
  // moving focus leaves a keyboard user where they started.
  useEffect(() => {
    if (!hashTarget) return;
    document.getElementById(hashTarget)?.querySelector("button")?.focus({ preventScroll: true });
  }, [hashTarget]);

  const isOpen = (id: SectionId) => isSectionOpen({ id, open, hashTarget });
  const toggle = (id: SectionId) => setOpen((prev) => ({ ...prev, [id]: !isOpen(id) }));
  const expanded = anySectionOpen(open, hashTarget);

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
    id: SectionId,
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
    <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-5 pb-16 sm:px-10">
      <div className="pt-9 sm:pt-11">
        <div className="eyebrow mb-5 text-ac">{t("aTitle")}</div>
        <div className="flex flex-wrap items-end gap-8 sm:gap-10">
          <div className="min-w-0 flex-1 sm:min-w-[420px]">
            {/* The answer, at the scale of an answer. */}
            <div
              key={jurisdiction.id}
              className="v2-pulse text-[52px] leading-none font-bold tracking-[-0.045em] text-ac sm:text-[72px]"
            >
              {fmt(result.comfort)}
            </div>
            <p className="mt-4 max-w-[560px] text-[17px] leading-[1.45] font-medium tracking-[-0.01em] text-pretty sm:text-[19px]">
              {head}
            </p>
            <p className="mt-2 max-w-[560px] text-[14.5px] leading-[1.6] text-ink2 text-pretty">{sub}</p>
            <p className="eyebrow mt-4 inline-block rounded-full border border-acbr px-2.5 py-1 text-ac">
              {isPersonalised(stored) ? t("tagYours") : t("tagTypical")}
            </p>
          </div>
          <div className="flex flex-none flex-col gap-[18px] sm:min-w-[250px]">
            {[
              { label: t("stCeiling"), value: fmt(result.ceiling), note: t("stCeilingNote"), mark: "rule" as const },
              { label: t("stMonthly"), value: fmt(result.monthly.total), note: headroom(result.comfortGap), mark: "estimate" as const },
              { label: t("stCash"), value: fmt(result.cc.net), note: "", mark: undefined },
            ].map((stat) => (
              <div key={stat.label}>
                <div className="mb-[5px] text-[12.5px] text-ink3">
                  {stat.label}
                  {stat.mark ? <Provenance kind={stat.mark} /> : null}
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[22px] font-semibold tracking-[-0.02em]">{stat.value}</span>
                  <span className="text-[12px] leading-[1.35] text-ink3">{stat.note}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="pt-8 sm:pt-[34px]">
        <div className="flex items-baseline gap-3.5 pb-3">
          <span className="eyebrow flex-1 text-ink3">{t("breakdown")}</span>
          <button
            type="button"
            onClick={() => setOpen(setAllSections(!expanded))}
            aria-expanded={expanded}
            className="rounded-full border border-acbr px-3.5 py-1.5 text-[13px] font-medium text-ac hover:bg-acbg"
          >
            {expanded ? t("collapseAll") : t("expandAll")}
          </button>
        </div>

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

      <div className="mt-10 border-t border-border pt-4 text-[11.5px] text-ink3">
        <p>{t("unverifiedFlag")}</p>
        <p>
          {t("lastVerified")} {federal.verified}
        </p>
        {!jurisdiction.cityData ? <p>{t("noCityData")}</p> : null}
      </div>
    </main>
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
