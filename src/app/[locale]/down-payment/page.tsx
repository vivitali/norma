"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { closingTotal, glidePath, minDown, waterfall, type SourceKey } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSections } from "@/hooks/use-sections";
import { useSharedState } from "@/hooks/use-shared-state";
import { TOOL_DEFAULTS, TOOL_KEYS, type ToolFormState } from "@/lib/shared-inputs";
import { anySourceGiven, isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
import { DOWN_PAYMENT_SECTIONS } from "@/lib/sections";
import type { Tone } from "@/lib/tone";
import { useMoney, usePercent } from "@/lib/format";
import { PanelRow, SectionRow } from "@/components/affordability/section-row";
import { GlideChart } from "@/components/down-payment/glide-chart";
import { NumberField } from "@/components/number-field";
import { Provenance } from "@/components/provenance";
import { PurchaseInputs } from "@/components/purchase-inputs";
import { AnswerHead, FigureFooter, SectionsHeader, ToolMain } from "@/components/tool-page";

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
  const [jurisdiction] = useJurisdiction();
  const [stored, update] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const { isOpen, toggle, expanded, toggleAll } = useSections(DOWN_PAYMENT_SECTIONS);
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

  const legal = minDown(resolved.price);
  // The REQUESTED percentage, deliberately: resolved.dpPct already has the floor
  // applied, so comparing it against the floor could never report a raise.
  const chosen = (resolved.price * resolved.dpPctRequested) / 100;

  return (
    <ToolMain>
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
            <PanelRow
              label={t("closingCosts")}
              value={fmt(closing.total)}
              provenance={<Provenance kind="rule" />}
            />
            {closing.creditsAtClosing > 0 ? (
              <PanelRow label={t("grpAtClosing")} value={`− ${fmt(closing.creditsAtClosing)}`} />
            ) : null}
            <PanelRow label={t("netCash")} value={fmt(need)} strong />
          </>,
        )}

        {section(
          "waterfall",
          !described ? "none" : funded ? "pass" : "blocked",
          t("cheapest"),
          described ? fmt(flow.drawnTotal) : "—",
          t("waterfallWhy"),
          <>
            {flow.rows.map((row) => (
              <div key={row.key} className="border-b border-hairline pb-2">
                <PanelRow
                  label={`${t(SOURCE_LABEL[row.key])} · ${t(row.cost === "free" ? "free" : row.cost === "strings" ? "strings" : "costs")}`}
                  value={row.drawn > 0 ? fmt(row.drawn) : t("untouched")}
                  strong={row.drawn > 0}
                />
                <p className="pt-1 text-[12px] leading-[1.55] text-ink3 text-pretty">
                  {t(`${SOURCE_LABEL[row.key]}Why`, { y: federal.hbp.repayYears })}
                </p>
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
                <div className="flex gap-4 pt-1 text-[11.5px] text-ink3">
                  <span>
                    {t("left")}: {fmt(row.left)}
                  </span>
                  {row.exhausted ? <span>{t("exhausted")}</span> : null}
                </div>
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
          flow.taxTotal > 0 || obligations > 0 ? t("costs") : t("noCostAtAll"),
          flow.taxTotal > 0 ? fmt(flow.taxTotal) : "—",
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
          described && flow.shortfall > 0.5 ? fmt(flow.shortfall) : "—",
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
      </div>

      <section aria-labelledby="dp-inputs" className="mt-8 flex flex-col gap-3">
        <h2 id="dp-inputs" className="text-[13px] font-semibold">
          {t("balances")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <PurchaseInputs
            price={stored.price}
            pricePlaceholder={resolved.price}
            dpPct={stored.dpPct}
            dpPctEffective={resolved.dpPct}
            belowMinimum={resolved.belowMinimum}
            amortYears={stored.amortYears}
            ptype={stored.ptype}
            ftb={stored.ftb}
            elsewhere={stored.elsewhere}
            jurisdiction={jurisdiction}
            onChange={update}
          />
        </div>
      </section>

      <FigureFooter jurisdiction={jurisdiction} />
    </ToolMain>
  );
}
