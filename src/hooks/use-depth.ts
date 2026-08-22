"use client";

import { useCallback } from "react";
import { useSharedState } from "./use-shared-state";
import { DEPTH_DEFAULTS, DEPTH_KEYS } from "@/lib/shared-inputs";
import type { Depth } from "@/lib/sections";

/**
 * Depth persists globally, across every page — a reader who has chosen "the
 * math" wants it on the next tool too. Open sections do NOT persist: they live
 * in the URL hash, so one specific expanded state can be shared and cited.
 */
export function useDepth(): [Depth, (depth: Depth) => void] {
  const [state, update] = useSharedState(DEPTH_KEYS, DEPTH_DEFAULTS);
  const setDepth = useCallback((depth: Depth) => update({ depth }), [update]);
  return [state.depth, setDepth];
}
