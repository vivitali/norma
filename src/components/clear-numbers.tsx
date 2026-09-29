"use client";

import { useEffect, useRef, useState } from "react";
import { STORE_KEY_V1, STORE_KEY_V2 } from "@/lib/storage";

/**
 * "Clear my numbers" — the control the privacy policy promises ("until you clear them").
 *
 * Confirms IN the page, never with `window.confirm`: the viewer suppresses native dialogs in some
 * embeds, and a destructive action that silently never runs is worse than none. Removes both
 * storage generations (v1 is left behind by the migration and would otherwise be re-migrated back
 * in), then reloads so every page's state re-reads an empty store — `useSharedState` keeps its
 * state per hook, so there is no single place to reset it in memory.
 */
export function ClearNumbers({
  label,
  question,
  confirm,
  cancel,
  className,
}: {
  label: string;
  question: string;
  confirm: string;
  cancel: string;
  className?: string;
}) {
  const [asking, setAsking] = useState(false);
  // Focus lands on Cancel, never on the destructive action, and returns to the trigger when the
  // question is dismissed — unmounting the focused button used to drop focus to <body>.
  const trigger = useRef<HTMLButtonElement>(null);
  const wasAsking = useRef(false);
  useEffect(() => {
    if (wasAsking.current && !asking) trigger.current?.focus();
    wasAsking.current = asking;
  }, [asking]);

  function clear() {
    try {
      window.localStorage.removeItem(STORE_KEY_V2);
      window.localStorage.removeItem(STORE_KEY_V1);
    } catch {
      // storage unavailable — there is nothing saved to clear
    }
    window.location.reload();
  }

  if (!asking) {
    return (
      <button ref={trigger} type="button" className={className} onClick={() => setAsking(true)}>
        {label}
      </button>
    );
  }
  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <p className="text-[12.5px] leading-[1.5] text-ink2">{question}</p>
      <button type="button" className={`${className ?? ""} font-medium text-ink`} onClick={clear}>
        {confirm}
      </button>
      <button type="button" autoFocus className={className} onClick={() => setAsking(false)}>
        {cancel}
      </button>
    </div>
  );
}
