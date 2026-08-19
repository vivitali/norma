"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { affordability } from "@/domain/engine";
import { federal } from "@/domain/federal";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useSharedState } from "@/hooks/use-shared-state";
import { useDepth } from "@/hooks/use-depth";
import { useHashTarget } from "@/hooks/use-hash-target";
import { usePreviousResult } from "@/hooks/use-previous-result";
import { AFFORDABILITY_DEFAULTS, AFFORDABILITY_KEYS } from "@/lib/shared-inputs";
import { isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
import {
  AFFORDABILITY_SECTIONS,
  isDisclosureOpen,
  visibleSections,
  type Depth,
} from "@/lib/sections";
import { DepthControl } from "@/components/depth-control";
import { JumpRail } from "@/components/jump-rail";
import { VerdictCard } from "@/components/affordability/verdict-card";
import { StatStrip } from "@/components/affordability/stat-strip";
import { Checks } from "@/components/affordability/checks";

/**
 * Answer first, inputs second, advanced detail reachable in place.
 *
 * Composition only: every number comes from src/domain/, every derived state
 * and percentage from src/lib/, every string from messages/*.json. Stays a
 * client component and inherits static rendering from the layout's single
 * setRequestLocale — nothing here may reach for useSearchParams.
 */
export default function AffordabilityPage() {
  const t = useTranslations("Affordability");
  const tDepth = useTranslations("Depth");
  const [jurisdiction] = useJurisdiction();
  const [stored, update] = useSharedState(AFFORDABILITY_KEYS, AFFORDABILITY_DEFAULTS);
  const [depth, setDepth] = useDepth();
  const hashTarget = useHashTarget();

  /** Explicit opens and closes, for this session only. Depth is a floor, not a state. */
  const [overrides, setOverrides] = useState<Record<string, boolean>>({});
  const toggle = (id: string, currentlyOpen: boolean) =>
    setOverrides((prev) => ({ ...prev, [id]: !currentlyOpen }));

  const resolved = useMemo(
    () => resolveInputs(stored, jurisdiction, federal),
    [stored, jurisdiction],
  );
  const result = useMemo(
    () => affordability(jurisdiction, federal, resolved),
    [jurisdiction, resolved],
  );
  const previous = usePreviousResult(result);

  const sections = visibleSections(AFFORDABILITY_SECTIONS, depth);
  const openOf = (disclosureId: string) => {
    const def = AFFORDABILITY_SECTIONS.flatMap((s) => s.disclosures ?? []).find(
      (d) => d.id === disclosureId,
    );
    if (!def) return false;
    return isDisclosureOpen({ def, depth, hashTarget, override: overrides[def.id] });
  };

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 p-4 pb-24 sm:p-6 sm:pb-6">
      <div>
        <p className="micro text-text-faint">{t("aDeep")}</p>
        <h1 className="text-[27px] leading-tight font-semibold tracking-tight">{t("aTitle")}</h1>
        <p className="mt-1 max-w-prose text-[12.5px] text-muted-foreground">{t("aSub")}</p>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-y border-border-hairline py-2">
        <DepthControl
          value={depth}
          onChange={(d: Depth) => setDepth(d)}
          label={tDepth("label")}
          optionLabels={[tDepth("answer"), tDepth("why"), tDepth("math")]}
        />
        <JumpRail
          label={tDepth("jumpTo")}
          links={sections.map((s) => ({ id: s.id, label: t(s.labelKey) }))}
        />
      </div>

      <VerdictCard result={result} personalised={isPersonalised(stored)} />
      <StatStrip result={result} previous={previous} />
      <Checks
        result={result}
        stored={stored}
        resolved={resolved}
        update={update}
        isOpen={openOf}
        onToggle={toggle}
      />

      <div className="text-[10.5px] text-text-faint">
        <p>{t("unverifiedFlag")}</p>
        <p>
          {t("lastVerified")} {federal.verified}
        </p>
        {!jurisdiction.cityData ? <p>{t("noCityData")}</p> : null}
      </div>
    </main>
  );
}
