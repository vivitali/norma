"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useSharedState } from "./use-shared-state";
import { JURISDICTION_KEYS, JURISDICTION_DEFAULTS } from "@/lib/shared-inputs";
import { defaultJurisdiction, getJurisdiction } from "@/domain/jurisdictions";
import type { Jurisdiction } from "@/domain/types";

/** The resolved jurisdiction, and a setter taking a raw id. */
export type JurisdictionContextValue = [Jurisdiction, (jurId: string) => void];

const JurisdictionContext = createContext<JurisdictionContextValue | null>(null);

/**
 * Wraps the app once (root layout) so the header's jurisdiction picker and every page's
 * calculations read the same live selection, not independently-hydrated copies.
 *
 * Resolution happens HERE, once. A stored id that no longer exists falls back in exactly one
 * place, so the picker and the engine cannot disagree — previously the page fell back to
 * Winnipeg while the picker rendered a missing-message error for the same stale id. The stale
 * value is not rewritten to storage: resolving on read is idempotent, and the next selection
 * overwrites it anyway.
 */
export function JurisdictionProvider({ children }: { children: ReactNode }) {
  const [state, update] = useSharedState(JURISDICTION_KEYS, JURISDICTION_DEFAULTS);
  const jurisdiction = getJurisdiction(state.jurId) ?? defaultJurisdiction;
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
