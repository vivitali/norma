"use client";

import { useId, useRef } from "react";
import { cn } from "@/lib/utils";

export interface SegmentedOption<T> {
  value: T;
  label: string;
}

/**
 * A single choice among a few, as a radiogroup with roving tabindex — the same
 * shape as DepthControl, for down payment and amortization. A Select would hide
 * four short options behind a popover for no gain.
 */
export function SegmentedGroup<T extends string | number>({
  value,
  onChange,
  label,
  options,
}: {
  value: T;
  onChange: (value: T) => void;
  label: string;
  options: readonly SegmentedOption<T>[];
}) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  // Not `${label}-label`: label is a translated sentence, so the id contained
  // whitespace (invalid) and aria-labelledby -- an ID *list* -- tokenised it into
  // several ids that do not exist, leaving the group with no accessible name.
  const labelId = useId();

  const move = (to: number) => {
    if (to < 0 || to >= options.length) return;
    onChange(options[to].value);
    refs.current[to]?.focus();
  };

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[11.5px] font-semibold text-muted-foreground" id={labelId}>
        {label}
      </span>
      <div
        role="radiogroup"
        aria-labelledby={labelId}
        className="inline-flex rounded-md border border-border bg-muted p-0.5"
      >
        {options.map((option, i) => (
          <button
            key={String(option.value)}
            ref={(el) => {
              refs.current[i] = el;
            }}
            type="button"
            role="radio"
            aria-checked={value === option.value}
            tabIndex={value === option.value ? 0 : -1}
            onClick={() => onChange(option.value)}
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
              "flex min-h-11 flex-1 items-center justify-center rounded-md px-2.5 text-[12px] sm:min-h-9",
              value === option.value ? "bg-card font-semibold text-primary" : "text-muted-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
