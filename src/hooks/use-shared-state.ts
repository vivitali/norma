"use client";

import { useCallback, useEffect, useState } from "react";
import { readStored, writeStored } from "@/lib/storage";

/**
 * Persists a slice of component state to a shared localStorage blob, keyed by an allowlist so
 * multiple independent call sites (e.g. the header's jurisdiction picker and a full input form)
 * can share one storage key without overwriting each other's fields.
 *
 * Reading, writing, versioning, coercion and the v1 migration all live in
 * src/lib/storage.ts — this hook is only the React binding.
 *
 * `ready` gates the persist effect instead of a plain ref: it is set `true` in the SAME batched
 * update as the hydrated state itself, so it only ever becomes true in a render where `state`
 * has already been updated to reflect hydration. This makes the persist effect immune to React
 * StrictMode's double-invoke-effects behavior — both invocations within one render see the same
 * stale (ready=false) closure, so neither can write stale defaults before the real hydrated
 * state has landed.
 *
 * The third element, `hydrated`, is that same `ready` flag. Pages gate any DERIVED figure on it —
 * prerendered HTML necessarily shows defaults first, and a returning user must not be shown a
 * dollar amount that is about to change. Input controls never gate on it; they render immediately.
 */
export function useSharedState<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
  defaults: T,
): [T, (patch: Partial<T>) => void, boolean] {
  const [state, setState] = useState<T>(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStored<T>(allowlist);
    if (Object.keys(stored).length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((prev) => ({ ...prev, ...stored }));
    }
    setReady(true);
  }, [allowlist]);

  useEffect(() => {
    if (!ready) return;
    writeStored(allowlist, state);
  }, [allowlist, state, ready]);

  const update = useCallback((patch: Partial<T>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  // `ready` is returned as well as gating the persist effect: consumers that
  // react to CHANGES in state need to know which transition was hydration and
  // which was a real edit, and this is the only place that distinction exists.
  return [state, update, ready];
}
