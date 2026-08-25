"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useHashTarget } from "@/hooks/use-hash-target";
import {
  allSectionsOpen,
  isSectionOpen,
  sectionIds,
  setAllSections,
  type OpenMap,
  type SectionDef,
} from "@/lib/sections";

/**
 * The one disclosure gesture, wired up.
 *
 * Every tool page has the same open/closed behaviour — reader clicks win over
 * the URL hash, Expand all is a toggle rather than a one-way door, and arriving
 * on a hash moves FOCUS rather than only scrolling. That last part is the one
 * most easily lost when a page reimplements this: scrolling a keyboard user to a
 * section and leaving their focus where it was is worse than not scrolling.
 *
 * `defs` must be a module-level constant. It keys a memo and an effect, so an
 * inline literal re-runs both on every render.
 *
 * `defaultId` names the section that opens on arrival — the one whose check
 * produced the verdict. It is derived from the same result the answer is, so the
 * prerendered paint and the hydrated one each open the section their own figures
 * make decisive.
 */
export function useSections(defs: readonly SectionDef[], defaultId?: string | null) {
  const hashTarget = useHashTarget();
  const [open, setOpen] = useState<OpenMap>({});
  const ids = useMemo(() => sectionIds(defs), [defs]);

  useEffect(() => {
    if (!hashTarget) return;
    document.getElementById(hashTarget)?.querySelector("button")?.focus({ preventScroll: true });
  }, [hashTarget]);

  const isOpen = useCallback(
    (id: string) => isSectionOpen({ id, open, hashTarget, defaultId }),
    [open, hashTarget, defaultId],
  );
  const toggle = useCallback(
    (id: string) =>
      setOpen((prev) => ({
        ...prev,
        [id]: !isSectionOpen({ id, open: prev, hashTarget, defaultId }),
      })),
    [hashTarget, defaultId],
  );
  const expanded = allSectionsOpen(ids, open, hashTarget, defaultId);
  const toggleAll = useCallback(() => setOpen(setAllSections(ids, !expanded)), [ids, expanded]);

  return { isOpen, toggle, expanded, toggleAll, hashTarget };
}
