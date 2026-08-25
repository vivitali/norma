"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useTranslations } from "next-intl";
import { federal } from "@/domain/federal";
import { jurisdictions } from "@/domain/jurisdictions";
import type { Confidence } from "@/domain/types";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSections } from "@/hooks/use-sections";
import { SOURCES_SECTIONS } from "@/lib/sections";
import {
  coverageOf,
  federalGroup,
  groupProvenance,
  weakestGroupId,
  type FigureGroup,
  type SourceEntry,
} from "@/lib/provenance-view";
import { dotClass, type Tone } from "@/lib/tone";
import { SectionRow } from "@/components/affordability/section-row";
import { SectionsHeader } from "@/components/tool-page";
import { cn } from "@/lib/utils";

/** Every confidence, in the order the legend teaches them. */
const SCALE: readonly Confidence[] = ["high", "medium", "low", "assumption", "none"] as const;

/**
 * Message keys per confidence, written out rather than composed from the value.
 *
 * `t(\`conf${capitalise(c)}\`)` would read the same and would be invisible to
 * `messages-coverage.test.ts`, which finds a key by looking for its literal in
 * the source. A key nothing can see is a key nobody maintains.
 */
const CONF_LABEL: Record<Confidence, string> = {
  high: "confHigh",
  medium: "confMedium",
  low: "confLow",
  assumption: "confAssumption",
  none: "confNone",
};

const CONF_MEANING: Record<Confidence, string> = {
  high: "confHighWhat",
  medium: "confMediumWhat",
  low: "confLowWhat",
  assumption: "confAssumptionWhat",
  none: "confNoneWhat",
};

/**
 * A confidence, as a dot and a word.
 *
 * DESIGN.md §8: state is a dot and a colour, never a filled panel with its own
 * border. `assumption` and `none` MUST read differently — a modelling default we
 * chose is not the same fact as a quantity nobody publishes, and the whole
 * provenance design turns on that difference — so they are caution and blocked,
 * with words rather than shades doing the distinguishing.
 */
const CONF_TONE: Record<Confidence, Tone> = {
  high: "pass",
  medium: "pass",
  low: "caution",
  assumption: "caution",
  none: "blocked",
};

function ConfidenceMark({ conf, label }: { conf: Confidence; label: string }) {
  return (
    <span className="inline-flex flex-none items-center gap-1.5 whitespace-nowrap">
      <span aria-hidden="true" className={cn("size-[7px] rounded-full", dotClass(CONF_TONE[conf]))} />
      <span className="micro text-ink2">{label}</span>
    </span>
  );
}

/** The panel body for one group: its source documents, strongest claim last. */
function SourceList({ entries }: { entries: readonly SourceEntry[] }) {
  const t = useTranslations("Sources");
  if (entries.length === 0) {
    return <p className="text-[11.5px] text-ink3">{t("none")}</p>;
  }
  return (
    <ul className="flex max-w-[700px] list-none flex-col">
      {entries.map((entry) => (
        <li key={entry.key} className="border-b border-hairline py-[11px]">
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <ConfidenceMark conf={entry.conf} label={t(CONF_LABEL[entry.conf])} />
            {entry.src ? (
              entry.url ? (
                /*
                 * A plain <a>, not the localised Link: these leave the site for
                 * a publisher's own document, and there is no locale of ours to
                 * carry. rel="noreferrer" travels with target="_blank".
                 */
                <a
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                  className="min-w-0 flex-1 text-[12.5px] leading-[1.5] break-words underline decoration-dotted underline-offset-2 hover:text-ac"
                >
                  {entry.src}
                </a>
              ) : (
                <span className="min-w-0 flex-1 text-[12.5px] leading-[1.5] break-words">
                  {entry.src}
                </span>
              )
            ) : (
              <span className="min-w-0 flex-1 text-[12.5px] leading-[1.5] text-ink3">
                {t("noSource")}
              </span>
            )}
            {entry.asOf ? (
              <span className="text-[10.5px] whitespace-nowrap text-ink3">
                {t("asOfLabel")} {entry.asOf}
              </span>
            ) : null}
          </div>
          {entry.notes.map((note) => (
            <p
              key={note}
              className="mt-1.5 text-[10.5px] leading-[1.65] break-words text-ink3 text-pretty"
            >
              {note}
            </p>
          ))}
        </li>
      ))}
    </ul>
  );
}

/**
 * What makes the per-figure provenance marks meaningful rather than decorative.
 *
 * The jurisdiction lives in client state, so the list is client-rendered inside
 * a server page that owns setRequestLocale — the route itself stays prerendered.
 *
 * The inventory is built FROM `src/domain`'s provenance maps on every render,
 * never from a hand-written list beside them: a curated copy of this data would
 * be wrong the first time a figure was re-verified, and wrong in the direction
 * of claiming more than the records support.
 */
export function SourcesContent() {
  const t = useTranslations("Sources");
  const tDisc = useTranslations("Disclosure");
  const tJur = useTranslations("Jurisdictions");
  const [jurisdiction] = useJurisdiction();

  const coverage = useMemo(
    () => coverageOf(jurisdictions.map((j) => j.provenance), federal.provenance),
    [],
  );
  const groups = useMemo<readonly FigureGroup[]>(
    () => [federalGroup(federal.provenance), ...groupProvenance(jurisdiction.provenance).groups],
    [jurisdiction],
  );
  // Federal is excluded from the choice: it is identical for every reader and it
  // is the longest list. See weakestGroupId.
  const deciding = useMemo(() => weakestGroupId(groups.filter((g) => g.id !== "federal")), [groups]);

  const { isOpen, toggle, expanded, toggleAll } = useSections(SOURCES_SECTIONS, deciding);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-4 sm:p-6">
      <div>
        <h1 className="text-[27px] leading-tight font-semibold tracking-tight">{t("title")}</h1>
        <p className="mt-1 max-w-prose text-[12.5px] text-muted-foreground">{t("subtitle")}</p>
        {/*
          Counted, never asserted. The standing disclosure on every tool page
          claims most figures now name a published source; this is the arithmetic
          that has to hold for that claim to stay true, run on the same records.
        */}
        <p className="mt-3 max-w-prose text-[12.5px] leading-[1.6] text-ink2 text-pretty">
          {t("coverage", { ...coverage })}
        </p>
      </div>

      <div className="flex flex-col gap-4">
        {/* The two anchors the provenance marks link to. */}
        <div id="rule" tabIndex={-1} className="rounded-lg border border-border bg-card p-3">
          <Explainer heading={t("ruleHeading")}>
            <p className="max-w-prose text-[11.5px] text-muted-foreground">{t("ruleBody")}</p>
          </Explainer>
        </div>
        <div id="estimate" tabIndex={-1} className="rounded-lg border border-border bg-card p-3">
          <Explainer heading={t("estimateHeading")}>
            <p className="max-w-prose text-[11.5px] text-muted-foreground">{t("estimateBody")}</p>
          </Explainer>
        </div>
      </div>

      <Explainer id="confidence" heading={t("scaleHeading")}>
        <dl className="flex flex-col gap-1.5">
          {SCALE.map((conf) => (
            <div key={conf} className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5">
              <dt className="flex-none">
                <ConfidenceMark conf={conf} label={t(CONF_LABEL[conf])} />
              </dt>
              <dd className="min-w-0 flex-1 text-[11.5px] leading-[1.55] text-muted-foreground">
                {t(CONF_MEANING[conf])}
              </dd>
            </div>
          ))}
        </dl>
      </Explainer>

      <div>
        <SectionsHeader
          label={t("inventory")}
          expanded={expanded}
          onToggleAll={toggleAll}
          expandLabel={t("expandAll")}
          collapseLabel={t("collapseAll")}
        />
        <p className="micro pb-2 text-ink3">
          {/* Through the Jurisdictions namespace, like every other surface that names
              one. `jurisdiction.city` is the lowercase record key, so this rendered
              "For winnipeg" to the reader. */}
          {t("forJurisdiction", { city: tJur(jurisdiction.id) })}
        </p>
        {groups.map((group) => {
          const def = SOURCES_SECTIONS.find((s) => s.id === group.id)!;
          return (
            <SectionRow
              key={group.id}
              id={group.id}
              name={t(def.labelKey)}
              tone={group.tone}
              line={t("sourcedOf", { n: group.sourced, total: group.total })}
              why={t(WHY[group.id])}
              open={isOpen(group.id)}
              onToggle={() => toggle(group.id)}
            >
              <SourceList entries={group.entries} />
            </SectionRow>
          );
        })}
      </div>

      <div className="text-[10.5px] text-ink3">
        <p>{tDisc("unverifiedFlag")}</p>
        <p className="mt-1">
          {tDisc("lastVerified")} {federal.verified}
        </p>
        {/*
          The notes come out of src/domain verbatim, in the language they were
          written in. Saying so is the honest alternative to machine-glossing a
          verification record — and to letting a French reader assume the
          English paragraph above it is a translation that failed.
        */}
        <p className="mt-1">{t("notesNote")}</p>
        {!jurisdiction.cityData ? <p className="mt-1">{tDisc("noCityData")}</p> : null}
      </div>
    </main>
  );
}

/** Panel-opening copy per section, by id. Literal keys, for the coverage scan. */
const WHY: Record<string, string> = {
  federal: "whyFederal",
  charges: "whyCharges",
  credits: "whyCredits",
  propTax: "whyPropTax",
  market: "whyMarket",
  fees: "whyFees",
};

function Explainer({
  id,
  heading,
  children,
}: {
  id?: string;
  heading: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id ? `${id}-heading` : undefined} className="flex flex-col gap-1.5">
      <h2 id={id ? `${id}-heading` : undefined} className="text-[13px] font-semibold">
        {heading}
      </h2>
      {children}
    </section>
  );
}
