"use client";

import { useEffect, useState } from "react";

/**
 * The hash names exactly one disclosure or section. Read in an effect rather
 * than with useSearchParams: useSearchParams opts the route out of static
 * rendering, and every page route in this app must stay prerendered —
 * Cloudflare serves prerendered pages as free static assets and bills dynamic
 * routes as Worker invocations under a 10ms CPU cap.
 *
 * Returns null on the server and on the first client render, so the prerendered
 * HTML and the hydrated tree agree.
 */
export function useHashTarget(): string | null {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    const read = () => {
      const raw = window.location.hash.replace(/^#/, "");
      setTarget(raw === "" ? null : decodeURIComponent(raw));
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, []);

  return target;
}
