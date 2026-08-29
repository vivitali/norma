"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
import { federal } from "@/domain/federal";
import type { Jurisdiction } from "@/domain/types";
import { Provenance, type ProvenanceKind } from "@/components/provenance";
import { cn } from "@/lib/utils";

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

/**
 * One quiet line under the thing it is about.
 *
 * The `ex_` treatment, extracted rather than invented: the same micro paragraph
 * already written by hand at eight call sites across five files — the price ask,
 * the minimum-down caution, the Toronto toggle's explainer, Rent vs Buy's lever
 * note. It is NOT a second `ImpactRow`: DESIGN.md §5 reserves the 3px accent for
 * one singular signal, and replicating that mark beside every input would spend
 * it. This is the quiet version — a sentence saying what the app did on the
 * reader's behalf, at the size §3 calls Micro, in the flow, boxed by nothing.
 *
 * Two tones only, because §8 has no third state for a note: `quiet` is `--ink3`
 * commentary, `caution` is `--caut` and means the app applied something the
 * reader did not ask for or cannot have.
 *
 * `caution` is 11.5px here, not the 11px two of these call sites carried.
 * DESIGN.md §3 records the 10.5-11px fine-print tier and says outright that if
 * it should not exist the fix is to raise those call sites to 11.5px rather than
 * leave the spec and the code disagreeing. Raising them is what this does.
 */
export function NoteLine({
  tone = "quiet",
  /** Pulls the note up against the control it belongs to, inside a gap-3 stack. */
  tight,
  children,
}: {
  tone?: "quiet" | "caution";
  tight?: boolean;
  children: ReactNode;
}) {
  return (
    <p
      data-slot="note"
      className={cn(
        "text-[11.5px] leading-[1.5] text-pretty",
        tone === "caution" ? "text-caution" : "text-ink3",
        tight && "-mt-1",
      )}
    >
      {children}
    </p>
  );
}

/**
 * The head's derived figures, held back until the stored inputs have landed.
 *
 * ONE mechanism, because four shipped in one branch and two of them were wrong.
 * `useSharedState` asks pages to gate anything derived on `hydrated` — a returning
 * reader must not read a dollar amount that is about to change — and four pages each
 * answered it differently: a re-keyed pulse, a gated tag, an `invisible` wrapper, and
 * a non-breaking space substituted for every figure.
 *
 * The last one is the one that had to go. Every route here is PRERENDERED, and
 * `hydrated` is false in the prerendered HTML, so substituting a placeholder ships the
 * static document with no answer in it — on two `INDEXABLE_ROUTES`, for the benefit of
 * every machine that reads the document rather than painting it. `"\u00A0"` is also
 * truthy, so `tag` rendered as an empty bordered pill, which is DESIGN.md §5.3's
 * "reads as a rendering fault" by another route.
 *
 * `visibility: hidden` is what threads both needles: the figure keeps its box, so
 * nothing moves when the real value arrives, and it keeps its TEXT, so the prerendered
 * answer is still in the HTML. The cost, stated because it is real: the static paint
 * shows a blank where the hero will be until hydration, including for a first-time
 * reader whose figure was never going to change. The real fix is upstream — reading
 * storage in a layout effect inside `useSharedState` would land the value before the
 * first paint — and until then this is the honest trade, made once.
 */
export function PendingFigures({
  pending,
  children,
}: {
  pending: boolean;
  children: ReactNode;
}) {
  return (
    <div
      className={
        pending
          ? "[&_[data-slot=answer-figure]]:invisible [&_[data-slot=answer-stat]]:invisible [&_[data-slot=answer-tag]]:invisible"
          : undefined
      }
    >
      {children}
    </div>
  );
}

/**
 * A field the page asks for in place, boxed in the accent so the reader can see the
 * sentence above it is waiting on this one answer.
 *
 * DESIGN.md §5.3's endorsed placement — the field asks where the sentence that needs it
 * is — extracted rather than invented: two route modules had grown a private component
 * of this name with the same class string, differing only in whether the prompt was a
 * prop or the children. `prompt` is optional, which is the union of the two: with it,
 * the question and the field; without it, a sentence that IS the ask.
 */
export function InlineAsk({ prompt, children }: { prompt?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "mt-4 max-w-[420px] rounded-lg border border-acbr bg-acbg p-3",
        prompt === undefined && "text-[13px] leading-[1.5] text-ink2 text-pretty",
        prompt !== undefined && "flex flex-col gap-2",
      )}
    >
      {prompt === undefined ? null : (
        <p className="text-[13px] leading-[1.5] text-ink2 text-pretty">{prompt}</p>
      )}
      {children}
    </div>
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
  /**
   * Omitted when the page HAS no answer — a jurisdiction with no published
   * benchmark price, where every figure the page would print derives from a zero
   * that is arithmetic rather than a price. The sentence then takes the hero's
   * place at its own larger size, because the ask IS the page's content in that
   * state, and no placeholder figure stands in for it: a "$0" or a bare em-dash
   * at 72px reads as a rendering fault, and the one thing a reader must not take
   * from this screen is that we know something we do not.
   */
  figure,
  /** Changing this replays the pulse — used to acknowledge a jurisdiction switch. */
  pulseKey,
  head,
  sub,
  tag,
  stats,
}: {
  eyebrow: string;
  figure?: string;
  pulseKey?: string;
  head: string;
  sub?: string;
  tag?: string;
  stats?: readonly HeadStat[];
}) {
  return (
    <div className="pt-9 sm:pt-11">
      {/*
       * The h1 is the page NAME, not the answer figure.
       *
       * Both were candidates and they are not equivalent. A screen-reader user
       * who lands here and jumps by heading, or who asks for the document
       * title, wants "Affordability" — a bare "$398,398" as the only h1 names
       * nothing, sorts into the headings list as a number, and is already read
       * out immediately after this in document order along with the sentence
       * that explains it. It also keeps the seven tool pages consistent with
       * Home, Sources and 404, whose h1 is likewise the page name.
       *
       * Visually identical to the <div> it replaces: Tailwind preflight resets
       * h1 font-size and weight to inherit and zeroes its margin (@layer base),
       * and .eyebrow (@layer components) then sets the same 11px/600/0.1em/
       * uppercase it always did — measured in the browser at 11px / 600 /
       * 1.1px / uppercase / margin 0 0 20px, the div's own computed values.
       */}
      <h1 className="eyebrow mb-5 text-ac">{eyebrow}</h1>
      <div className="flex flex-wrap items-end gap-8 sm:gap-10">
        <div className="min-w-0 flex-1 sm:min-w-[420px]">
          {figure === undefined ? null : (
            <div
              key={pulseKey}
              data-slot="answer-figure"
              className="v2-pulse text-[52px] leading-none font-bold tracking-[-0.045em] text-ac sm:text-[72px]"
            >
              {figure}
            </div>
          )}
          <p
            className={
              figure === undefined
                ? "max-w-[560px] text-[24px] leading-[1.3] font-semibold tracking-[-0.02em] text-pretty sm:text-[28px]"
                : "mt-4 max-w-[560px] text-[17px] leading-[1.45] font-medium tracking-[-0.01em] text-pretty sm:text-[19px]"
            }
          >
            {head}
          </p>
          {sub ? (
            <p className="mt-2 max-w-[560px] text-[14.5px] leading-[1.6] text-ink2 text-pretty">{sub}</p>
          ) : null}
          {tag ? (
            <p
              data-slot="answer-tag"
              className="eyebrow mt-4 inline-block rounded-full border border-acbr px-2.5 py-1 text-ac"
            >
              {tag}
            </p>
          ) : null}
        </div>
        {/*
         * basis-full below sm, flex-none from sm.
         *
         * flex-none alone meant flex-shrink: 0 at EVERY width, so this column
         * was sized to its max-content and could not give any of it back: at
         * 320px a stat whose value and note sat on one un-shrinkable baseline
         * row pushed the page wider than the viewport. Taking a full row of its
         * own below sm is what it already did visually — flex-wrap put it there
         * — it just did it without being allowed to fit.
         */}
        {stats && stats.length > 0 ? (
          <div className="flex min-w-0 basis-full flex-col gap-[18px] sm:basis-auto sm:min-w-[250px] sm:flex-none">
            {stats.map((stat) => (
              <div key={stat.label} className="min-w-0">
                <div className="mb-[5px] text-[12.5px] text-ink3">
                  {stat.label}
                  {stat.mark ? <Provenance kind={stat.mark} /> : null}
                </div>
                {/* The note wraps under the value rather than off the screen. */}
                <div data-slot="answer-stat" className="flex flex-wrap items-baseline gap-x-2.5">
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
      {/*
       * The pill is 32px tall by design and stays 32px tall. Below sm an
       * invisible ::after centred on it takes the hit area to the 44px floor
       * (DESIGN.md §7) without moving a pixel — growing the pill itself would
       * have meant either a 44px pill, which is not the design, or padding that
       * breaks the baseline alignment of the row it sits in.
       */}
      <button
        type="button"
        onClick={onToggleAll}
        aria-expanded={expanded}
        className="relative rounded-full border border-acbr px-3.5 py-1.5 text-[13px] font-medium text-ac after:absolute after:inset-x-0 after:top-1/2 after:h-11 after:-translate-y-1/2 hover:bg-acbg sm:after:hidden"
      >
        {expanded ? collapseLabel : expandLabel}
      </button>
    </div>
  );
}

/**
 * The figure disclosure, in its agreed wording.
 *
 * Every screen that renders a jurisdiction figure carries this, which is why it
 * lives in one component reading one namespace rather than being retyped per
 * page. Its wording is not a design decision to be tuned per screen — but it IS
 * a claim about the dataset, and the dataset moved: most figures in src/domain/
 * now cite a dated published document, some are disclosed modelling
 * assumptions, and a handful are shown as unknown because nobody publishes
 * them. A blanket "placeholder figures" line buried the verified ones and
 * trained the reader to discount all three the same way.
 *
 * `children` is the page's own per-figure provenance, which only the page knows.
 * Affordability displays exactly one jurisdiction figure — the property tax rate
 * — and names its source here; a page that displays a dozen of them discloses
 * per line instead.
 */
export function FigureFooter({
  jurisdiction,
  children,
}: {
  jurisdiction: Jurisdiction;
  children?: ReactNode;
}) {
  const t = useTranslations("Disclosure");
  return (
    <div className="mt-10 border-t border-border pt-4 text-[11.5px] text-ink3">
      <p>{t("unverifiedFlag")}</p>
      <p>
        {t("lastVerified")} {federal.verified}
      </p>
      {children}
      {!jurisdiction.cityData ? <p>{t("noCityData")}</p> : null}
    </div>
  );
}
