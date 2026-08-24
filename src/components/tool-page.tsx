"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { federal } from "@/domain/federal";
import type { Jurisdiction } from "@/domain/types";
import { Provenance, type ProvenanceKind } from "@/components/provenance";

/**
 * The chrome every tool page shares.
 *
 * Extracted from the Affordability rebuild rather than designed ahead of it: the
 * markup here IS that screen's markup, so the six pages that follow inherit a
 * layout that has already been through a browser and a contrast audit instead of
 * six near-misses that drift apart.
 *
 * Deliberately three small pieces rather than one <ToolPage> taking a dozen
 * props. A page that needs something else between the head and the sections can
 * just put it there.
 */

export function ToolMain({ children }: { children: ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col px-5 pb-16 sm:px-10">
      {children}
    </main>
  );
}

export interface HeadStat {
  label: string;
  value: string;
  /** Short qualifier beside the figure. Empty renders nothing. */
  note?: string;
  mark?: ProvenanceKind;
}

/**
 * Answer first. The figure is the largest thing on the page because it is the
 * thing the reader came for; the sentence under it says what the figure means,
 * and everything else on the screen is available but subordinate.
 */
export function AnswerHead({
  eyebrow,
  figure,
  /** Changing this replays the pulse — used to acknowledge a jurisdiction switch. */
  pulseKey,
  head,
  sub,
  tag,
  stats,
}: {
  eyebrow: string;
  figure: string;
  pulseKey?: string;
  head: string;
  sub?: string;
  tag?: string;
  stats?: readonly HeadStat[];
}) {
  return (
    <div className="pt-9 sm:pt-11">
      <div className="eyebrow mb-5 text-ac">{eyebrow}</div>
      <div className="flex flex-wrap items-end gap-8 sm:gap-10">
        <div className="min-w-0 flex-1 sm:min-w-[420px]">
          <div
            key={pulseKey}
            className="v2-pulse text-[52px] leading-none font-bold tracking-[-0.045em] text-ac sm:text-[72px]"
          >
            {figure}
          </div>
          <p className="mt-4 max-w-[560px] text-[17px] leading-[1.45] font-medium tracking-[-0.01em] text-pretty sm:text-[19px]">
            {head}
          </p>
          {sub ? (
            <p className="mt-2 max-w-[560px] text-[14.5px] leading-[1.6] text-ink2 text-pretty">{sub}</p>
          ) : null}
          {tag ? (
            <p className="eyebrow mt-4 inline-block rounded-full border border-acbr px-2.5 py-1 text-ac">
              {tag}
            </p>
          ) : null}
        </div>
        {stats && stats.length > 0 ? (
          <div className="flex flex-none flex-col gap-[18px] sm:min-w-[250px]">
            {stats.map((stat) => (
              <div key={stat.label}>
                <div className="mb-[5px] text-[12.5px] text-ink3">
                  {stat.label}
                  {stat.mark ? <Provenance kind={stat.mark} /> : null}
                </div>
                <div className="flex items-baseline gap-2.5">
                  <span className="text-[22px] font-semibold tracking-[-0.02em]">{stat.value}</span>
                  {stat.note ? (
                    <span className="text-[12px] leading-[1.35] text-ink3">{stat.note}</span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * The bar above the sections, carrying the one control that reaches all of them.
 * There is no jump rail: Expand all covers what the rail used to.
 */
export function SectionsHeader({
  label,
  expanded,
  onToggleAll,
  expandLabel,
  collapseLabel,
}: {
  label: string;
  expanded: boolean;
  onToggleAll: () => void;
  expandLabel: string;
  collapseLabel: string;
}) {
  return (
    <div className="flex items-baseline gap-3.5 pb-3">
      <span className="eyebrow flex-1 text-ink3">{label}</span>
      <button
        type="button"
        onClick={onToggleAll}
        aria-expanded={expanded}
        className="rounded-full border border-acbr px-3.5 py-1.5 text-[13px] font-medium text-ac hover:bg-acbg"
      >
        {expanded ? collapseLabel : expandLabel}
      </button>
    </div>
  );
}

/**
 * The unverified-figures disclosure, in its agreed wording.
 *
 * Every screen that renders a jurisdiction figure carries this, which is why it
 * lives in one component reading one namespace rather than being retyped per
 * page. Its wording is not a design decision to be tuned per screen: every
 * provincial figure in src/domain/ is a placeholder carried over from the
 * prototype, and this is the sentence that says so.
 */
export function FigureFooter({ jurisdiction }: { jurisdiction: Jurisdiction }) {
  const t = useTranslations("Disclosure");
  return (
    <div className="mt-10 border-t border-border pt-4 text-[11.5px] text-ink3">
      <p>{t("unverifiedFlag")}</p>
      <p>
        {t("lastVerified")} {federal.verified}
      </p>
      {!jurisdiction.cityData ? <p>{t("noCityData")}</p> : null}
    </div>
  );
}
