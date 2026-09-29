"use client";

import type { ReactNode } from "react";
import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import { jurisdictionsOf } from "@/domain/jurisdictions";
import type { Confidence, Jurisdiction } from "@/domain/types";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useCountry, useRules } from "@/hooks/use-country";
import type { Country } from "@/i18n/countries";
import { useSections } from "@/hooks/use-sections";
import { SOURCES_SECTIONS } from "@/lib/sections";
import { VerifiedLines } from "@/components/provenance";
import { localeProfile } from "@/lib/locales";
import { useMoney, usePercent } from "@/lib/format";
import {
  coverageOf,
  describeFields,
  federalGroup,
  formatAsOf,
  groupProvenance,
  weakestGroupId,
  type FigureGroup,
  type SourceEntry,
} from "@/lib/provenance-view";
import { dotClass, type Tone } from "@/lib/tone";
import { countryKey } from "@/lib/country-key";
import { SectionRow } from "@/components/affordability/section-row";
import { SectionsHeader } from "@/components/tool-page";
import { cn } from "@/lib/utils";

/** Every confidence, in the order the legend teaches them. */
const SCALE: readonly Confidence[] = [
  "high",
  "medium",
  "low",
  "assumption",
  "none",
] as const;

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
      <span
        aria-hidden="true"
        className={cn("size-[7px] rounded-full", dotClass(CONF_TONE[conf]))}
      />
      <span className="micro text-ink2">{label}</span>
    </span>
  );
}

/**
 * A note is a verification record written for maintainers, and it carries markup a reader never
 * asked for: `backticked` field names and SHOUTING_SNAKE series ids. Backticks are stripped and
 * anything that is genuinely an identifier goes in <code>, which may break anywhere
 * (`overflow-wrap: anywhere`) so BROKER_AVERAGE_5YR_VRM wraps as one token instead of splitting
 * at a word-boundary guess. The wording itself is data and is not edited here.
 */
const NOTE_TOKEN = /`([^`]+)`|\b([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+)\b/g;
const IDENTIFIER = /_|\w\.\w|^[a-z]+[A-Z]/;

function Code({ children }: { children: string }) {
  return (
    <code className="font-mono text-[0.94em] [overflow-wrap:anywhere]">
      {children}
    </code>
  );
}

export function renderNote(note: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0;
  for (const m of note.matchAll(NOTE_TOKEN)) {
    const at = m.index ?? 0;
    if (at > last) out.push(note.slice(last, at));
    const ticked = m[1];
    const text = ticked ?? m[2];
    out.push(
      !ticked || IDENTIFIER.test(text) ? <Code key={at}>{text}</Code> : text,
    );
    last = at + m[0].length;
  }
  if (last < note.length) out.push(note.slice(last));
  return out;
}

/** The panel body for one group: its source documents, strongest claim last. */
function SourceList({
  entries,
  jurisdiction,
}: {
  entries: readonly SourceEntry[];
  /** Absent for the federal rules, whose figures are not on a jurisdiction record. */
  jurisdiction?: Jurisdiction;
}) {
  const t = useTranslations("Sources");
  const tClosing = useTranslations("ClosingCosts");
  const intl = localeProfile(useLocale()).intl;
  const money = useMoney();
  const percent = usePercent();
  if (entries.length === 0) {
    return <p className="text-[11.5px] text-ink3">{t("none")}</p>;
  }
  return (
    <ul className="flex max-w-[700px] list-none flex-col">
      {entries.map((entry) => {
        const figures = describeFields(entry.fields, jurisdiction);
        return (
          <li key={entry.key} className="border-b border-hairline py-[13px]">
            {figures.length > 0 ? (
              /*
               * WHAT the document backs, named the way the rest of the product names it, before WHO
               * published it. The entry is keyed by document, and a title alone ("Manitoba Finance,
               * Land Transfer Tax") does not tell a reader which of our numbers it stands behind.
               */
              <ul className="mb-1.5 flex list-none flex-wrap gap-x-4 gap-y-0.5 text-[13.5px] leading-[1.4] font-semibold">
                {figures.map((f) => (
                  <li key={`${f.ns}.${f.key}`}>
                    {f.ns === "ClosingCosts" ? tClosing(f.key) : t(f.key)}
                    {f.value ? (
                      <span className="font-medium text-ink2">
                        {" · "}
                        {f.value.kind === "money"
                          ? money(f.value.n)
                          : percent(f.value.n, 2)}
                      </span>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : null}
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <ConfidenceMark
                conf={entry.conf}
                label={t(CONF_LABEL[entry.conf])}
              />
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
                    {renderNote(entry.src)}
                  </a>
                ) : (
                  <span className="min-w-0 flex-1 text-[12.5px] leading-[1.5] break-words">
                    {renderNote(entry.src)}
                  </span>
                )
              ) : (
                <span className="min-w-0 flex-1 text-[12.5px] leading-[1.5] text-ink3">
                  {t("noSource")}
                </span>
              )}
              {entry.asOf ? (
                <span className="text-[11.5px] whitespace-nowrap text-ink3">
                  {t("asOfLabel")}{" "}
                  {/^\d{4}(-\d{2}(-\d{2})?)?$/.test(entry.asOf)
                    ? formatAsOf(entry.asOf, intl)
                    : entry.asOf}
                </span>
              ) : null}
            </div>
            {entry.notes.map((note) => (
              <p
                key={note}
                // Marks this paragraph as raw `src/domain` provenance text, not
                // UI copy — see page-contracts.test.tsx's vocabulary contract,
                // which excludes these from the CA_ONLY_VOCAB scan. The notes are
                // an English-only verification record (CLAUDE.md), and several
                // legitimately compare a US figure's derivation to "the Canadian
                // record" by name; that is not the same defect as a translated
                // LABEL naming Canada.
                data-source-note
                className="mt-1.5 text-[11.5px] leading-[1.65] break-words text-ink3 text-pretty"
              >
                {renderNote(note)}
              </p>
            ))}
          </li>
        );
      })}
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
  const tNav = useTranslations("Nav");
  const tDisc = useTranslations("Disclosure");
  const tJur = useTranslations("Jurisdictions");
  const [jurisdiction] = useJurisdiction();
  const country = useCountry();
  const rules = useRules();

  const coverage = useMemo(
    () =>
      coverageOf(
        jurisdictionsOf(country).map((j) => j.provenance),
        rules.provenance,
      ),
    [country, rules],
  );
  const groups = useMemo<readonly FigureGroup[]>(
    () => [
      federalGroup(rules.provenance),
      ...groupProvenance(jurisdiction.provenance).groups,
    ],
    [jurisdiction, rules],
  );
  // Federal is excluded from the choice: it is identical for every reader and it
  // is the longest list. See weakestGroupId.
  const deciding = useMemo(
    () => weakestGroupId(groups.filter((g) => g.id !== "federal")),
    [groups],
  );

  const { isOpen, toggle, expanded, toggleAll } = useSections(
    SOURCES_SECTIONS,
    deciding,
  );

  return (
    <main
      id="main"
      // The tool pages' own geometry (ToolMain): 1100px, 20px gutters below sm, 40px from sm.
      className="mx-auto flex w-full max-w-[1100px] flex-1 flex-col gap-8 px-5 pb-16 sm:px-10"
    >
      <div className="pt-9 sm:pt-11">
        <p className="eyebrow mb-5 text-ac">{tNav("sources")}</p>
        <h1 className="max-w-[760px] text-[28px] leading-tight font-semibold tracking-[-0.02em] text-pretty sm:text-[34px]">
          {t("title")}
        </h1>
        <p className="mt-3 max-w-[620px] text-[14.5px] leading-[1.6] text-ink2 text-pretty">
          {t("subtitle")}
        </p>
        {/*
          Counted, never asserted. The standing disclosure on every tool page
          claims most figures now name a published source; this is the arithmetic
          that has to hold for that claim to stay true, run on the same records.
        */}
        <p className="mt-3 max-w-[620px] text-[13px] leading-[1.6] text-ink2 text-pretty">
          {t("coverage", { ...coverage })}
        </p>
      </div>

      {/* The two anchors the provenance marks link to — hairline sections, not cards (DESIGN.md §4). */}
      <div className="grid gap-x-10 gap-y-6 border-t border-hairline pt-5 md:grid-cols-2">
        <div id="rule" tabIndex={-1} className="scroll-mt-4">
          <Explainer heading={t("ruleHeading")}>
            <p className="max-w-prose text-[12.5px] leading-[1.6] text-ink2">
              {t(countryKey("ruleBody", country))}
            </p>
          </Explainer>
        </div>
        <div id="estimate" tabIndex={-1} className="scroll-mt-4">
          <Explainer heading={t("estimateHeading")}>
            <p className="max-w-prose text-[12.5px] leading-[1.6] text-ink2">
              {t("estimateBody")}
            </p>
          </Explainer>
        </div>
      </div>

      <div className="border-t border-hairline pt-5">
        <Explainer id="confidence" heading={t("scaleHeading")}>
          <dl className="flex flex-col gap-1.5">
            {SCALE.map((conf) => (
              <div
                key={conf}
                className="flex flex-wrap items-baseline gap-x-2.5 gap-y-0.5"
              >
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
      </div>

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
              "For winnipeg" to the reader.

              `at.<id>` and not the bare name: this sits after a preposition, and
              French takes an article on every province and territory — "Pour le
              Yukon", not "Pour Yukon". The bare form stays right for the eight city
              records, and `at.<id>` equals it there, so one lookup serves all
              fourteen. English is identical either way. */}
          {t("forJurisdiction", { city: tJur(`at.${jurisdiction.id}`) })}
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
              why={t(whyKey(group.id, country))}
              open={isOpen(group.id)}
              onToggle={() => toggle(group.id)}
            >
              <SourceList
                entries={group.entries}
                jurisdiction={group.id === "federal" ? undefined : jurisdiction}
              />
            </SectionRow>
          );
        })}
      </div>

      <div className="border-t border-hairline pt-4 text-[11.5px] text-ink3">
        <p>{tDisc("unverifiedFlag")}</p>
        <div className="mt-1">
          <VerifiedLines jurisdiction={jurisdiction} />
        </div>
        {/*
          The notes come out of src/domain verbatim, in the language they were
          written in. Saying so is the honest alternative to machine-glossing a
          verification record — and to letting a French reader assume the
          English paragraph above it is a translation that failed.
        */}
        <p className="mt-1">{t("notesNote")}</p>
        {!jurisdiction.cityData ? (
          <p className="mt-1">{tDisc("noCityData")}</p>
        ) : null}
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

/**
 * Only `whyCharges` genuinely differs by country — it names "the province",
 * and Houston has a state, not a province. The other five panel-openers are
 * country-neutral prose, so keeping the forked-key surface to this one entry
 * (rather than wrapping every `WHY[group.id]` in `countryKey`) matches
 * `country-key.ts`'s own doc comment: fork only where the wording changes.
 */
const WHY_FORKED = new Set(["whyCharges"]);
function whyKey(id: string, country: Country): string {
  const base = WHY[id];
  return WHY_FORKED.has(base) ? countryKey(base, country) : base;
}

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
    <section
      aria-labelledby={id ? `${id}-heading` : undefined}
      className="flex flex-col gap-1.5"
    >
      <h2
        id={id ? `${id}-heading` : undefined}
        className="text-[15px] font-semibold tracking-[-0.01em]"
      >
        {heading}
      </h2>
      {children}
    </section>
  );
}
