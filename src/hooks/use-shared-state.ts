"use client";

import { useCallback, useEffect, useState } from "react";

const STORE_KEY = "norma.inputs.v1";

function readStore<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
): Partial<T> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const out: Partial<T> = {};
    for (const key of allowlist) {
      if (key in parsed) out[key] = parsed[key] as T[typeof key];
    }
    return out;
  } catch {
    return {};
  }
}

function writeStore<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
  state: T,
) {
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(STORE_KEY);
    const existing = raw ? (JSON.parse(raw) as Record<string, unknown>) : {};
    for (const key of allowlist) existing[key] = state[key];
    window.localStorage.setItem(STORE_KEY, JSON.stringify(existing));
  } catch {
    // storage full or unavailable (private browsing) — state still lives in memory
  }
}

/**
 * Persists a slice of component state to a shared localStorage blob, keyed by an allowlist so
 * multiple independent call sites (e.g. the header's jurisdiction picker and a full input form)
 * can share one storage key without overwriting each other's fields.
 *
 * `ready` gates the persist effect instead of a plain ref: it is set `true` in the SAME batched
 * update as the hydrated state itself, so it only ever becomes true in a render where `state`
 * has already been updated to reflect hydration. This makes the persist effect immune to React
 * StrictMode's double-invoke-effects behavior — both invocations within one render see the same
 * stale (ready=false) closure, so neither can write stale defaults before the real hydrated
 * state has landed.
 */
export function useSharedState<T extends Record<string, unknown>>(
  allowlist: readonly (keyof T & string)[],
  defaults: T,
): [T, (patch: Partial<T>) => void] {
  const [state, setState] = useState<T>(defaults);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const stored = readStore<T>(allowlist);
    if (Object.keys(stored).length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setState((prev) => ({ ...prev, ...stored }));
    }
    setReady(true);
  }, [allowlist]);

  useEffect(() => {
    if (!ready) return;
    writeStore(allowlist, state);
  }, [allowlist, state, ready]);

  const update = useCallback((patch: Partial<T>) => {
    setState((prev) => ({ ...prev, ...patch }));
  }, []);

  return [state, update];
}
