"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useSharedState } from "./use-shared-state";

const JURISDICTION_KEYS = ["jurId"] as const;

type JurisdictionState = {
  jurId: string;
};

const DEFAULT_JURISDICTION_STATE: JurisdictionState = { jurId: "winnipeg" };

type JurisdictionContextValue = [JurisdictionState, (patch: Partial<JurisdictionState>) => void];

const JurisdictionContext = createContext<JurisdictionContextValue | null>(null);

/**
 * Wraps the app once (root layout) so the header's jurisdiction picker and every page's
 * calculations read the same live selection, not independently-hydrated copies. See the
 * "Why a context here" note above.
 */
export function JurisdictionProvider({ children }: { children: ReactNode }) {
  const value = useSharedState(JURISDICTION_KEYS, DEFAULT_JURISDICTION_STATE);
  return <JurisdictionContext.Provider value={value}>{children}</JurisdictionContext.Provider>;
}

export function useJurisdiction(): JurisdictionContextValue {
  const ctx = useContext(JurisdictionContext);
  if (!ctx) throw new Error("useJurisdiction must be used within a JurisdictionProvider");
  return ctx;
}
