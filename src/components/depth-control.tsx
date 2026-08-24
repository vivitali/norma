"use client";

import { useRef } from "react";
import type { Depth } from "@/lib/sections";
import { cn } from "@/lib/utils";

export interface DepthControlProps {
  value: Depth;
  onChange: (depth: Depth) => void;
  label: string;
  optionLabels: readonly [string, string, string];
}

/**
 * A radiogroup, not three toggle buttons: this is a single choice among three,
 * and aria-pressed on three independent buttons would misdescribe it.
 *
 * The encoding is zero-based; the labels are the contract. The reference stores
 * depth 0 and displays "1 / 2 / 3" as ordinals beside the labels, which is why
 * the default is sometimes described as "level 1".
 */
export function DepthControl({ value, onChange, label, optionLabels }: DepthControlProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const move = (to: number) => {
    if (to < 0 || to > 2) return;
    onChange(to as Depth);
    refs.current[to]?.focus();
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-lg border border-border bg-muted p-0.5"
    >
      {optionLabels.map((optionLabel, i) => (
        <button
          key={optionLabel}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={value === i}
          tabIndex={value === i ? 0 : -1}
          onClick={() => onChange(i as Depth)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowDown") {
              e.preventDefault();
              move(i + 1);
            }
            if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
              e.preventDefault();
              move(i - 1);
            }
          }}
          className={cn(
            "micro flex min-h-11 items-center gap-1.5 rounded-md px-2.5 sm:min-h-0 sm:py-1.5",
            value === i ? "bg-card text-primary" : "text-text-faint",
          )}
        >
          <span aria-hidden="true" className="figure">
            {i + 1}
          </span>
          {optionLabel}
        </button>
      ))}
    </div>
  );
}
