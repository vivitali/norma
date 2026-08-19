"use client";

import type { ReactNode } from "react";
import { toneClass, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

export interface DisclosureSectionProps {
  /** Doubles as the URL hash target and the heading's focus target. */
  id: string;
  label: string;
  open: boolean;
  onToggle: () => void;
  tone?: Tone;
  /** Shown open and closed alike — the headline figure. */
  summary?: ReactNode;
  /** One line of plain language, always visible. */
  why?: ReactNode;
  /** The state word beside the label: Pass / Attention / Blocked. */
  stateWord?: string;
  icon?: string;
  children: ReactNode;
}

export function DisclosureSection({
  id,
  label,
  open,
  onToggle,
  tone = "neutral",
  summary,
  why,
  stateWord,
  icon,
  children,
}: DisclosureSectionProps) {
  const panelId = `${id}-panel`;
  return (
    <div className={cn("rounded-lg border", toneClass(tone))}>
      <h3 id={id} tabIndex={-1} className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex min-h-11 w-full items-center gap-2 px-3 py-2 text-left sm:min-h-0"
        >
          {icon ? (
            <span
              aria-hidden="true"
              className="figure flex size-4 items-center justify-center rounded-md border-[1.5px] border-current text-[10px]"
            >
              {icon}
            </span>
          ) : null}
          <span className="micro">{label}</span>
          {stateWord ? <span className="micro opacity-80">{stateWord}</span> : null}
          {summary ? <span className="figure ml-auto font-semibold">{summary}</span> : null}
          <span aria-hidden="true" className={cn("figure text-text-faint", !summary && "ml-auto")}>
            {open ? "–" : "+"}
          </span>
        </button>
      </h3>
      {why ? <p className="px-3 pb-2 text-[11.5px] text-muted-foreground">{why}</p> : null}
      {/*
        `hidden` rather than conditional rendering, so aria-controls always points
        at a real element. Hidden content is out of the accessibility tree and out
        of Testing Library's default queries, so "closed" still means invisible.
      */}
      <div id={panelId} hidden={!open} className="border-t border-border-hairline px-3 py-2">
        {children}
      </div>
    </div>
  );
}
