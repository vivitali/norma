"use client";

import { useId, useState } from "react";
import { useLocale } from "next-intl";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatLocaleNumber, parseLocaleNumber } from "@/lib/number-format";
import { localeProfile } from "@/lib/locales";
import { cn } from "@/lib/utils";
import { MAX_AMOUNT } from "@/lib/shared-inputs";

/** The most decimals a committed value is ever displayed with. */
const MAX_DP = 4;

/** Decimals `n` actually carries (to MAX_DP) — so a shown figure equals the one used. */
function carriedDp(n: number): number {
  const s = String(Number(n.toFixed(MAX_DP)));
  const i = s.indexOf(".");
  return i === -1 || s.includes("e") ? 0 : s.length - i - 1;
}

export interface NumberFieldProps {
  id: string;
  label: string;
  /** null means "not told". The field then shows `placeholder`, styled as derived. */
  value: number | null;
  /** The derived default, shown when `value` is null. */
  placeholder?: number;
  onCommit: (value: number | null) => void;
  min?: number;
  max?: number;
  dp?: number;
  /** Rendered beside the control, at its own (smaller) size — not inside it. */
  suffix?: string;
  describedBy?: string;
  className?: string;
  autoFocus?: boolean;
}

/**
 * The one number input in the product.
 *
 * Formatted on blur, raw while focused: fighting a formatter mid-keystroke is why
 * grouped inputs are usually worse than plain ones. Empty commits null rather than
 * 0, so blanking a derivable field returns it to its derived default instead of
 * asserting the user earns nothing.
 */
export function NumberField({
  id,
  label,
  value,
  placeholder,
  onCommit,
  min,
  max = MAX_AMOUNT,
  dp = 0,
  suffix,
  describedBy,
  className,
  autoFocus,
}: NumberFieldProps) {
  const intlLocale = localeProfile(useLocale()).intl;
  /** Non-null only while the field is being edited. */
  const [draft, setDraft] = useState<string | null>(null);
  const suffixId = useId();

  /**
   * A derived value is shown as a PLACEHOLDER, never as the field's value.
   *
   * Rendering it as the value meant that focusing a field and tabbing straight
   * out committed the derived figure as an explicit user edit — which pinned
   * `price` to one city's benchmark, pinned `contractRate` across the 20%
   * boundary, and flipped the verdict badge to "your numbers" with no input at
   * all. "Absent means derived" only holds if an untouched field is genuinely
   * empty.
   */
  const display =
    draft !== null ? draft : value === null ? "" : formatLocaleNumber(value, intlLocale, Math.max(dp, carriedDp(value)));
  const hint =
    placeholder === undefined ? undefined : formatLocaleNumber(placeholder, intlLocale, dp);

  const commit = (raw: string) => {
    setDraft(null);
    const parsed = parseLocaleNumber(raw, intlLocale);
    if (parsed === null) {
      // An empty box means "not told" and returns the field to its derived
      // default — but only if it was not already null, so tabbing through an
      // untouched form writes nothing. A partial entry ("-", ".") means the user
      // is not finished; neither of those is a 0, and neither may become one.
      if (raw.trim() === "") {
        if (value !== null) onCommit(null);
      }
      return;
    }
    let next = parsed;
    if (min !== undefined) next = Math.max(min, next);
    next = Math.min(max, next);
    onCommit(next);
  };

  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <Label htmlFor={id} className="text-[11.5px] font-semibold text-muted-foreground">
        {label}
      </Label>
      <div className="flex items-baseline gap-1.5">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          className="text-right font-medium"
          autoFocus={autoFocus}
          value={display}
          placeholder={hint}
          aria-describedby={
            [describedBy, suffix ? suffixId : null].filter(Boolean).join(" ") || undefined
          }
          onFocus={() => setDraft(value === null ? "" : String(value))}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={(e) => commit(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") setDraft(null);
          }}
        />
        {suffix ? (
          <span id={suffixId} className="text-[10.5px] text-ink3">
            {suffix}
          </span>
        ) : null}
      </div>
    </div>
  );
}
