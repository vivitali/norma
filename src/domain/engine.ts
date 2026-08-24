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

/**
 * How many months of saving close a cash gap.
 *
 * Three genuinely different answers, and the type keeps them apart:
 * `0` — already funded. `null` — unknowable, because no saving rate was given.
 * A number — that many months. Collapsing the first two into one glyph tells a
 * reader who can already close the same thing it tells one who never answered.
 *
 * Lives here rather than in a page because three screens ask it and three
 * screens must not answer it differently.
 */
export function monthsToSave(gap: number | null, save: number | null): number | null {
  if (gap === null) return null;
  if (gap >= 0) return 0;
  if (save === null || save <= 0) return null;
  return Math.ceil(-gap / save);
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
  target: string;
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
    const target = gov.find((l) => l.key === rb.on);
    // A rebate against a line that was not built is not a zero row — it is absent, matching
    // buildLines' own convention. Where there is no municipal tax there is nothing to rebate.
    if (!target) continue;
    const raw = target.amount;
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
      const transferLine = j.transfer.find((l) => l.key === rb.on);
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
      target: target.key,
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

export interface AffordabilityInput {
  income1: number;
  income2: number;
  otherIncome: number;
  haircut: number;
  debts: number;
  amortYears: number;
  comfortCeiling: number;
  insuranceAnnual: number;
  utilities: number;
  condoFee: number;
  contractRate: number;
  price: number;
  dpPct: number;
  ftb: boolean;
  ptype: PropertyType;
  elsewhere: boolean;
  /** Funds available at closing. null = not told; there is nothing honest to assume. */
  funds?: number | null;
  /** Monthly saving toward the purchase. null = not told. */
  save?: number | null;
}

/**
 * The contract rate a borrower would actually be offered, from the down payment.
 * Insured mortgages price below uninsured ones because the lender's risk is
 * covered. Derived rather than entered: the reference computes it at
 * Affordability.dc.html:768 and again at Home.dc.html:444, and hardcoding it
 * left federal.rates.insured/.uninsured unread by any screen. Returned as a
 * percentage, which is what AffordabilityInput.contractRate takes.
 */
export function defaultContractRate(F: FederalRules, dpPct: number): number {
  return (dpPct < 20 ? F.rates.insured : F.rates.uninsured) * 100;
}

/**
 * Two ceilings, computed side by side: `ceiling` is what a lender's GDS/TDS stress test would
 * approve; `comfort` is what actually fits inside the household's real monthly budget. Mirrors
 * the Affordability tab of the Winnipeg reference model.
 */
export function affordability(j: Jurisdiction, F: FederalRules, o: AffordabilityInput) {
  const gross = o.income1 + o.income2 + o.otherIncome;
  const qualIncome = gross * (1 - o.haircut / 100);
  const qualRate = Math.max(F.stressTest.floor, o.contractRate + F.stressTest.buffer) / 100;
  const fq = payFactor(qualRate, o.amortYears);
  const fc = payFactor(o.contractRate / 100, o.amortYears);

  const gdsAllow = (qualIncome * (F.gds / 100)) / 12;
  const tdsAllow = (qualIncome * (F.tds / 100)) / 12 - o.debts;
  const binding = Math.min(gdsAllow, tdsAllow);
  const tdsBinds = tdsAllow < gdsAllow;

  // Solved so property tax scales with price. Assumes 20% down, as the source model does.
  const denomLender = 0.8 * fq + j.propTax / 12;
  /**
   * The ceiling this household would reach carrying `debts` of monthly obligation.
   * Parameterised because the debt-impact figures below are the DIFFERENCE between
   * two ceilings, not a marginal rate multiplied out.
   */
  const ceilingCarrying = (monthlyDebts: number) => {
    if (qualIncome <= 0) return 0;
    const tds = (qualIncome * (F.tds / 100)) / 12 - monthlyDebts;
    const binds = Math.min(gdsAllow, tds);
    return Math.max(0, (binds - F.heatAllowance - o.condoFee * 0.5) / denomLender);
  };
  const ceiling = ceilingCarrying(o.debts);

  const budget = o.comfortCeiling - o.insuranceAnnual / 12 - o.utilities - o.condoFee;
  const denomComfort = 0.8 * fc + j.propTax / 12 + F.maintenanceReserve / 12;
  const comfort = Math.max(0, budget) / denomComfort;

  // The target price, actually financed at the actual down payment.
  const cc = closingTotal(j, F, {
    price: o.price,
    dpPct: o.dpPct,
    ftb: o.ftb,
    ptype: o.ptype,
    amortYears: o.amortYears,
    elsewhere: o.elsewhere,
  });
  // Priced off the entered contract rate — the same rate that drives the comfort ceiling above
  // — so the "what fits your budget" card and the monthly P&I row can never disagree, and the
  // rate input actually moves every figure on the screen.
  const pi = cc.fin.loan * payFactor(o.contractRate / 100, o.amortYears);
  const monthly = {
    pi,
    propTax: (o.price * j.propTax) / 12,
    insurance: o.insuranceAnnual / 12,
    utilities: o.utilities,
    condoFee: o.condoFee,
    maintenance: (o.price * F.maintenanceReserve) / 12,
    total: 0,
  };
  monthly.total =
    monthly.pi + monthly.propTax + monthly.insurance + monthly.utilities + monthly.condoFee + monthly.maintenance;

  // What a lender counts at the target price: a fixed heating allowance, not real utilities.
  const gdsAtTarget =
    qualIncome <= 0
      ? 0
      : ((cc.fin.loan * fq + monthly.propTax + F.heatAllowance + o.condoFee * 0.5) / (qualIncome / 12)) * 100;
  const tdsAtTarget =
    qualIncome <= 0
      ? 0
      : ((cc.fin.loan * fq + monthly.propTax + F.heatAllowance + o.condoFee * 0.5 + o.debts) / (qualIncome / 12)) * 100;

  // Marginal cost of debt WHERE TDS BINDS: what one dollar of monthly obligation
  // removes from the ceiling once total debt service is the constraint.
  const capacityPerDollar = 1 / denomLender;

  // Cash at closing against what the buyer actually has. Both null-safe: a
  // missing figure must stay missing all the way to the screen, so the cash
  // check can render `unanswered` rather than a fabricated shortfall.
  const funds = o.funds ?? null;
  const save = o.save ?? null;
  const cashGap = funds === null ? null : funds - cc.net;
  const monthsToClose = monthsToSave(cashGap, save);

  return {
    gross,
    qualIncome,
    qualRate: qualRate * 100,
    fq,
    fc,
    gdsAllow,
    tdsAllow,
    binding,
    tdsBinds,
    ceiling,
    comfort,
    budget,
    monthly,
    cc,
    gdsAtTarget,
    tdsAtTarget,
    capacityPerDollar,
    /**
     * What the household's debts ACTUALLY cost them in purchase price: the gap
     * between the ceiling they would reach with none and the one they reach with
     * these. Deliberately not `debts * capacityPerDollar`, the reference's own
     * formula — that is the marginal rate where TDS binds, and while GDS binds it
     * overstates the cost by an order of magnitude. The screen says "reduces what
     * a lender will approve by about", so it has to be the reduction.
     */
    debtCapacity: ceilingCarrying(0) - ceiling,
    /** The same figure for the next $100, on the same honest basis. */
    capacityPer100: ceiling - ceilingCarrying(o.debts + 100),
    cashGap,
    monthsToClose,
    impliedMortgage: ceiling * 0.8,
    comfortDown: comfort * 0.2,
    comfortPI: comfort * 0.8 * fc,
    approvalPass: o.price <= ceiling,
    comfortPass: monthly.total <= o.comfortCeiling,
    comfortGap: monthly.total - o.comfortCeiling,
    gap: ceiling - comfort,
  };
}

export type AffordabilityResult = ReturnType<typeof affordability>;

/* ================================================================= *
 * Amortization — the life of the loan, and what renewal does to it
 * ================================================================= */

export interface AmortizationInput extends FinancingInput {
  /** Percentage, e.g. 3.94. */
  contractRate: number;
  /** Percentage. null = renew at the contract rate, i.e. model no shock at all. */
  renewalRate: number | null;
  /** Years per term. Renewal happens at the end of each one. */
  termYears: number;
}

export interface AmortizationRow {
  /** Year number, 1-based. */
  t: number;
  opening: number;
  interest: number;
  principal: number;
  closing: number;
  /** The monthly payment in force during this year. */
  payment: number;
  /** Percentage. */
  rate: number;
  /** True for the first year of a new term. */
  renewed: boolean;
}

/**
 * Year-by-year amortization with renewal.
 *
 * A Canadian mortgage is not priced for its whole amortization: the rate is fixed
 * for a term (five years, typically) and then re-set on whatever the market is
 * doing, against the REMAINING balance over the REMAINING amortization. That
 * re-set is the single largest thing that can happen to a household's monthly
 * cost, and it is invisible on a screen that only shows the opening payment.
 * Modelling it is the whole reason this function exists.
 *
 * The inner loop is monthly, not annual: the balance falls every month, so an
 * annual interest calculation on the opening balance overstates interest by
 * roughly half a year's amortization throughout.
 *
 * Note there is no jurisdiction parameter. The reference took one and never read
 * it — nothing in an amortization schedule is provincial.
 */
export function amortization(F: FederalRules, o: AmortizationInput) {
  const fin = financing(F, o);
  const term = Math.max(1, o.termYears);
  const startRate = o.contractRate / 100;
  const renewRate = (o.renewalRate ?? o.contractRate) / 100;

  let bal = fin.loan;
  let rate = startRate;
  let pay = fin.loan * payFactor(rate, o.amortYears);
  const firstPayment = pay;
  const rows: AmortizationRow[] = [];
  let totalInterest = 0;
  let totalPaid = 0;
  let peakPayment = pay;
  let paymentAfterRenewal: number | null = null;

  for (let t = 1; t <= o.amortYears && bal > 0.005; t++) {
    const renewed = t > 1 && (t - 1) % term === 0;
    if (renewed) {
      // Same balance, same remaining amortization, new rate. Re-amortizing over
      // the ORIGINAL term here would understate the payment and hide the shock.
      rate = renewRate;
      pay = bal * payFactor(rate, o.amortYears - (t - 1));
      paymentAfterRenewal ??= pay;
      if (pay > peakPayment) peakPayment = pay;
    }
    const opening = bal;
    let interest = 0;
    let principal = 0;
    for (let m = 0; m < 12 && bal > 0.005; m++) {
      const int = bal * (Math.pow(1 + rate / 2, 2 / 12) - 1);
      const prin = Math.min(pay - int, bal);
      bal -= prin;
      interest += int;
      principal += prin;
    }
    if (bal < 0.005) bal = 0;
    totalInterest += interest;
    totalPaid += interest + principal;
    rows.push({ t, opening, interest, principal, closing: bal, payment: pay, rate: rate * 100, renewed });
  }

  const afterRenewal = paymentAfterRenewal ?? firstPayment;
  return {
    fin,
    rows,
    totalInterest,
    totalPaid,
    firstPayment,
    peakPayment,
    paymentAfterRenewal: afterRenewal,
    /** What renewal adds to the monthly payment. Zero when no renewal rate was given. */
    shock: afterRenewal - firstPayment,
    term,
    payoffYear: rows.length,
  };
}

export type AmortizationResult = ReturnType<typeof amortization>;

/* ================================================================= *
 * Down payment — where the money actually comes from
 * ================================================================= */

/** Combined federal + provincial marginal rate on the next dollar of taxable income. */
export function marginalRate(F: FederalRules, prov: string, income: number): number {
  const tbl = F.marginal[prov] ?? F.marginal.CA;
  for (const [cap, rate] of tbl) if (cap === null || income <= cap) return rate;
  return tbl[tbl.length - 1][1];
}

export type SourceKey = "fhsa" | "cash" | "hbp" | "tfsa" | "gift" | "nonreg";

/**
 * What drawing on a source costs you beyond the dollars themselves.
 *
 * `free` — nothing owed and no tax triggered.
 * `strings` — the dollars are yours, but using them here has a consequence:
 *   HBP must be repaid over 15 years, TFSA room only returns the following year.
 * `tax` — realising the gain creates a tax bill this year.
 */
export type SourceCost = "free" | "strings" | "tax";

export interface WaterfallRow {
  key: SourceKey;
  avail: number;
  drawn: number;
  left: number;
  /** Tax triggered by this draw. Non-zero only for `nonreg`. */
  tax: number;
  gainRealised: number;
  /** Annual HBP repayment created by this draw. Non-zero only for `hbp`. */
  repayAnnual: number;
  cost: SourceCost;
  exhausted: boolean;
  untouched: boolean;
}

export interface WaterfallInput {
  need: number;
  prov: string;
  /** Taxable income, for the marginal rate applied to a realised capital gain. */
  income: number;
  fhsa: number;
  cash: number;
  /** RRSP balance. The HBP draw is capped at the federal maximum, not at this. */
  rrsp: number;
  tfsa: number;
  gift: number;
  nonreg: number;
  /** Unrealised gain inside `nonreg`, used to size the tax on a partial draw. */
  nonregGain: number;
}

/**
 * Funding waterfall.
 *
 * The order is fixed by COST, not by preference, and that is the point of the
 * screen: FHSA and cash first because they are free, HBP and TFSA next because
 * they carry strings, gift, then non-registered last because selling it triggers
 * tax. A user who reorders this is choosing to pay more, and the fixed order is
 * what makes that visible.
 *
 * Tax on a partial non-registered draw is pro-rated by the fraction of the
 * account sold — selling a third of the account realises a third of the gain.
 */
export function waterfall(F: FederalRules, o: WaterfallInput) {
  const rate = marginalRate(F, o.prov, o.income);
  const hbpRoom = Math.min(Math.max(0, o.rrsp), F.hbp.max);
  const defs: { key: SourceKey; avail: number; cost: SourceCost; gain?: number }[] = [
    { key: "fhsa", avail: Math.max(0, o.fhsa), cost: "free" },
    { key: "cash", avail: Math.max(0, o.cash), cost: "free" },
    { key: "hbp", avail: hbpRoom, cost: "strings" },
    { key: "tfsa", avail: Math.max(0, o.tfsa), cost: "strings" },
    { key: "gift", avail: Math.max(0, o.gift), cost: "free" },
    { key: "nonreg", avail: Math.max(0, o.nonreg), cost: "tax", gain: Math.max(0, o.nonregGain) },
  ];

  let need = Math.max(0, o.need);
  const rows: WaterfallRow[] = [];
  let taxTotal = 0;
  let drawnTotal = 0;

  for (const d of defs) {
    const drawn = Math.min(d.avail, need);
    need -= drawn;
    drawnTotal += drawn;
    let tax = 0;
    let gainRealised = 0;
    let repayAnnual = 0;
    if (d.cost === "tax" && d.avail > 0 && drawn > 0) {
      gainRealised = (d.gain ?? 0) * (drawn / d.avail);
      tax = gainRealised * F.capGainsInclusion * rate;
    }
    if (d.key === "hbp" && drawn > 0) repayAnnual = drawn / F.hbp.repayYears;
    taxTotal += tax;
    rows.push({
      key: d.key,
      avail: d.avail,
      drawn,
      left: d.avail - drawn,
      tax,
      gainRealised,
      repayAnnual,
      cost: d.cost,
      exhausted: d.avail > 0 && drawn >= d.avail - 0.5,
      untouched: drawn <= 0.5,
    });
  }

  const totalAvailable = defs.reduce((t, d) => t + d.avail, 0);
  return {
    rows,
    rate,
    drawnTotal,
    taxTotal,
    /** What the waterfall could not cover. Zero means fully funded. */
    shortfall: need,
    surplus: Math.max(0, totalAvailable - Math.max(0, o.need)),
    totalAvailable,
  };
}

export type WaterfallResult = ReturnType<typeof waterfall>;

export interface GlidePoint {
  /** Months from today. */
  m: number;
  saved: number;
}

/**
 * Savings glide path against a shortfall: what monthly saving reaches, and when.
 * `reach` is null when the target is never met inside the window — the honest
 * answer, and the one that should change the copy rather than be rounded away.
 */
export function glidePath(F: FederalRules, shortfall: number, monthly: number, months = 36) {
  const i = F.savingsReturn / 12;
  const n = Math.max(1, months);
  const series: GlidePoint[] = [];
  let bal = 0;
  let reach: number | null = null;
  for (let m = 0; m <= n; m++) {
    if (m > 0) bal = bal * (1 + i) + monthly;
    series.push({ m, saved: bal });
    if (reach === null && shortfall > 0 && bal >= shortfall) reach = m;
  }
  return { series, reach, target: shortfall, max: Math.max(shortfall, bal), months: n };
}

export type GlidePathResult = ReturnType<typeof glidePath>;

/* ================================================================= *
 * RRSP → Home Buyers' Plan
 * ================================================================= */

export interface HbpInput {
  /** What you would contribute to the RRSP before withdrawing. */
  contribution: number;
  /** Combined marginal rate as a fraction, e.g. 0.3389. */
  marginalRate: number;
  /** What you intend to withdraw under the HBP. */
  withdrawAmount: number;
}

/**
 * Contribute, deduct, wait the rule period, withdraw, repay over 15 years.
 *
 * **No `worthIt` verdict.** The reference returned one, computed as
 * `refund + waitGrowth > 0 && withdraw > 0` — which is true whenever you
 * withdraw anything at all, since a refund is never negative. It was a verdict
 * that could only ever say yes, on a screen whose entire job is to tell you
 * whether this is a good idea. Shipping it would have been worse than shipping
 * nothing.
 *
 * What is actually decidable, and returned here instead:
 *
 * - `refund` — real cash, this year, and the reason the manoeuvre exists.
 * - `repayAnnual` — the obligation it creates, for fifteen years.
 * - `inclusionIfMissed` — what a missed repayment year costs, because that is
 *   the real risk: the missed amount is added to income and taxed at the
 *   marginal rate, permanently, with no way to put it back.
 *
 * Whether the refund is worth fifteen years of obligation depends on facts this
 * function is not given. The screen states the three numbers and lets the reader
 * decide, rather than asserting an answer it cannot support.
 */
export function hbpPlay(F: FederalRules, o: HbpInput) {
  const contribution = Math.max(0, Math.min(o.contribution, F.hbp.max));
  const refund = contribution * o.marginalRate;
  const withdraw = Math.max(0, Math.min(o.withdrawAmount, contribution, F.hbp.max));
  const repayAnnual = withdraw / F.hbp.repayYears;

  const schedule: { year: number; repay: number; balance: number }[] = [];
  let bal = withdraw;
  for (let y = 1; y <= F.hbp.repayYears; y++) {
    bal = Math.max(0, bal - repayAnnual);
    schedule.push({ year: y, repay: repayAnnual, balance: bal });
  }

  return {
    contribution,
    refund,
    withdraw,
    repayAnnual,
    schedule,
    /** Income added, and taxed, for each repayment year missed. */
    inclusionIfMissed: repayAnnual * o.marginalRate,
    /**
     * WITHDRAWAL room left under the federal maximum — not contribution room.
     * `F.hbp.max` caps what you may take out, so measuring it against the
     * contribution reported "$0 left" to someone who had contributed the maximum
     * and withdrawn a tenth of it, with the rest of the room still there.
     */
    withdrawRoomLeft: F.hbp.max - withdraw,
    ruleDays: F.hbp.ruleDays,
    graceYears: F.hbp.graceYears,
    repayYears: F.hbp.repayYears,
    max: F.hbp.max,
  };
}

export type HbpResult = ReturnType<typeof hbpPlay>;

/* ================================================================= *
 * Rent vs buy
 * ================================================================= */

/**
 * Insurance, utilities and condo fees are grown at a general inflation rate
 * rather than at shelter appreciation — they track the cost of services, not the
 * price of the house. An unverified placeholder of exactly the same class as
 * every other figure in this directory.
 */
const NON_SHELTER_INFLATION = 0.03;

export interface RentVsBuyInput extends ClosingInput {
  insuranceAnnual: number;
  utilities: number;
  condoFee: number;
  /** Monthly rent for the comparable place. */
  rent: number;
  /** Annual rent growth, as a fraction. */
  rentInflation: number;
  /** Annual home appreciation, as a fraction. */
  appreciation: number;
  /** Off means model zero appreciation — the honest floor case, not a forecast. */
  appreciationOn: boolean;
  /** Annual return on invested money, as a fraction. */
  investReturn: number;
  /**
   * Invest the monthly difference between owning and renting. Off compares bare
   * outlays; on compares terminal wealth, which is the only comparison that does
   * not quietly credit the owner with forced saving the renter never did.
   */
  investDiff: boolean;
  years: number;
}

export interface RentVsBuyRow {
  t: number;
  opening: number;
  interest: number;
  paid: number;
  balance: number;
  propTax: number;
  insurance: number;
  utilities: number;
  maintenance: number;
  ownerOutlay: number;
  renterOutlay: number;
  /** Owner minus renter for this year. Positive means owning cost more. */
  diff: number;
  /** Renter's side portfolio. */
  rp: number;
  /** Buyer's side portfolio, funded in the years renting costs more. */
  bp: number;
  homeValue: number;
  equity: number;
  /** Terminal wealth if you bought. */
  buyW: number;
  /** Terminal wealth if you rented. */
  rentW: number;
  /** buyW − rentW. Positive means buying is ahead by this year. */
  adv: number;
}

/**
 * Terminal wealth, both ways, year by year.
 *
 * The schedule runs MONTHLY inside each year, not annually, and that is what
 * makes the long horizon honest: past year 25 or 30 the mortgage is discharged
 * and the payment stops. Owner outlay drops off a cliff, and that is exactly
 * where the buy line steepens. A model that stops at fifteen years never had to
 * represent it and quietly flatters renting.
 *
 * Equity is net of selling cost, because wealth you cannot realise without
 * paying an agent is not wealth you have.
 */
export function rentVsBuy(j: Jurisdiction, F: FederalRules, o: RentVsBuyInput) {
  const years = Math.max(1, o.years);
  const fin = financing(F, o);
  const cc = closingTotal(j, F, o);
  const upFront = fin.down + cc.total;
  const rate = fin.insured ? F.rates.insured : F.rates.uninsured;
  const i = Math.pow(1 + rate / 2, 2 / 12) - 1;
  const pay = fin.loan * payFactor(rate, o.amortYears);
  const g = o.appreciationOn ? o.appreciation : 0;
  const ret = o.investReturn;

  let bal = fin.loan;
  let rp = 0;
  let bp = 0;
  let payoffYear: number | null = null;
  const rows: RentVsBuyRow[] = [];

  for (let t = 1; t <= years; t++) {
    const opening = bal;
    let interest = 0;
    let paid = 0;
    for (let m = 0; m < 12 && bal > 0.005; m++) {
      const int = bal * i;
      const prin = Math.min(pay - int, bal);
      bal -= prin;
      interest += int;
      paid += int + prin;
    }
    if (bal < 0.005) {
      bal = 0;
      payoffYear ??= t;
    }
    const infl = Math.pow(1 + NON_SHELTER_INFLATION, t - 1);
    const propTax = o.price * Math.pow(1 + g, t - 1) * j.propTax;
    const insurance = o.insuranceAnnual * infl;
    const utilities = (o.utilities + o.condoFee) * 12 * infl;
    const maintenance = o.price * F.maintenanceReserve * Math.pow(1 + g, t - 1);
    const ownerOutlay = paid + propTax + insurance + utilities + maintenance;
    const renterOutlay = o.rent * 12 * Math.pow(1 + o.rentInflation, t - 1);
    const diff = ownerOutlay - renterOutlay;

    // Whoever spends LESS this year invests the difference. Only one side is
    // funded in any given year, which is what keeps the comparison symmetric.
    if (o.investDiff) {
      rp = rp * (1 + ret) + Math.max(0, diff);
      bp = bp * (1 + ret) + Math.max(0, -diff);
    }

    const homeValue = o.price * Math.pow(1 + g, t);
    const equity = homeValue * (1 - F.sellingCost) - bal;
    const buyW = equity + (o.investDiff ? bp : 0);
    const rentW = upFront * Math.pow(1 + ret, t) + (o.investDiff ? rp : 0);

    rows.push({
      t, opening, interest, paid, balance: bal, propTax, insurance, utilities, maintenance,
      ownerOutlay, renterOutlay, diff,
      rp: o.investDiff ? rp : 0,
      bp: o.investDiff ? bp : 0,
      homeValue, equity, buyW, rentW, adv: buyW - rentW,
    });
  }

  return {
    fin, cc, upFront, pay,
    /** Percentage. */
    rate: rate * 100,
    rows,
    /** First year buying is ahead. null means never, inside the horizon modelled. */
    breakEven: rows.find((r) => r.adv > 0)?.t ?? null,
    payoffYear,
    years,
  };
}

export type RentVsBuyResult = ReturnType<typeof rentVsBuy>;

/** Clamped row lookup by year, 1-based. */
export function rowAt<T>(rows: readonly T[], year: number): T {
  return rows[Math.max(0, Math.min(rows.length - 1, year - 1))];
}

/* ================================================================= *
 * Scenarios — one down payment against another, on every axis at once
 * ================================================================= */

export interface ScenarioInput extends ClosingInput {
  insuranceAnnual: number;
  utilities: number;
  condoFee: number;
  comfortCeiling: number;
  /** Haircut-adjusted income the lender would qualify. */
  qualIncome: number;
  /** Monthly non-housing debt payments. */
  debts: number;
  /** Cash on hand. null = not told; there is nothing honest to assume. */
  funds: number | null;
  /** Monthly saving toward closing. null = not told. */
  save: number | null;
}

/**
 * One down-payment column, computed on every axis a decision actually turns on:
 * insurance premium, monthly cost, cash at closing, lender approval, lifetime
 * interest.
 *
 * Two things this does that a naive column does not:
 *
 * 1. **The legal minimum overrides a lower requested percentage.** Asking for 3%
 *    on a $600k house is not a scenario, it is not allowed, and the column says
 *    so via `belowMinimum` rather than silently computing a mortgage nobody can
 *    get.
 * 2. **Closing costs are recomputed per column, not held constant.** Provinces
 *    that tax the CMHC premium charge more cash at closing precisely on the
 *    low-down-payment columns — holding closing costs flat would hide the one
 *    cost that varies with the thing being compared.
 */
export function scenario(j: Jurisdiction, F: FederalRules, o: ScenarioInput) {
  const floor = minDown(o.price);
  const requested = (o.price * o.dpPct) / 100;
  const down = Math.max(requested, floor);
  const dpPctEff = o.price > 0 ? (down / o.price) * 100 : 0;
  const belowMinimum = requested < floor - 0.5;

  const baseLoan = o.price - down;
  const ltv = o.price > 0 ? baseLoan / o.price : 0;
  const insured = ltv > 0.8 && o.price < F.cmhc.insuredCap;
  let premRate = 0;
  if (insured) {
    const band = F.cmhc.bands.find((b) => ltv <= b[0]) ?? F.cmhc.bands[F.cmhc.bands.length - 1];
    premRate = band[1] + (o.amortYears > 25 ? F.cmhc.longAmortSurcharge : 0);
  }
  const premium = baseLoan * premRate;
  const totalMortgage = baseLoan + premium;

  const contractRate = insured ? F.rates.insured : F.rates.uninsured;
  const f = payFactor(contractRate, o.amortYears);
  const pi = totalMortgage * f;
  const propTax = (o.price * j.propTax) / 12;
  const maintenance = (o.price * F.maintenanceReserve) / 12;
  const monthly = {
    pi,
    propTax,
    insurance: o.insuranceAnnual / 12,
    utilities: o.utilities,
    condoFee: o.condoFee,
    maintenance,
    total: pi + propTax + o.insuranceAnnual / 12 + o.utilities + o.condoFee + maintenance,
  };

  const cc = closingTotal(j, F, { ...o, dpPct: dpPctEff });
  const cash = down + cc.total;
  const net = cash - cc.creditsAtClosing;
  const surplus = o.funds === null ? null : o.funds - net;
  const months = monthsToSave(surplus, o.save);

  const qualRate = Math.max(F.stressTest.floor / 100, contractRate + F.stressTest.buffer / 100);
  const stressPay = totalMortgage * payFactor(qualRate, o.amortYears);
  const housing = stressPay + propTax + F.heatAllowance + o.condoFee * 0.5;
  const gds = o.qualIncome > 0 ? ((housing * 12) / o.qualIncome) * 100 : 0;
  const tds = o.qualIncome > 0 ? (((housing + o.debts) * 12) / o.qualIncome) * 100 : 0;

  const totalInterest = pi * o.amortYears * 12 - totalMortgage;
  return {
    dpPct: o.dpPct,
    dpPctEff,
    belowMinimum,
    down,
    baseLoan,
    ltv,
    insured,
    premRate,
    premium,
    totalMortgage,
    /** Percentage. */
    contractRate: contractRate * 100,
    monthly,
    /** Positive means over the comfort ceiling. */
    vsCeiling: monthly.total - o.comfortCeiling,
    closingTotal: cc.total,
    premiumTaxLine: j.premiumTax ? premium * j.premiumTax.rate : 0,
    creditsAtClosing: cc.creditsAtClosing,
    cash,
    net,
    /** null when funds were never given — not zero. */
    surplus,
    months,
    fundable: surplus === null ? null : surplus >= 0,
    /** Percentage. */
    qualRate: qualRate * 100,
    stressPay,
    gds,
    tds,
    qualifies: o.qualIncome > 0 && gds <= F.gds && tds <= F.tds,
    totalInterest,
    /** Interest plus the insurance premium — the true price of borrowing. */
    costOfBorrowing: totalInterest + premium,
  };
}

export type ScenarioResult = ReturnType<typeof scenario>;
