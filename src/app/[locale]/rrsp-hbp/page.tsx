"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { hbpPlay } from "@/domain/engine";
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
import {
  AnswerHead,
  FigureFooter,
  NoteLine,
  PendingFigures,
  SectionsHeader,
  ToolMain,
} from "@/components/tool-page";

export default function RrspHbpPage() {
  const t = useTranslations("RrspHbp");
  const [jurisdiction] = useJurisdiction();
  const [stored, update, hydrated] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const { isOpen, toggle, expanded, toggleAll } = useSections(
    RRSP_HBP_SECTIONS,
    // The refund is why anyone does this at all, and it is the only figure here
    // that is unambiguously a gain.
    "refund",
  );
  const fmt = useMoney();
  const pct = usePercent();

  const resolved = useMemo(
    () => resolveInputs(stored, jurisdiction, federal),
    [stored, jurisdiction],
  );
  /*
   * Income and province, not a pre-computed rate.
   *
   * The page used to compute `marginalRate()` here and hand it in, which priced
   * the whole deduction at the rate on the reader's LAST dollar — a $60,000
   * contribution refunded at the top bracket. `hbpPlay` now integrates the
   * bracket table itself (`taxOnBand`) and returns the marginal rate it still
   * needs for `taxIfMissed`, so the rate this screen displays comes back out of
   * the same call rather than being computed twice in two places.
   */
  const play = useMemo(
    () =>
      hbpPlay(federal, {
        contribution: resolved.hbpContribution,
        income: resolved.taxIncome,
        prov: jurisdiction.prov,
        withdrawAmount: resolved.hbpWithdraw,
      }),
    [resolved.hbpContribution, resolved.hbpWithdraw, resolved.taxIncome, jurisdiction.prov],
  );
  const rate = play.marginalRate;

  /*
   * The two states that both used to render `noWithdraw`, which told a reader
   * who had just typed $60,000 into the withdrawal field to enter a withdrawal
   * amount. `hbpPlay` models "contribute, then withdraw what you contributed",
   * so a withdrawal against an RRSP balance that is already there — contribution
   * left at 0 — is clamped to nothing and the whole screen collapses to $0.
   * Only the first of these is genuinely an empty field.
   */
  const emptyLine = play.withdrawRequested > 0 ? t("noContribution") : t("noWithdraw");

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
      {/*
        One mechanism for "the stored inputs have not landed yet", shared by every
        tool page — see `PendingFigures` in tool-page.tsx. It holds the derived
        figures and the "whose figures are these" badge together, keeps the
        prerendered answer in the HTML, and reserves the hero's box so nothing
        moves when the real value arrives.
      */}
      <PendingFigures pending={!hydrated}>
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
          "refund",
          play.withdraw > 0 ? "pass" : "none",
          // The two inputs the refund is the product of, rather than the word
          // "refund" printed beside a section already called "The refund".
          play.withdraw > 0
            ? `${t("contribution")} ${fmt(play.contribution)} · ${t("marginal")} ${pct(rate * 100, 1)}`
            : emptyLine,
          fmt(play.refund),
          t("refundWhy"),
          <>
            <PanelRow label={t("contribution")} value={fmt(play.contribution)} />
            <PanelRow
              label={t("federalMax")}
              value={fmt(play.max)}
              provenance={<Provenance kind="rule" />}
            />
            {/*
              `federal.rrspCap` — conf high, and until now read by no screen at
              all. It belongs next to the HBP maximum because the contribution
              field above defaults to that maximum, $60,000, which is 78% above
              the most anyone's room can grow in a year: the page was inviting a
              contribution most readers have no room for while `step1Body` said
              "Any RRSP room you have works".

              The note names the DOCUMENT rather than a number, deliberately.
              Room is 18% of earned income plus carry-forward, and neither the
              18% nor the $2,000 over-contribution cushion has a provenance
              entry in src/domain — so neither may travel. The Notice of
              Assessment is where the reader's own figure actually is.
            */}
            <PanelRow
              label={t("rrspCap")}
              value={fmt(federal.rrspCap)}
              provenance={<Provenance kind="rule" />}
            />
            <NoteLine>{t("rrspRoomNote")}</NoteLine>
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
              {/*
                Attached to the field it is about, in the caution tone, because
                the app applied something the reader did not ask for: the model
                contributes first and withdraws what was contributed, so a
                withdrawal entered against an RRSP balance that already exists
                is cut back to the contribution — to $0 when there is none. The
                page used to say nothing at all and simply print $0 everywhere,
                which reads as an arithmetic answer rather than a clamp.
              */}
              {play.clampedByContribution ? (
                <NoteLine tone="caution" tight>
                  {t("clampedByContribution", { c: fmt(play.contribution) })}
                </NoteLine>
              ) : null}
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
            {step(t("step5"), t("step5Body", { y: play.repayYears }))}
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
            <p className="pb-1 text-[12.5px] text-ink3">
              {t("graceNote", { y: play.graceYears })}
            </p>
            {/*
              `graceYears` is 2 for everyone here, and federal.ts records that
              CRA defers repayment three further years for a first withdrawal
              made 2022-01-01 through 2025-12-31 — a large share of the people
              reading this. Disclosed rather than computed: making the schedule a
              function of the withdrawal year would cost a new persisted input,
              and this note carries the exception at a fraction of that price.

              NOT a `NoteLine`, and a review asked for one. `NoteLine` is 11.5px;
              this is the second half of a pair with `graceNote` directly above it
              at 12.5px, and the two are one disclosure split across two sentences.
              Demoting the second half alone would introduce the size mismatch the
              tier cleanup exists to remove. Both move together or neither does.

              The window itself stays typed into the copy for want of anything to
              bind to: it lives only as prose inside `hbp.graceYears`' provenance
              note, not as a field. When it becomes one, this takes it as an ICU
              argument the way `Inputs.amortCapped` now takes the deposit threshold.
            */}
            <p className="max-w-[620px] pb-2 text-[12.5px] leading-[1.5] text-ink3 text-pretty">
              {t("graceCohortNote")}
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
          // `inclusionIfMissed` the COPY KEY reads "Added to your income for
          // each year missed"; `play.taxIfMissed` the ENGINE FIELD is the tax on
          // that income (repayAnnual × marginal rate). As the line beside that
          // figure it mislabelled it by a factor of the marginal rate. The
          // amount added to income is the annual repayment, so it is that
          // number the phrase now sits next to.
          play.withdraw > 0
            ? `${t("inclusionIfMissed")} ${fmt(play.repayAnnual)} · ${t("marginal")} ${pct(rate * 100, 1)}`
            : emptyLine,
          fmt(play.taxIfMissed),
          t("riskWhy"),
          <>
            <PanelRow label={t("repaySchedule")} value={fmt(play.repayAnnual)} />
            <PanelRow
              label={t("marginal")}
              value={pct(rate * 100, 1)}
              provenance={<Provenance kind="rule" />}
            />
            <PanelRow label={t("taxOnMissed")} value={fmt(play.taxIfMissed)} strong />
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
