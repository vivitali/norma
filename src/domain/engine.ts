import type { Jurisdiction, FederalRules, PropertyType } from "./types";

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

export interface FinancingInput {
  price: number;
  dpPct: number;
  amortYears: number;
}

export function financing(F: FederalRules, o: FinancingInput) {
  const down = (o.price * o.dpPct) / 100;
  const baseLoan = o.price - down;
  const insured = o.dpPct < 20 && o.price < F.cmhc.insuredCap;
  let premRate = 0;
  if (insured) {
    const ltv = baseLoan / o.price;
    const band = F.cmhc.bands.find((b) => ltv <= b[0]) ?? F.cmhc.bands[F.cmhc.bands.length - 1];
    premRate = band[1] + (o.amortYears > 25 ? F.cmhc.longAmortSurcharge : 0);
  }
  const premium = insured ? baseLoan * premRate : 0;
  return { down, baseLoan, insured, premRate, premium, loan: baseLoan + premium, minDown: minDown(o.price) };
}

export type FinancingResult = ReturnType<typeof financing>;

export interface ClosingInput extends FinancingInput {
  ftb: boolean;
  ptype: PropertyType;
  elsewhere: boolean;
}

export interface LineItem {
  key: string;
  ex?: string;
  amount: number;
  parts?: BracketPart[] | null;
  tier?: "provincial" | "municipal";
  exact?: boolean;
  cashOnly?: boolean;
  sub?: string;
}

/** A non-applicable line item is ABSENT from the result, never a zero row. */
export function buildLines(j: Jurisdiction, F: FederalRules, o: ClosingInput) {
  const fin = financing(F, o);
  const gov: LineItem[] = [];
  for (const it of j.transfer) {
    if (o.elsewhere && it.tier === "municipal" && j.prov === "ON") continue;
    let amt = 0;
    let parts: LineItem["parts"] = null;
    if (it.kind === "brackets") {
      const r = bracketTax(o.price, it.brackets);
      amt = r.total;
      parts = r.parts;
    } else if (it.kind === "flat") {
      amt = o.price * it.rate;
    } else if (it.kind === "fixed") {
      amt = it.amount;
    } else if (it.kind === "perValue") {
      const on = it.on === "loan" ? fin.loan : o.price;
      amt = it.base + it.per * Math.ceil(Math.max(0, on - (it.exempt ?? 0)) / it.unit);
      if (it.min) amt = Math.max(it.min, amt);
    } else if (it.kind === "rateMin") {
      amt = o.price > it.floor ? o.price * it.rate : it.min;
    }
    gov.push({ key: it.key, ex: it.ex, amount: amt, parts, tier: it.tier, exact: true });
  }
  if (j.premiumTax && fin.premium > 0) {
    gov.push({
      key: "li_premTax",
      ex: "ex_premTax",
      amount: fin.premium * j.premiumTax.rate,
      tier: "provincial",
      exact: true,
      cashOnly: true,
      sub: j.premiumTax.label,
    });
  }

  const f = j.fees;
  const pro: LineItem[] = [];
  pro.push({
    key: j.pro === "notary" ? "li_notary" : j.pro === "lawyerOrNotary" ? "li_lawyerOrNotary" : "li_lawyer",
    amount: (f.lawyer ?? f.notary ?? 0),
  });
  if (f.locCert != null) pro.push({ key: "li_locCert", amount: f.locCert });
  if (f.titleIns != null) pro.push({ key: "li_titleIns", amount: f.titleIns });
  pro.push({ key: "li_inspect", amount: f.inspect });
  pro.push({ key: "li_appraisal", amount: f.appraisal });
  if (o.ptype === "condo" && f.statusCert) pro.push({ key: "li_statusCert", amount: f.statusCert });

  const adj: LineItem[] = [
    { key: "li_taxAdj", ex: "ex_taxAdj", amount: (o.price * j.propTax) / 4 },
    { key: "li_moving", amount: f.moving },
    { key: "li_setup", amount: f.setup },
  ];
  return { fin, gov, pro, adj };
}

export interface CreditLine {
  key: string;
  kind: "cap" | "exemptBand" | "fullExempt" | "none";
  amount: number;
  st: "applied" | "capped" | "phasedOut" | "none" | "ftbOnly";
  target: string | null;
  cap?: number;
  noTax?: boolean;
}

export interface LaterCredit {
  key: string;
  ex?: string;
  amount: number;
}

export function credits(j: Jurisdiction, F: FederalRules, o: ClosingInput, gov: LineItem[]) {
  const atClosing: CreditLine[] = [];
  const later: LaterCredit[] = [];
  for (const rb of j.rebates) {
    const target = gov[rb.on];
    const raw = target ? target.amount : 0;
    let amount = 0;
    let st: CreditLine["st"] = "none";
    if (rb.kind === "none") {
      st = "none";
    } else if (!o.ftb) {
      st = "ftbOnly";
    } else if (rb.kind === "cap") {
      amount = Math.min(rb.cap, raw);
      st = raw > rb.cap ? "capped" : "applied";
    } else if (rb.kind === "fullExempt") {
      amount = raw;
      st = "applied";
    } else if (rb.kind === "exemptBand") {
      const transferLine = j.transfer[rb.on];
      const full =
        transferLine && transferLine.kind === "brackets"
          ? bracketTax(Math.min(o.price, rb.capBase), transferLine.brackets).total
          : 0;
      if (o.price <= rb.full) {
        amount = Math.min(full, raw);
        st = "applied";
      } else if (o.price <= rb.partial) {
        amount = (Math.min(full, raw) * (rb.partial - o.price)) / (rb.partial - rb.full);
        st = "capped";
      } else {
        st = "phasedOut";
      }
    }
    atClosing.push({
      key: rb.key,
      kind: rb.kind,
      amount,
      st,
      target: target ? target.key : null,
      cap: rb.kind === "cap" ? rb.cap : undefined,
      noTax: rb.noTax,
    });
  }
  if (o.ftb) for (const c of j.taxTime) later.push({ key: c.key, ex: c.ex, amount: c.amount });
  if (o.ftb && o.ptype === "newbuild") {
    const g = F.gstFthb;
    const gst = o.price * g.rate;
    const amt =
      o.price <= g.fullTo
        ? Math.min(gst, g.cap)
        : o.price >= g.zeroAt
          ? 0
          : (Math.min(gst, g.cap) * (g.zeroAt - o.price)) / (g.zeroAt - g.fullTo);
    if (amt > 0) later.push({ key: "cr_gstFthb", ex: "ex_gstFthb", amount: amt });
  }
  return { atClosing, later };
}

/** Total cash at closing without the itemised table — for screens that only need the number. */
export function closingTotal(j: Jurisdiction, F: FederalRules, o: ClosingInput) {
  const L = buildLines(j, F, o);
  const sum = (a: LineItem[]) => a.reduce((t, r) => t + r.amount, 0);
  const total = sum(L.gov) + sum(L.pro) + sum(L.adj);
  const C = credits(j, F, o, L.gov);
  const cr = C.atClosing.reduce((t, c) => t + c.amount, 0);
  return {
    fin: L.fin,
    total,
    creditsAtClosing: cr,
    later: C.later.reduce((t, c) => t + c.amount, 0),
    cash: L.fin.down + total,
    net: L.fin.down + total - cr,
  };
}

export type ClosingTotalResult = ReturnType<typeof closingTotal>;
