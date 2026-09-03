"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useSharedState } from "./use-shared-state";
import { useCountry } from "./use-country";
import { JURISDICTION_KEYS, JURISDICTION_DEFAULTS } from "@/lib/shared-inputs";
import { defaultJurisdictionOf, getJurisdiction } from "@/domain/jurisdictions";
import type { Country, Jurisdiction } from "@/domain/types";

/** The resolved jurisdiction, and a setter taking a raw id. */
export type JurisdictionContextValue = [Jurisdiction, (jurId: string) => void];

const JurisdictionContext = createContext<JurisdictionContextValue | null>(null);

/**
 * The fallback rule, decoupled from the storage lookup so it can be tested without a real
 * second country: a stored jurisdiction is used only when it both RESOLVES and belongs to the
 * CURRENT country; anything else — an unknown id, or an id that resolves but to a jurisdiction
 * of a different country — falls back to that country's own default.
 *
 * The country half cannot fire yet (every jurisdiction is `"ca"`), but the moment a second
 * country ships, a `norma.inputs.v2` blob written while browsing `/us/…` and then read on
 * `/ca/…` must not hand a Canadian page a US jurisdiction record with Canadian-shaped fields it
 * cannot read.
 */
export function pickJurisdiction(
  stored: Jurisdiction | undefined,
  country: Country,
): Jurisdiction {
  return stored && stored.country === country ? stored : defaultJurisdictionOf(country);
}

/**
 * Wraps the app once (root layout) so the header's jurisdiction picker and every page's
 * calculations read the same live selection, not independently-hydrated copies.
 *
 * Resolution happens HERE, once — via `pickJurisdiction` above — so the picker and the engine
 * cannot disagree. Previously a stored id that no longer existed fell back to Winnipeg on the
 * page while the picker rendered a missing-message error for the same stale id. The stale
 * value is not rewritten to storage: resolving on read is idempotent, and the next selection
 * overwrites it anyway.
 */
export function JurisdictionProvider({ children }: { children: ReactNode }) {
  const [state, update] = useSharedState(JURISDICTION_KEYS, JURISDICTION_DEFAULTS);
  const country = useCountry();
  const jurisdiction = pickJurisdiction(getJurisdiction(state.jurId), country);
  const setJurId = useCallback((jurId: string) => update({ jurId }), [update]);
  const value = useMemo<JurisdictionContextValue>(
    () => [jurisdiction, setJurId],
    [jurisdiction, setJurId],
  );
  return <JurisdictionContext.Provider value={value}>{children}</JurisdictionContext.Provider>;
}

export function useJurisdiction(): JurisdictionContextValue {
  const ctx = useContext(JurisdictionContext);
  if (!ctx) throw new Error("useJurisdiction must be used within a JurisdictionProvider");
  return ctx;
}
