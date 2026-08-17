export interface BracketPart {
  from: number;
  to: number;
  rate: number;
  amt: number;
}

/**
 * Can I Buy This House? — calculation engine. Pure functions, no DOM, no React state.
 * Every screen that renders a number reads it from here, so two screens can never disagree.
 * Rule VALUES live in src/domain/federal.ts and src/domain/jurisdictions/; only mechanics live here.
 * Canadian mortgages compound semi-annually — payFactor() is not the US monthly formula.
 */

export function bracketTax(
  price: number,
  brackets: readonly (readonly [number | null, number])[],
): { total: number; parts: BracketPart[] } {
  let prev = 0;
  let total = 0;
  const parts: BracketPart[] = [];
  for (const [cap, rate] of brackets) {
    const top = cap == null ? price : Math.min(price, cap);
    if (top > prev) {
      const amt = (top - prev) * rate;
      total += amt;
      parts.push({ from: prev, to: top, rate, amt });
    }
    if (cap != null && price <= cap) break;
    prev = cap == null ? price : cap;
  }
  return { total, parts };
}

/** Monthly payment per $1 of mortgage, Canadian semi-annual compounding. */
export function payFactor(annualRate: number, years: number): number {
  const i = Math.pow(1 + annualRate / 2, 2 / 12) - 1;
  const n = Math.max(1, years * 12);
  return i <= 0 ? 1 / n : i / (1 - Math.pow(1 + i, -n));
}

export function minDown(price: number): number {
  if (price <= 500000) return price * 0.05;
  if (price < 1500000) return 25000 + (price - 500000) * 0.1;
  return price * 0.2;
}

/**
 * Currency. The sign goes outside the symbol: −$340 in en, −340 $ in fr. Never "$-340".
 * A deliberate choice in the source engine, kept here so the bug cannot come back.
 */
export function money(n: number, loc: string, trailing: boolean, dp?: number): string {
  const factor = dp ? 100 : 1;
  const r = Math.round(n * factor) / factor;
  const q = r === 0 ? 0 : r;
  const v = new Intl.NumberFormat(loc, {
    minimumFractionDigits: dp ?? 0,
    maximumFractionDigits: dp ?? 0,
  }).format(Math.abs(q));
  const body = trailing ? `${v} $` : `$${v}`;
  return q < 0 ? `− ${body}` : body;
}
