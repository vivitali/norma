"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { buildLines, closingTotal, credits, monthsToSave } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSections } from "@/hooks/use-sections";
import { useSharedState } from "@/hooks/use-shared-state";
import { TOOL_DEFAULTS, TOOL_KEYS } from "@/lib/shared-inputs";
import { isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
import { CLOSING_SECTIONS } from "@/lib/sections";
import { cashState } from "@/lib/closing-view";
import type { Tone } from "@/lib/tone";
import { useMoney } from "@/lib/format";
import { PanelRow, SectionRow } from "@/components/affordability/section-row";
import { LineRows } from "@/components/closing-costs/line-rows";
import { NumberField } from "@/components/number-field";
import { Provenance } from "@/components/provenance";
import { PurchaseInputs } from "@/components/purchase-inputs";
import { AnswerHead, FigureFooter, SectionsHeader, ToolMain } from "@/components/tool-page";

export default function ClosingCostsPage() {
  const t = useTranslations("ClosingCosts");
  const [jurisdiction] = useJurisdiction();
  const [stored, update] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const { isOpen, toggle, expanded, toggleAll } = useSections(CLOSING_SECTIONS);
  const fmt = useMoney();

  const resolved = useMemo(
    () => resolveInputs(stored, jurisdiction, federal),
    [stored, jurisdiction],
  );
  const lines = useMemo(
    () => buildLines(jurisdiction, federal, resolved),
    [jurisdiction, resolved],
  );
  const credit = useMemo(
    () => credits(jurisdiction, federal, resolved, lines.gov),
    [jurisdiction, resolved, lines.gov],
  );
  const total = useMemo(
    () => closingTotal(jurisdiction, federal, resolved),
    [jurisdiction, resolved],
  );

  const cash = cashState({ net: total.net, funds: resolved.funds });
  const creditsAtClosing = total.creditsAtClosing;
  const later = credit.later.reduce((sum, c) => sum + c.amount, 0);

  const gap = resolved.funds === null ? null : resolved.funds - total.net;
  // One implementation, in the engine. This page used to compute it a third way
  // and return null where the engine returns 0, so a reader who could already
  // close and a reader who never gave a saving rate both saw the same em-dash.
  const months = monthsToSave(gap, resolved.save);

  const section = (
    id: string,
    labelKey: string,
    tone: Tone,
    line: string,
    figure: string,
    why: string,
    body: ReactNode,
  ) => (
    <SectionRow
      key={id}
      id={id}
      name={t(labelKey)}
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

  const def = (id: string) => CLOSING_SECTIONS.find((s) => s.id === id)!.labelKey;
  const items = (n: number) => t("items", { n });

  return (
    <ToolMain>
      <AnswerHead
        eyebrow={t("title")}
        figure={fmt(total.cash)}
        pulseKey={jurisdiction.id}
        head={t("cashTotal")}
        sub={t("separateNote")}
        tag={isPersonalised(stored) ? t("tagYours") : t("tagTypical")}
        stats={[
          { label: t("downPaymentRow"), value: fmt(total.fin.down) },
          { label: t("closingCosts"), value: fmt(total.total), mark: "rule" },
          ...(creditsAtClosing > 0
            ? [{ label: t("grpAtClosing"), value: `− ${fmt(creditsAtClosing)}`, mark: "rule" as const }]
            : []),
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
          "government",
          def("government"),
          "none",
          items(lines.gov.length),
          fmt(lines.gov.reduce((s, l) => s + l.amount, 0)),
          t("govWhy"),
          <>
            <LineRows items={lines.gov} namespace="ClosingCosts" />
            {lines.gov.some((l) => l.cashOnly) ? (
              <p className="mt-3 max-w-[620px] text-[12.5px] leading-[1.6] text-ink3 text-pretty">
                {t("premiumTaxWhy")}
              </p>
            ) : null}
          </>,
        )}

        {section(
          "professional",
          def("professional"),
          "none",
          items(lines.pro.length),
          fmt(lines.pro.reduce((s, l) => s + l.amount, 0)),
          t("proWhy"),
          <LineRows items={lines.pro} namespace="ClosingCosts" />,
        )}

        {section(
          "adjustments",
          def("adjustments"),
          "none",
          items(lines.adj.length),
          fmt(lines.adj.reduce((s, l) => s + l.amount, 0)),
          t("adjWhy"),
          <LineRows items={lines.adj} namespace="ClosingCosts" />,
        )}

        {section(
          "credits",
          def("credits"),
          creditsAtClosing > 0 ? "pass" : "none",
          creditsAtClosing > 0 ? t("creditsSub") : later > 0 ? t("noCreditLater") : t("noCreditAtAll"),
          // No closing-day credit is an absence, not a value. An em-dash read
          // as a figure that failed to compute, and "$0" would assert a credit
          // exists here and happens to be nil -- the same false claim this
          // page's line items refuse to make. The line beside it says which of
          // "arrives later" or "does not exist here" is true.
          creditsAtClosing > 0 ? `− ${fmt(creditsAtClosing)}` : "",
          t("creditsWhy"),
          <>
            {/* Timing is the point of this section, so the two groups are never merged. */}
            <p className="eyebrow pb-1 text-ink3">{t("grpAtClosingWhen")}</p>
            {credit.atClosing.map((c) => (
              <div key={c.key}>
                <PanelRow
                  label={t(c.key)}
                  value={c.amount > 0 ? `− ${fmt(c.amount)}` : "—"}
                  provenance={<Provenance kind="rule" />}
                />
                <p className="pt-1 text-[11.5px] text-ink3">
                  {c.st === "applied"
                    ? t("rebApplied")
                    : c.st === "capped"
                      ? `${t("rebCapped")} ${c.cap !== undefined ? fmt(c.cap) : t("rebPartial")}`
                      : c.st === "phasedOut"
                        ? t("rebPhaseWhy")
                        : c.st === "ftbOnly"
                          ? t("turnOnFtb")
                          : t("rebNone")}
                </p>
              </div>
            ))}
            {credit.later.length > 0 ? (
              <>
                <p className="eyebrow pt-4 pb-1 text-ink3">{t("grpLater")}</p>
                {credit.later.map((c) => (
                  <div key={c.key}>
                    <PanelRow
                      label={t(c.key)}
                      value={`− ${fmt(c.amount)}`}
                      provenance={<Provenance kind="rule" />}
                    />
                    {c.ex ? <p className="pt-1 text-[12px] text-ink3">{t(c.ex)}</p> : null}
                  </div>
                ))}
                <p className="mt-2 max-w-[620px] text-[12.5px] leading-[1.6] text-caution text-pretty">
                  {t("grpLaterWhen")}
                </p>
              </>
            ) : null}
          </>,
        )}

        {section(
          "cash",
          def("cash"),
          cash === "pass" ? "pass" : cash === "caution" ? "caution" : cash === "blocked" ? "blocked" : "none",
          cash === "unanswered"
            ? t("cashCheckSub")
            : cash === "pass"
              ? t("passNote")
              : cash === "caution"
                ? t("tightNote")
                : t("shortNote"),
          cash === "unanswered"
            ? fmt(total.net)
            : `${fmt(Math.abs(gap!))} ${cash === "blocked" ? t("stShort") : cash === "caution" ? t("stTight") : t("stPass")}`,
          t("cashWhy"),
          <>
            <PanelRow label={t("downPaymentRow")} value={fmt(total.fin.down)} />
            <PanelRow label={t("closingCosts")} value={fmt(total.total)} />
            {creditsAtClosing > 0 ? (
              <PanelRow label={t("grpAtClosing")} value={`− ${fmt(creditsAtClosing)}`} />
            ) : null}
            <PanelRow label={t("netCash")} value={fmt(total.net)} strong />
            <PanelRow
              label={t("available")}
              value={resolved.funds === null ? "—" : fmt(resolved.funds)}
            />
            <PanelRow
              label={t("monthsToClose")}
              value={months === null ? "—" : String(months)}
              strong
            />
            {months === 0 ? <p className="pt-1 text-[12.5px] text-pass">{t("passNote")}</p> : null}
            {gap !== null && gap < 0 && months === null ? (
              <p className="mt-2 text-[12.5px] text-ink3">{t("noSaveRate")}</p>
            ) : null}
            <div className="mt-4 flex max-w-[420px] flex-col gap-3 rounded-lg border border-acbr bg-acbg p-3">
              {cash === "unanswered" ? (
                <p className="text-[13px] leading-[1.5] text-ink2 text-pretty">{t("cashUnanswered")}</p>
              ) : null}
              <NumberField
                id="funds"
                label={t("available")}
                value={stored.funds}
                min={0}
                onCommit={(funds) => update({ funds })}
              />
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

      <section aria-labelledby="cc-inputs" className="mt-8 flex flex-col gap-3">
        <h2 id="cc-inputs" className="text-[13px] font-semibold">
          {t("subtitle")}
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
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
            <p className="micro text-ink3">{t("mortgageAmount")}</p>
            <p className="text-[22px] font-semibold tracking-[-0.02em]">{fmt(total.fin.loan)}</p>
            <p className="text-[12.5px] leading-[1.55] text-ink3 text-pretty">
              {total.fin.insured ? t("insuredNote") : t("uninsuredNote")}
            </p>
            {total.fin.premium > 0 ? (
              <PanelRow
                label={`${t("cmhcPremium")} · ${t("addedToLoan")}`}
                value={fmt(total.fin.premium)}
                provenance={<Provenance kind="rule" />}
              />
            ) : null}
          </div>
        </div>
      </section>

      <FigureFooter jurisdiction={jurisdiction} />
    </ToolMain>
  );
}
