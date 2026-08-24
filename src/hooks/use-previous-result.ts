"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The prior value, held long enough to show what changed.
 *
 * Consumers render one transient chip per changed figure and announce the whole
 * change through a single aria-live region — one live region per chip would
 * produce a volley of announcements on a single keystroke.
 */
export function usePreviousResult<T>(
  value: T,
  { enabled = true, holdMs = 4000 }: { enabled?: boolean; holdMs?: number } = {},
): T | null {
  const [previous, setPrevious] = useState<T | null>(null);
  const latest = useRef(value);
  /** False until the first enabled render, so hydration is never a "change". */
  const armed = useRef(false);

  useEffect(() => {
    // While disabled, track the value silently: state is still settling and any
    // movement is the app catching up with storage, not the user changing
    // anything. Announcing it greets a returning visitor with a figure they
    // never asked for.
    if (!enabled) {
      latest.current = value;
      return;
    }
    if (!armed.current) {
      armed.current = true;
      latest.current = value;
      return;
    }
    if (latest.current === value) return;
    setPrevious(latest.current);
    latest.current = value;
    const timer = setTimeout(() => setPrevious(null), holdMs);
    return () => clearTimeout(timer);
  }, [value, enabled, holdMs]);

  return previous;
}
