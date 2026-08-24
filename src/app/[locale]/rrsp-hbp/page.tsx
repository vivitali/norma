"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { hbpPlay, marginalRate } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSections } from "@/hooks/use-sections";
import { useSharedState } from "@/hooks/use-shared-state";
import { TOOL_DEFAULTS, TOOL_KEYS } from "@/lib/shared-inputs";
import { isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
import { RRSP_HBP_SECTIONS } from "@/lib/sections";
import type { Tone } from "@/lib/tone";
import { useMoney, usePercent } from "@/lib/format";
import { PanelRow, SectionRow } from "@/components/affordability/section-row";
import { NumberField } from "@/components/number-field";
import { Provenance } from "@/components/provenance";
import { AnswerHead, FigureFooter, SectionsHeader, ToolMain } from "@/components/tool-page";

export default function RrspHbpPage() {
  const t = useTranslations("RrspHbp");
  const [jurisdiction] = useJurisdiction();
  const [stored, update] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const { isOpen, toggle, expanded, toggleAll } = useSections(RRSP_HBP_SECTIONS);
  const fmt = useMoney();
  const pct = usePercent();

  const resolved = useMemo(
    () => resolveInputs(stored, jurisdiction, federal),
    [stored, jurisdiction],
  );
  const rate = useMemo(
    () => marginalRate(federal, jurisdiction.prov, resolved.taxIncome),
    [jurisdiction.prov, resolved.taxIncome],
  );
  const play = useMemo(
    () =>
      hbpPlay(federal, {
        contribution: resolved.hbpContribution,
        marginalRate: rate,
        withdrawAmount: resolved.hbpWithdraw,
      }),
    [resolved.hbpContribution, resolved.hbpWithdraw, rate],
  );

  const section = (id: string, tone: Tone, line: string, figure: string, why: string, body: ReactNode) => {
    const def = RRSP_HBP_SECTIONS.find((entry) => entry.id === id)!;
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

  const step = (title: string, body: string, warn?: string) => (
    <div className="border-b border-hairline py-3">
      <p className="text-[13.5px] font-semibold">{title}</p>
      <p className="mt-1 max-w-[620px] text-[13px] leading-[1.6] text-ink2 text-pretty">{body}</p>
      {warn ? (
        <p className="mt-1.5 max-w-[620px] text-[12.5px] leading-[1.55] text-blocked text-pretty">
          {warn}
        </p>
      ) : null}
    </div>
  );

  return (
    <ToolMain>
      <AnswerHead
        eyebrow={t("title")}
        figure={fmt(play.refund)}
        pulseKey={jurisdiction.id}
        head={t("refund")}
        sub={t("subtitle")}
        tag={isPersonalised(stored) ? t("tagYours") : t("tagTypical")}
        stats={[
          { label: t("withdraw"), value: fmt(play.withdraw), mark: "rule" },
          {
            label: t("repaySchedule"),
            value: fmt(play.repayAnnual),
            note: t("obligationYears", { n: play.repayYears }),
          },
          { label: t("marginal"), value: pct(rate * 100, 1), mark: "rule" },
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
          "refund",
          play.withdraw > 0 ? "pass" : "none",
          play.withdraw > 0 ? t("refund") : t("noWithdraw"),
          fmt(play.refund),
          t("refundWhy"),
          <>
            <PanelRow label={t("contribution")} value={fmt(play.contribution)} />
            <PanelRow
              label={t("federalMax")}
              value={fmt(play.max)}
              provenance={<Provenance kind="rule" />}
            />
            <PanelRow label={t("withdrawRoomLeft")} value={fmt(play.withdrawRoomLeft)} />
            <PanelRow
              label={t("income")}
              value={fmt(resolved.taxIncome)}
              provenance={<Provenance kind="estimate" />}
            />
            <PanelRow
              label={t("marginal")}
              value={pct(rate * 100, 1)}
              provenance={<Provenance kind="rule" />}
            />
            <PanelRow label={t("refund")} value={fmt(play.refund)} strong />
            <div className="mt-4 flex max-w-[420px] flex-col gap-3">
              <NumberField
                id="hbpContribution"
                label={t("contribution")}
                value={stored.hbpContribution}
                placeholder={resolved.hbpContribution}
                min={0}
                max={play.max}
                onCommit={(hbpContribution) => update({ hbpContribution })}
              />
              <NumberField
                id="hbpWithdraw"
                label={t("withdraw")}
                value={stored.hbpWithdraw}
                placeholder={resolved.hbpWithdraw}
                min={0}
                max={play.max}
                onCommit={(hbpWithdraw) => update({ hbpWithdraw })}
              />
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

        {section("rules", "caution", t("step3", { d: play.ruleDays }), "", t("rulesWhy"), (
          <>
            {step(t("step1"), t("step1Body"))}
            {step(t("step2"), t("step2Body"))}
            {step(t("step3", { d: play.ruleDays }), t("step3Body", { d: play.ruleDays }), t("step3Warn"))}
            {step(t("step4"), t("step4Body", { cap: fmt(play.max) }))}
            {step(t("step5"), t("step5Body", { n: play.repayYears, y: play.repayYears }))}
            <p className="pt-3 text-[12.5px] text-ink3">
              {t("ruleDaysNote", { d: play.ruleDays })}
            </p>
          </>
        ))}

        {section(
          "repayment",
          play.withdraw > 0 ? "caution" : "none",
          `${fmt(play.repayAnnual)} ${t("repayPerYear", { y: play.repayYears })}`,
          fmt(play.withdraw),
          t("repaymentWhy"),
          <>
            <p className="pb-2 text-[12.5px] text-ink3">
              {t("graceNote", { y: play.graceYears })}
            </p>
            {play.schedule.map((row) => (
              <PanelRow
                key={row.year}
                label={t("year", { y: row.year })}
                value={`${fmt(row.repay)} · ${t("balanceLeft")} ${fmt(row.balance)}`}
              />
            ))}
          </>,
        )}

        {section(
          "risk",
          play.withdraw > 0 ? "blocked" : "none",
          t("inclusionIfMissed"),
          fmt(play.inclusionIfMissed),
          t("riskWhy"),
          <>
            <PanelRow label={t("repaySchedule")} value={fmt(play.repayAnnual)} />
            <PanelRow
              label={t("marginal")}
              value={pct(rate * 100, 1)}
              provenance={<Provenance kind="rule" />}
            />
            <PanelRow label={t("taxOnMissed")} value={fmt(play.inclusionIfMissed)} strong />
            {/*
              No verdict. The reference computed one as refund + growth > 0, which
              is true whenever anything is withdrawn -- a verdict that could only
              ever say yes, on the screen whose job is to say whether this is wise.
            */}
            <p className="mt-4 max-w-[620px] text-[13px] leading-[1.65] text-ink2 text-pretty">
              {t("noVerdict")}
            </p>
          </>,
        )}
      </div>

      <FigureFooter jurisdiction={jurisdiction} />
    </ToolMain>
  );
}
