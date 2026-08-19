"use client";

import { useEffect, useRef, useState } from "react";

/**
 * The prior value, held long enough to show what changed.
 *
 * Consumers render one transient chip per changed figure and announce the whole
 * change through a single aria-live region — one live region per chip would
 * produce a volley of announcements on a single keystroke.
 */
export function usePreviousResult<T>(value: T, holdMs = 4000): T | null {
  const [previous, setPrevious] = useState<T | null>(null);
  const latest = useRef(value);

  useEffect(() => {
    if (latest.current === value) return;
    setPrevious(latest.current);
    latest.current = value;
    const timer = setTimeout(() => setPrevious(null), holdMs);
    return () => clearTimeout(timer);
  }, [value, holdMs]);

  return previous;
}
