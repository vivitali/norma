"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import type { AffordabilityResult } from "@/domain/engine";
import {
  approvalState,
  cashState,
  checkIcon,
  checkTone,
  comfortState,
  type CheckState,
} from "@/lib/affordability-view";
import type { ResolvedInputs } from "@/lib/resolve-inputs";
import type { AffordabilityFormState } from "@/lib/shared-inputs";
import { useMoney, usePercent } from "@/lib/format";
import { DisclosureSection } from "@/components/disclosure-section";
import { NumberField } from "@/components/number-field";

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-0.5 text-[11.5px]">
      <span className={strong ? "font-semibold text-foreground" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`figure ${strong ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}

/**
 * An input the owning check asks for in place, because that check cannot finish
 * its sentence without it. Requirement 2 of the brief made concrete: name the
 * single field you want, inline, in context — rather than gating the screen.
 */
function InlineAsk({ prompt, children }: { prompt: string; children: ReactNode }) {
  return (
    <div className="mt-2 flex flex-col gap-2 rounded-md border border-accent-border bg-accent-surface p-2">
      <p className="text-[11.5px] text-muted-foreground">{prompt}</p>
      {children}
    </div>
  );
}

export interface ChecksProps {
  result: AffordabilityResult;
  stored: AffordabilityFormState;
  resolved: ResolvedInputs;
  update: (patch: Partial<AffordabilityFormState>) => void;
  isOpen: (id: string) => boolean;
  onToggle: (id: string, currentlyOpen: boolean) => void;
}

export function Checks({ result, stored, resolved, update, isOpen, onToggle }: ChecksProps) {
  const t = useTranslations("Affordability");
  const fmt = useMoney();
  const pct = usePercent();

  const word = (state: CheckState) =>
    state === "pass" ? t("wPass") : state === "blocked" ? t("wBlocked") : t("wCaution");

  const approval = approvalState(result);
  const comfort = comfortState(result);
  const cash = cashState(result);

  const bindingSentence = result.tdsBinds ? t("ckTds") : t("ckGds");

  const comfortSummary =
    result.comfortGap <= 0
      ? `${fmt(-result.comfortGap)} ${t("headroom")}`
      : `${fmt(result.comfortGap)} ${t("over")}`;

  // Unanswered still shows a real number — the cash required is fully computable
  // from defaults. Nothing on this screen is gated behind an input.
  const cashSummary =
    result.cashGap === null
      ? fmt(result.cc.net)
      : result.cashGap >= 0
        ? `${fmt(result.cashGap)} ${t("headroom")}`
        : `${fmt(-result.cashGap)} ${t("short")}`;

  const check = (id: string, state: CheckState, label: string, why: string, summary: string, rows: ReactNode) => (
    <DisclosureSection
      id={id}
      label={label}
      stateWord={word(state)}
      icon={checkIcon(state)}
      tone={checkTone(state)}
      summary={summary}
      why={why}
      open={isOpen(id)}
      onToggle={() => onToggle(id, isOpen(id))}
    >
      {rows}
    </DisclosureSection>
  );

  return (
    <section aria-labelledby="checks" className="flex flex-col gap-2">
      <div>
        <h2 id="checks" tabIndex={-1} className="text-[13px] font-semibold">
          {t("ckTitle")}
        </h2>
        <p className="text-[11.5px] text-muted-foreground">{t("ckSub")}</p>
      </div>

      {check(
        "check-approval",
        approval,
        t("ckApproval"),
        `${approval === "pass" ? t("ckApOk") : t("ckApNo")} ${bindingSentence}`,
        fmt(result.ceiling),
        <>
          <Row label={t("mQualInc")} value={fmt(result.qualIncome)} />
          <Row label={t("mStressRate")} value={pct(result.qualRate, 2)} />
          <Row label={t("mGdsAllow")} value={fmt(result.gdsAllow)} />
          <Row label={t("mTdsAllow")} value={fmt(result.tdsAllow)} />
          <Row
            label={t("mBinding")}
            value={`${fmt(result.binding)} · ${result.tdsBinds ? "TDS" : "GDS"}`}
            strong
          />
          <Row label={t("mMaxPrice")} value={fmt(result.ceiling)} strong />
        </>,
      )}

      {check(
        "check-comfort",
        comfort,
        t("ckComfort"),
        comfort === "pass" ? t("ckCfOk") : t("ckCfNo"),
        comfortSummary,
        <>
          {/* The monthly breakdown that used to be a standalone card: same
              figures, in the place that explains them. */}
          <Row label={t("mPi")} value={fmt(result.monthly.pi)} />
          <Row label={t("mPropTax")} value={fmt(result.monthly.propTax)} />
          <Row label={t("cInsurance")} value={fmt(result.monthly.insurance)} />
          <Row label={t("cUtilities")} value={fmt(result.monthly.utilities)} />
          <Row label={t("cCondoFee")} value={fmt(result.monthly.condoFee)} />
          <Row label={t("mMaint")} value={fmt(result.monthly.maintenance)} />
          <Row label={t("mTotal")} value={fmt(result.monthly.total)} strong />
          <Row label={t("mStated")} value={fmt(resolved.comfortCeiling)} strong />
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

      {check(
        "check-cash",
        cash,
        t("ckCash"),
        cash === "unanswered" ? t("separateNote") : cash === "blocked" ? t("ckCsNo") : t("ckCsOk"),
        cashSummary,
        <>
          <Row label={t("downPaymentRow")} value={fmt(result.cc.fin.down)} />
          <Row label={t("closingCosts")} value={fmt(result.cc.total)} />
          <Row label={t("grpAtClosing")} value={`− ${fmt(result.cc.creditsAtClosing)}`} />
          <Row label={t("netCash")} value={fmt(result.cc.net)} strong />
          <Row label={t("cFunds")} value={resolved.funds === null ? "—" : fmt(resolved.funds)} />
          <Row
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
    </section>
  );
}
