"use client";

import type { ReactNode } from "react";
import { dotClass, figureClass, type Tone } from "@/lib/tone";
import { cn } from "@/lib/utils";

export interface SectionRowProps {
  /** Also the URL hash target. */
  id: string;
  name: string;
  tone: Tone;
  /** One plain-language line, always visible, that says what this section found. */
  line: string;
  /** The section's headline figure. Empty for the derivation, which has no single number. */
  figure?: string;
  /** The paragraph that opens the panel — why this check exists at all. */
  why: string;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}

/**
 * The one disclosure gesture. Every section of the screen is this: a status dot,
 * a name, a plain-language read, a live figure — and opening it reveals that
 * section's whole derivation in place.
 *
 * v1 carried four separate ways to go deeper. Learning this one covers all of
 * them, including the math, which is why there is no jump rail: Expand all in
 * the header reaches everything the rail used to.
 */
export function SectionRow({
  id,
  name,
  tone,
  line,
  figure,
  why,
  open,
  onToggle,
  children,
}: SectionRowProps) {
  const panelId = `${id}-panel`;
  return (
    <div id={id} className="scroll-mt-3 border-t border-border">
      <h2 className="m-0">
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={panelId}
          className="flex w-full items-center gap-4 py-4 text-left hover:opacity-75 sm:gap-5 sm:py-[19px]"
        >
          <span aria-hidden="true" className={cn("size-[7px] flex-none rounded-full", dotClass(tone))} />
          <span className="flex-none text-[16.5px] font-semibold tracking-[-0.015em] sm:w-[180px]">
            {name}
          </span>
          <span className="hidden min-w-0 flex-1 text-[13.5px] leading-[1.45] text-ink2 sm:block">
            {line}
          </span>
          {figure ? (
            <span
              className={cn(
                "ml-auto text-[17px] font-semibold tracking-[-0.02em] whitespace-nowrap sm:ml-0",
                figureClass(tone),
              )}
            >
              {figure}
            </span>
          ) : null}
          <span
            aria-hidden="true"
            className={cn("w-3.5 flex-none text-right text-[11px] text-ink3", !figure && "ml-auto")}
          >
            {open ? "–" : "+"}
          </span>
        </button>
      </h2>
      {/* The line moves below the name on phone, where there is no room beside it. */}
      <p className="-mt-2 pb-3 text-[13px] leading-[1.45] text-ink2 sm:hidden">{line}</p>
      <div id={panelId} hidden={!open} className="pt-0.5 pb-[30px] sm:pl-[47px]">
        <p className="mb-[18px] max-w-[620px] text-[13.5px] leading-[1.65] text-ink2 text-pretty">
          {why}
        </p>
        {children}
      </div>
    </div>
  );
}

/** A derivation row inside an open panel. Hairline-separated, never boxed. */
export function PanelRow({
  label,
  value,
  strong,
  provenance,
}: {
  label: string;
  value: string;
  strong?: boolean;
  provenance?: ReactNode;
}) {
  return (
    <div className="flex items-baseline gap-4 border-b border-hairline py-[9px]">
      <span
        className={cn(
          "min-w-0 flex-1 text-[13.5px] leading-[1.45] text-ink2",
          strong && "font-semibold text-ink",
        )}
      >
        {label}
        {provenance}
      </span>
      <span className={cn("text-[13.5px] whitespace-nowrap", strong && "font-semibold")}>
        {value}
      </span>
    </div>
  );
}
