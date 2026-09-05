import type {
  Applicability,
  CaRules,
  CountryRules,
  CountryRulesBase,
  Jurisdiction,
  PropertyType,
  Residency,
  UsRules,
} from "./types";
import { regionOf } from "./types";

export interface BracketPart {
  from: number;
  to: number;
  rate: number;
  amt: number;
}

/**
 * Can I Buy This House? — calculation engine. Pure functions, no DOM, no React state.
 * Every screen that renders a number reads it from here, so two screens can never disagree.
 * Rule VALUES live in src/domain/rules/*.ts and src/domain/jurisdictions/; only mechanics live here.
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
 * Monthly payment per $1 of mortgage, US monthly compounding — NOT `payFactor()`, which
 * compounds semi-annually per Canadian law. A US 30-year fixed compounds monthly: the periodic
 * rate is simply `annualRate / 12`.
 */
export function payFactorMonthly(annualRate: number, years: number): number {
  const i = annualRate / 12;
  const n = Math.max(1, years * 12);
  return i <= 0 ? 1 / n : i / (1 - Math.pow(1 + i, -n));
}

/**
 * Annual property tax against MARKET PRICE, honouring a US-style homestead exemption where one
 * exists. The single seam every caller (`buildLines`, `affordability`, `rentVsBuy`, `scenario`)
 * uses instead of multiplying `price * j.propTax.effective` directly — see
 * `PropertyTax.exemptions`'s doc comment in types.ts for why a flat subtraction against the
 * WHOLE effective rate would overstate the relief.
 *
 * Still LINEAR in price, which is what keeps `affordability()`'s closed-form ceiling solvable:
 * `taxable * appliesToRate + price * (effective - appliesToRate)` expands to
 * `price * effective - amount * appliesToRate` — a rate term on price plus a constant credit.
 * `propertyTaxCredit()` below is that constant, for the callers that solve FOR price rather
 * than compute FROM it.
 */
export function propertyTaxAnnual(j: Jurisdiction, price: number): number {
  const ex = j.propTax.exemptions;
  if (!ex) return price * j.propTax.effective;
  const taxable = Math.max(0, price - ex.amount);
  const remainderRate = j.propTax.effective - ex.appliesToRate;
  return taxable * ex.appliesToRate + price * remainderRate;
}

/**
 * The constant dollar credit a homestead exemption is worth, independent of price — the term
 * `affordability()`'s ceiling equations add back to the household's budget before dividing by
 * the (unchanged) property-tax RATE coefficient. Zero where a record carries no exemption.
 */
export function propertyTaxCredit(j: Jurisdiction): number {
  const ex = j.propTax.exemptions;
  return ex ? ex.amount * ex.appliesToRate : 0;
}

/**
 * The month (1-based, into the amortization) a US mortgage's SCHEDULED balance first reaches
 * `autoTerminateLtv` of the ORIGINAL price — the Homeowners Protection Act's automatic PMI
 * termination point. `null` if the loan is paid off (or the schedule never reaches the
 * threshold) within `amortYears`, which should not happen for a real conforming loan but is
 * handled rather than assumed away.
 */
function pmiTerminationMonth(o: {
  price: number;
  loan: number;
  amortYears: number;
  contractRate: number;
  autoTerminateLtv: number;
}): number | null {
  const targetBalance = o.autoTerminateLtv * o.price;
  if (o.loan <= targetBalance) return 0;
  const rate = o.contractRate / 100;
  const i = rate / 12;
  const n = Math.max(1, o.amortYears * 12);
  const pay = o.loan * payFactorMonthly(rate, o.amortYears);
  let bal = o.loan;
  for (let m = 1; m <= n; m++) {
    const interest = bal * i;
    const principal = Math.min(pay - interest, bal);
    bal -= principal;
    if (bal <= targetBalance + 0.005) return m;
  }
  return null;
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

/**
 * The statutory minimum down payment on a purchase price.
 *
 * The tiers are NOT written here. They were — `500000`, `1500000`, `0.05`, `0.1`, `0.2` as
 * literals — and a page component then wrote `MIN_DOWN_TIER = 500000` a second time to
 * caption them, which is exactly the duplication engine.ts's own header forbids: rule values
 * live in the rules record, only mechanics live here. They now come off `F.minDown`, with the
 * provenance entry that makes them quotable to the reader.
 *
 * Marginal below the insured cap, flat at or above it — see `CaRules.minDown` for why
 * the 20% is a different kind of thing from the two bands beneath it.
 *
 * `ftb` is read only on the US branch — `programs.conventional.minDownFtb` (3%) vs `minDown`
 * (5%), a flat percentage-of-price choice rather than a tiered schedule. The Canadian branch
 * ignores it entirely, exactly as before, so every existing CA call site (which never passed a
 * third argument) is untouched.
 */
export function minDown(F: CountryRules, price: number, ftb?: boolean): number {
  if (F.country === "us") {
    const rate = ftb ? F.programs.conventional.minDownFtb : F.programs.conventional.minDown;
    return price * rate;
  }
  if (price >= F.cmhc.insuredCap) return price * F.minDown.uninsuredRate;
  return bracketTax(price, F.minDown.bands).total;
}

export interface AmortEligibilityInput {
  dpPct: number;
  price: number;
  ftb: boolean;
  ptype: PropertyType;
}

/**
 * The longest amortization this borrower can actually get, in years.
 *
 * `financing()` charges `cmhc.longAmortSurcharge` on a 30-year loan without ever asking
 * whether the borrower may have one, and both `maxAmortFtbInsured` and `maxAmortOther` were
 * read by nothing outside their own tests. This is the predicate that closes that: a screen
 * offering a 30-year amortization control calls it and GATES the control, with a caution
 * naming the condition.
 *
 * Thirty years is available on three independent grounds, and all three are needed:
 *
 * 1. **20% down or more** — the loan is uninsured, so no insured maximum binds it.
 * 2. **Price at or above `cmhc.insuredCap`** — insurance is unavailable at all, for the same
 *    reason: `minDown` already forces 20% there, but the point stands independently, because
 *    a reader who has typed a larger price has left the insured world entirely.
 * 3. **First-time buyer OR new build** — CMHC Home Start, whose eligibility is that exact
 *    "or". Dropping the `newbuild` half would deny a 30-year amortization to a repeat buyer
 *    of a new home, who is entitled to it.
 *
 * **Do not print the 25 as the law.** `maxAmortOther` is `conf: "medium"` and its own note
 * scopes it to INSURED loans: 30- and even 35-year uninsured amortizations exist at lender
 * discretion. Since the 25 is only ever returned when the loan IS insured (all three grounds
 * above having failed), the number is correct where it is returned — but the sentence a UI
 * writes around it must say "on an insured mortgage", not "in Canada".
 *
 * It GATES, it does not clamp. `financing()` and `amortization()` still compute exactly the
 * amortization the reader set, because silently recomputing someone's input is how a screen
 * comes to disagree with the figure the reader is looking at.
 */
export function maxAmortYears(F: CaRules, o: AmortEligibilityInput): number {
  const uninsured = o.dpPct >= 20 || o.price >= F.cmhc.insuredCap;
  const homeStart = o.ftb || o.ptype === "newbuild";
  return uninsured || homeStart ? F.maxAmortFtbInsured : F.maxAmortOther;
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
  /** US only: feeds `minDown()`'s FTB-vs-standard percentage. Ignored on the Canadian branch,
   * which has never taken a third argument to `minDown()`. */
  ftb?: boolean;
  /** US only, percentage (e.g. 6.66). Used to compute the month PMI auto-terminates. Falls
   * back to `defaultContractRate()` when omitted, so every existing CA and US call site that
   * never set this keeps working. */
  contractRate?: number;
}

/**
 * `financing()` returns a superset shape across both countries: `monthlyInsurance` and
 * `insuranceMonths` are `0`/`null` on the Canadian branch, whose own arithmetic is otherwise
 * byte-identical to before this field existed (see `golden.test.ts`).
 *
 * The Canadian CMHC premium is a ONE-TIME amount financed into the loan (`premium`, added to
 * `loan`). US mortgage insurance (PMI) is priced, paid and behaves completely differently: a
 * MONTHLY charge (`monthlyInsurance`), NOT financed into the loan at all (`premium` stays `0`,
 * `loan === baseLoan`), and cancellable — `insuranceMonths` is the month it stops, per the
 * Homeowners Protection Act (see `pmiTerminationMonth()`).
 */
export function financing(F: CountryRules, o: FinancingInput) {
  if (F.country === "us") {
    const down = (o.price * o.dpPct) / 100;
    const baseLoan = o.price - down;
    const ltv = o.price > 0 ? baseLoan / o.price : 0;
    const insured = ltv > F.programs.conventional.pmi.cancelRequestLtv;
    const premRate = 0;
    const premium = 0;
    const monthlyInsurance = insured ? (baseLoan * F.programs.conventional.pmi.annualRate) / 12 : 0;
    const contractRate = o.contractRate ?? defaultContractRate(F, o.dpPct);
    const insuranceMonths = insured
      ? pmiTerminationMonth({
          price: o.price,
          loan: baseLoan,
          amortYears: o.amortYears,
          contractRate,
          autoTerminateLtv: F.programs.conventional.pmi.autoTerminateLtv,
        })
      : null;
    return {
      down,
      baseLoan,
      insured,
      premRate,
      premium,
      loan: baseLoan,
      minDown: minDown(F, o.price, o.ftb),
      monthlyInsurance,
      insuranceMonths,
    };
  }
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
  return {
    down,
    baseLoan,
    insured,
    premRate,
    premium,
    loan: baseLoan + premium,
    minDown: minDown(F, o.price),
    monthlyInsurance: 0,
    insuranceMonths: null,
  };
}

export type FinancingResult = ReturnType<typeof financing>;

export interface ClosingInput extends FinancingInput {
  ftb: boolean;
  ptype: PropertyType;
  elsewhere: boolean;
  residency: Residency;
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

/**
 * Which keys of `when` the input fails. Empty means the item applies. Callers need the list,
 * not just a boolean: `credits` renders a rebate that fails ONLY its `ftb` test as an
 * "ftbOnly" row so the user learns why they get nothing, but drops one that fails a `ptype`
 * or `residency` test entirely, matching buildLines' absent-not-zero convention.
 */
export function unmetBy(when: Applicability | undefined, o: ClosingInput): (keyof Applicability)[] {
  const unmet: (keyof Applicability)[] = [];
  if (!when) return unmet;
  if (when.ftb !== undefined && when.ftb !== o.ftb) unmet.push("ftb");
  if (when.ptype !== undefined && when.ptype !== o.ptype) unmet.push("ptype");
  // KNOWN OMISSIONS AT THIS SEAM, and this is where the next person will look for them.
  // `residency` currently reaches exactly one line in the whole dataset — Nova Scotia's 10%
  // non-resident deed transfer tax on halifax.ts. Two more of the largest charges a
  // non-resident buyer in Canada faces are NOT modelled anywhere:
  //   * Ontario's Non-Resident Speculation Tax (25%, province-wide since 2022);
  //   * British Columbia's additional property transfer tax (20%, specified regions only).
  // Neither is guessed at here: both need a primary-source read of their own statute and
  // regulation before a rate could ship at `conf: "high"`, and BC's needs a note scoping it
  // to the specified taxable regions rather than the province. Note also that `residency` is
  // one flag carrying two different meanings — halifax.ts records a PROVINCIAL six-month
  // becoming-resident exemption, while ON and BC turn on citizenship or permanent residence
  // — so widening the type is a semantics decision, not a mechanical one.
  if (when.residency !== undefined && when.residency !== o.residency) unmet.push("residency");
  if (when.elsewhere !== undefined && when.elsewhere !== o.elsewhere) unmet.push("elsewhere");
  if (when.overPrice !== undefined && !(o.price > when.overPrice)) unmet.push("overPrice");
  return unmet;
}

export function applies(when: Applicability | undefined, o: ClosingInput): boolean {
  return unmetBy(when, o).length === 0;
}

/**
 * A non-applicable line item is ABSENT from the result, never a zero row.
 *
 * Country-generic almost entirely by construction: every `TransferLine.kind` and `fees.*`
 * field is a shared shape, so the loop below needs no branch on `F.country` at all —
 * `j.transfer === []` for Houston degrades the `gov` group to empty with no crash and no
 * phantom row, exactly as the design spec requires. The two genuinely US-only additions
 * (the title-company fee label, and the prepaid-escrow line) are appended at the end.
 */
export function buildLines(j: Jurisdiction, F: CountryRules, o: ClosingInput) {
  const fin = financing(F, o);
  const gov: LineItem[] = [];
  for (const it of j.transfer) {
    if (!applies(it.when, o)) continue;
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
      if (it.max != null) amt = Math.min(it.max, amt);
    } else if (it.kind === "rateMin") {
      amt = o.price > it.floor ? o.price * it.rate : it.min;
    } else if (it.kind === "stepped") {
      // A STEP table, not a marginal one: the band the value lands in sets the whole amount.
      const on = it.on === "loan" ? fin.loan : o.price;
      const step =
        it.steps.find(([cap]) => cap == null || on <= cap) ?? it.steps[it.steps.length - 1];
      amt = step[1];
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
    key:
      j.pro === "notary"
        ? "li_notary"
        : j.pro === "lawyerOrNotary"
          ? "li_lawyerOrNotary"
          : j.pro === "titleCompany"
            ? "li_titleCompany"
            : "li_lawyer",
    amount: (f.lawyer ?? f.notary ?? 0),
  });
  if (f.locCert != null) pro.push({ key: "li_locCert", amount: f.locCert });
  if (f.titleIns != null) pro.push({ key: "li_titleIns", amount: f.titleIns });
  pro.push({ key: "li_inspect", amount: f.inspect });
  pro.push({ key: "li_appraisal", amount: f.appraisal });
  // `!= null`, not truthiness. Montreal carried `statusCert: 0`, which is falsy, so condo
  // buyers there silently got no status-certificate line at all while /sources still
  // disclosed an `assumption`-grade modelling default for it. The zero is gone from that
  // record — the field is optional, and an ABSENT fee is the honest way to say a record does
  // not carry one — and this gate is tightened so a future 0 renders as a $0 line rather than
  // vanishing. Tightening alone would have started charging Montreal a $0 row; both halves.
  if (o.ptype === "condo" && f.statusCert != null) {
    pro.push({ key: "li_statusCert", amount: f.statusCert });
  }
  // US only — a survey and a county recording fee, neither of which any Canadian record
  // carries. Absent, not zero, on every record that lacks them (matches `locCert`/`titleIns`).
  if (f.survey != null) pro.push({ key: "li_survey", amount: f.survey });
  if (f.recording != null) pro.push({ key: "li_recording", amount: f.recording });

  const adj: LineItem[] = [
    { key: "li_taxAdj", ex: "ex_taxAdj", amount: propertyTaxAnnual(j, o.price) / 4 },
    { key: "li_moving", amount: f.moving },
    { key: "li_setup", amount: f.setup },
  ];
  // US only — a lender collects `escrowPrepaidMonths` of property tax and insurance upfront to
  // seed the escrow account. `j.insurance` is the jurisdiction's own disclosed estimate; a
  // reader's real insurance figure is not visible here (`ClosingInput` carries none), so this
  // line is necessarily seeded from the SAME jurisdiction-level estimate `AnswerHead` /
  // `AffordabilityInput.insuranceAnnual` defaults from elsewhere — see the note in the PR
  // report about this seam.
  if (F.country === "us" && j.insurance != null) {
    const monthlyTax = propertyTaxAnnual(j, o.price) / 12;
    const monthlyInsurance = j.insurance / 12;
    adj.push({
      key: "li_prepaidEscrow",
      ex: "ex_prepaidEscrow",
      amount: (monthlyTax + monthlyInsurance) * F.escrowPrepaidMonths,
    });
  }
  return { fin, gov, pro, adj };
}

export interface CreditLine {
  key: string;
  kind: "cap" | "exemptBand" | "fullExempt" | "tieredCap" | "none";
  amount: number;
  st:
    | "applied"
    | "capped"
    | "phasedOut"
    | "overCeiling"
    | "superseded"
    | "tied"
    | "none"
    | "ftbOnly";
  target: string;
  cap?: number;
  group?: string;
  noTax?: boolean;
}

export interface LaterCredit {
  key: string;
  ex?: string;
  amount: number;
}

export function credits(j: Jurisdiction, F: CountryRules, o: ClosingInput, gov: LineItem[]) {
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
    const unmet = unmetBy(rb.when, o);
    // Failing only the first-time-buyer test is worth SAYING — the user learns why they get
    // nothing. Failing any other test means the programme is irrelevant to this purchase, so
    // the row is absent, matching buildLines.
    const ftbOnly = unmet.length === 1 && unmet[0] === "ftb";
    if (unmet.length > 0 && !ftbOnly) continue;

    if (rb.kind === "none") {
      st = "none";
    } else if (ftbOnly) {
      st = "ftbOnly";
    } else if (rb.kind === "cap") {
      amount = Math.min(rb.cap, raw);
      st = raw > rb.cap ? "capped" : "applied";
    } else if (rb.kind === "fullExempt") {
      // A cliff, not a taper: at the ceiling the whole tax is forgiven, one dollar over and the
      // whole tax is payable. `null` is an explicit "genuinely uncapped", not a missing value.
      if (rb.ceiling == null || o.price <= rb.ceiling) {
        amount = raw;
        st = "applied";
      } else {
        st = "overCeiling";
      }
    } else if (rb.kind === "tieredCap") {
      // The tier table runs over the DUTY, not the price, and nothing takes it back above the
      // price at which the cap binds — see TieredCapRebate for why there is no phase-out.
      const tiered = bracketTax(raw, rb.tiers).total;
      amount = Math.min(rb.cap, tiered);
      st = tiered > rb.cap ? "capped" : "applied";
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
    const line: CreditLine = {
      key: rb.key,
      kind: rb.kind,
      amount,
      st,
      target: target.key,
      cap: rb.kind === "cap" || rb.kind === "tieredCap" ? rb.cap : undefined,
      group: rb.group,
      noTax: rb.noTax,
    };
    // A rebate claimed on a tax return is not money the buyer brings to the closing table.
    // The asymmetry is deliberate: a zero-amount atClosing row is kept, because it carries
    // `st` and that is the whole point of ftbOnly, while a zero-amount later row is dropped
    // — LaterCredit has no status field, so it would render as a meaningless "$0" line.
    if (rb.timing === "taxTime") {
      if (amount > 0) later.push({ key: rb.key, ex: rb.ex, amount });
    } else {
      atClosing.push(line);
    }
  }
  // Two programmes in the same group are alternatives, not a stack: BC's first-time-buyer and
  // newly-built exemptions are each claimable, but only one of them. Keeping the loser visible
  // as a superseded row lets the UI explain the choice instead of silently hiding a programme
  // the buyer qualified for.
  const groups = new Map<string, CreditLine[]>();
  for (const c of atClosing) {
    if (!c.group) continue;
    const bucket = groups.get(c.group);
    if (bucket) bucket.push(c);
    else groups.set(c.group, [c]);
  }
  for (const bucket of groups.values()) {
    if (bucket.length < 2) continue;
    const best = bucket.reduce((a, b) => (b.amount > a.amount ? b : a));
    // Nothing supersedes nothing. Above BC's phase-out ceiling every member of the group is
    // worth zero, and `reduce` still names one of them the winner — which used to mark the
    // rest "superseded" and claim a choice the buyer never got. When no member pays, each row
    // keeps the status it earned (phasedOut, overCeiling, ftbOnly), which is the true reason.
    if (best.amount <= 0) continue;
    for (const c of bucket) {
      if (c === best) continue;
      // A row worth nothing already carries the status that explains its own zero —
      // `ftbOnly`, `phasedOut`, `overCeiling`, `none` — same reasoning as the
      // `best.amount <= 0` guard above, just per-row instead of per-bucket. Relabelling it
      // `superseded` (or `tied`) on top of that used to tell a non-first-time buyer "You
      // qualify for this" for a programme whose OWN test they failed, because a paying
      // sibling elsewhere in the group made `best.amount` positive. Only a row that is
      // itself worth money and lost can be superseded or tied.
      if (c.amount <= 0) continue;
      // Nothing supersedes an equal either. `superseded` renders as "another rebate here is
      // worth more — only one can be claimed, so that one is applied instead", and on an
      // exact tie the first half of that sentence is false. It is an ordinary band, not a
      // corner: BOTH BC exemptions forgive the entire tax on a new build a first-time buyer
      // pays $500,000 or less for, because the first-time-buyer one is computed on the first
      // $500,000 and there is nothing above it to leave behind.
      //
      // `tied` keeps the row — dropping it used to be how a buyer learned about ONE eligible
      // programme instead of two. It still cannot be double-counted, so its amount is
      // zeroed like ftbOnly's and superseded's zero rows are; `best` alone carries the
      // dollar figure that actually reduces the bill, and which member of the tie is `best`
      // is arbitrary (the first one built), not a claim that it pays more.
      // Cent precision, not `===`: both amounts are the product of tax-bracket arithmetic on
      // a price, and two derivations that agree to the dollar can still differ in the last
      // bit of a float. `bracketTax` sums per-band multiplications, so an exact tie is not
      // guaranteed to survive floating point even when the underlying math is identical.
      if (Math.round(c.amount * 100) === Math.round(best.amount * 100)) {
        c.amount = 0;
        c.st = "tied";
        continue;
      }
      c.amount = 0;
      c.st = "superseded";
    }
  }

  for (const c of j.taxTime) {
    // Tax-time credits are first-time-buyer credits by default; `when` narrows further.
    if (!o.ftb) continue;
    if (!applies(c.when, o)) continue;
    later.push({ key: c.key, ex: c.ex, amount: c.amount });
  }
  /**
   * The first-time buyers' GST/HST rebate is DELIBERATELY NOT REPORTED AS MONEY.
   *
   * `buildLines` has no GST line, so paying the rebate out produced a new build whose closing
   * bill was byte-identical to a resale's plus a refund of up to `gstFthb.cap` ($50,000) — a
   * five-figure credit against a tax this app never charged. A repeat buyer, meanwhile, got
   * neither the charge nor the rebate, so the two property types differed by the rebate alone
   * and in the wrong direction.
   *
   * Charging 5% is NOT the fix and must not be taken as one:
   *
   * - Five provinces levy HST, not GST — 13% in Ontario, 15% in the four Atlantic provinces —
   *   so a flat 5% would understate the tax by up to two thirds while presenting itself as
   *   *the* tax. Modelling it needs a per-province rate with its own primary-source read.
   * - `benchmarkPrice()` resolves `newbuild` to the RESALE HOUSE benchmark, because no
   *   publisher produces a new-build price level in Canada. A resale benchmark is a
   *   GST-inclusive market price; adding 5% to it invents a tax on a number that already
   *   contains one. A real charge needs the builder's own price as an input.
   *
   * Until both exist, the programme is reported as an OMISSION rather than as a refund: the
   * key travels so a page can disclose it in words, and no dollar amount travels with it.
   *
   * The PRICE TEST is not decoration and must not be dropped as one. The rebate phases to
   * nil at `gstFthb.zeroAt`, so above that price the programme does not apply at all — and
   * the page renders this list under "Applies here, and not priced". Without the test the
   * eyebrow asserted applicability over a paragraph saying the rebate is nil, on DEFAULT
   * settings in the two most expensive markets: `ftb` defaults true and `benchmarkPrice()`
   * resolves `newbuild` to the resale house benchmark, which is $1,822,900 in Vancouver and
   * $1,529,900 in Toronto, both above the $1,500,000 cut-off. The superseded implementation
   * had this test as `amt > 0`; reporting the programme as an omission rather than as money
   * changed what travels, not whether it applies.
   */
  const omitted: { key: string; ex: string }[] = [];
  if (F.country === "ca" && o.ftb && o.ptype === "newbuild" && o.price < F.gstFthb.zeroAt) {
    omitted.push({ key: "cr_gstFthb", ex: "ex_gstFthb" });
  }
  // US: no federal or Texas rebate programme exists at all — no first-time-buyer transfer-tax
  // rebate (there is no transfer tax to rebate), no GST/HST-style rebate. `atClosing`/`later`
  // are already empty because `j.rebates`/`j.taxTime` are empty on every US record; this is the
  // one line that explains WHY, in words, rather than leaving a Canadian reader's "where are my
  // rebates" question unanswered by silence.
  if (F.country === "us") {
    omitted.push({ key: "cr_noRebateUs", ex: "ex_noRebateUs" });
  }
  return {
    atClosing,
    later,
    /**
     * Programmes that apply to this purchase and that this app deliberately does not price.
     * Not a zero row and not a silence: a page renders `ex` as a named omission, in the
     * treatment `omissions.ts` already uses on Rent vs Buy.
     */
    omitted,
  };
}

/** Total cash at closing without the itemised table — for screens that only need the number. */
export function closingTotal(j: Jurisdiction, F: CountryRules, o: ClosingInput) {
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
  residency: Residency;
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
export function defaultContractRate(F: CountryRulesBase, dpPct: number): number {
  return (dpPct < 20 ? F.rates.insured : F.rates.uninsured) * 100;
}

/**
 * Two ceilings, computed side by side: `ceiling` is what a lender's GDS/TDS stress test would
 * approve; `comfort` is what actually fits inside the household's real monthly budget. Mirrors
 * the Affordability tab of the Winnipeg reference model.
 */
/**
 * The share of a purchase price that ends up as mortgage debt at this down payment,
 * CMHC premium included.
 *
 * This exists because both ceilings below are solved for price, so the loan has to be
 * expressed as a FRACTION of the unknown rather than as a dollar figure. It replaces a
 * hardcoded `0.8` — a flat 20%-down assumption carried over from the source model —
 * which made the down payment control point the wrong way: it changed the interest rate
 * (`defaultContractRate` picks the insured rate below 20% and the uninsured rate at or
 * above it) while never changing the size of the loan. A 5% buyer therefore got the
 * cheaper insured rate applied to an 80% mortgage, with neither the extra 15% of debt
 * nor the premium, and the page reported that putting LESS down let them afford MORE.
 * Measured in Winnipeg at a 30-year amortization: $398,313 at 5% against $389,015 at
 * 25%, where the true figures run the other way, $344,739 against $405,995.
 *
 * The premium rate depends only on the down payment and the amortization, never on the
 * price, so the ceiling equations stay linear and solvable.
 *
 * NO FIXED POINT IS NEEDED, and a review asked. The premium band is selected by LTV,
 * which depends only on `dpPct` — never on the price — so the fraction is closed form
 * and both ceiling equations stay linear in the unknown. Verified by sweeping `dpPct`
 * 1 through 40 in Toronto and Winnipeg at both amortizations: no non-monotonic point,
 * Toronto running $341,019 at 5% up to $526,275 at 40%.
 *
 * TWO BOUNDARIES ARE NOT MODELLED HERE, both of them pre-existing, and this is the
 * record of what they cost so nobody has to re-derive it:
 *
 * - `minDown` is progressive, so a flat 5% is below the legal minimum on anything over
 *   $500,000. Toronto, 30 years, first-time buyer, $150,000 income at 5% solves to a
 *   $753,250 ceiling, offering $37,663 of deposit against a $50,325 legal minimum.
 * - Insurance is unavailable at or above `cmhc.insuredCap`, so a sub-20% ceiling that
 *   solves above $1.5M is unreachable at that deposit — $400,000 income at 10% solves
 *   to $2,171,714, where the minimum is 20% and the premium this function charged does
 *   not exist.
 *
 * `scenario()` enforces the floor against the reader's TARGET price
 * (`down = Math.max(requested, floor)` plus `belowMinimum`), and `resolveInputs`
 * raises `dpPct` there too, so the same product answers this two ways.
 *
 * It is left alone DELIBERATELY, not overlooked. Enforcing it means clamping the
 * solved ceiling to the highest price this deposit percentage can legally buy — for a
 * 5% buyer, $500,000 at any income — and this codebase's rule is that nothing clamps
 * silently. A clamp the reader can see is new copy in four locales saying "your 5%
 * deposit caps you here regardless of income", which is a product decision about the
 * flagship figure, not a review fix. Whoever takes it: the binding price is where
 * `dpPct/100` meets `minDown(F, P)/P`, which is closed form off `minDown.bands`.
 */
export function financedFraction(F: CountryRules, dpPct: number, amortYears: number): number {
  const ltv = 1 - dpPct / 100;
  // US PMI is never financed into the loan — see `financing()`'s own doc comment. The
  // financed fraction is simply the LTV, no premium term added.
  if (F.country === "us") return ltv;
  if (dpPct >= 20) return ltv;
  const band = F.cmhc.bands.find((b) => ltv <= b[0]) ?? F.cmhc.bands[F.cmhc.bands.length - 1];
  return ltv * (1 + band[1] + (amortYears > 25 ? F.cmhc.longAmortSurcharge : 0));
}

export function affordability(j: Jurisdiction, F: CountryRules, o: AffordabilityInput) {
  const gross = o.income1 + o.income2 + o.otherIncome;
  const qualIncome = gross * (1 - o.haircut / 100);
  // US: no B-20-style stress test exists — qualify at the bare contract rate (design spec,
  // "stressTest null -> qualify at the contract rate"). Canadian arithmetic below is
  // untouched: F.stressTest is never null on that branch.
  const qualRate = F.stressTest
    ? Math.max(F.stressTest.floor, o.contractRate + F.stressTest.buffer) / 100
    : o.contractRate / 100;
  // US mortgages compound MONTHLY, not semi-annually — payFactor() is the Canadian formula
  // (see its own doc comment). Every payment-factor call in this function goes through this
  // one switch so a US branch cannot accidentally keep using the Canadian compounding.
  const factorFn = F.country === "us" ? payFactorMonthly : payFactor;
  const fq = factorFn(qualRate, o.amortYears);
  const fc = factorFn(o.contractRate / 100, o.amortYears);

  const gdsAllow = (qualIncome * (F.gds / 100)) / 12;
  const tdsAllow = (qualIncome * (F.tds / 100)) / 12 - o.debts;
  const binding = Math.min(gdsAllow, tdsAllow);
  const tdsBinds = tdsAllow < gdsAllow;

  // Solved so property tax scales with price, at the loan this down payment actually
  // produces rather than at a flat 80% — see financedFraction above.
  //
  // The flat `0.8` IS GONE. A review reported it still here; it is not, and the check
  // is one line: `financed` below is `financedFraction(F, o.dpPct, o.amortYears)`, and
  // `denomLender` multiplies THAT. Nothing in this file multiplies `fq` by a constant.
  const financed = financedFraction(F, o.dpPct, o.amortYears);
  const denomLender = financed * fq + j.propTax.effective / 12;
  // No heat allowance concept exists on a US mortgage qualification — CMHC's GDS/TDS
  // guidance is what invented this line for Canada. Zero, not omitted, so the arithmetic
  // below stays one formula for both countries.
  const heatAllowance = F.country === "ca" ? F.heatAllowance : 0;
  // A US homestead exemption is a constant dollar credit against the property-tax RATE term
  // above — see propertyTaxCredit()'s own comment for the algebra. Zero on every Canadian
  // record (no jurisdiction here carries `propTax.exemptions`).
  const propTaxCreditMonthly = propertyTaxCredit(j) / 12;
  /**
   * The ceiling this household would reach carrying `debts` of monthly obligation.
   * Parameterised because the debt-impact figures below are the DIFFERENCE between
   * two ceilings, not a marginal rate multiplied out.
   */
  const ceilingCarrying = (monthlyDebts: number) => {
    if (qualIncome <= 0) return 0;
    const tds = (qualIncome * (F.tds / 100)) / 12 - monthlyDebts;
    const binds = Math.min(gdsAllow, tds);
    // HALF the condo fee, because that is what CMHC's GDS/TDS guidance tells a lender to
    // count — and the full fee two lines below, because that is what the household pays.
    // Both are correct and they are not the same figure; the screen has to say so, which is
    // why the share is a named federal rule with provenance rather than a bare 0.5.
    return Math.max(0, (binds - heatAllowance - o.condoFee * F.condoFeeInclusion + propTaxCreditMonthly) / denomLender);
  };
  const ceiling = ceilingCarrying(o.debts);

  const budget = o.comfortCeiling - o.insuranceAnnual / 12 - o.utilities - o.condoFee + propTaxCreditMonthly;
  const denomComfort = financed * fc + j.propTax.effective / 12 + F.maintenanceReserve / 12;
  const comfort = Math.max(0, budget) / denomComfort;

  // The target price, actually financed at the actual down payment.
  const cc = closingTotal(j, F, {
    price: o.price,
    dpPct: o.dpPct,
    ftb: o.ftb,
    ptype: o.ptype,
    amortYears: o.amortYears,
    elsewhere: o.elsewhere,
    residency: o.residency,
  });
  // Priced off the entered contract rate — the same rate that drives the comfort ceiling above
  // — so the "what fits your budget" card and the monthly P&I row can never disagree, and the
  // rate input actually moves every figure on the screen.
  const pi = cc.fin.loan * factorFn(o.contractRate / 100, o.amortYears);
  const monthly = {
    pi,
    propTax: propertyTaxAnnual(j, o.price) / 12,
    insurance: o.insuranceAnnual / 12,
    // PMI — zero on every Canadian record, since CA's `financing()` branch always returns
    // `monthlyInsurance: 0`. Included in `total` below, so a US comfort ceiling that ignores
    // it cannot ship.
    pmi: cc.fin.monthlyInsurance,
    utilities: o.utilities,
    condoFee: o.condoFee,
    maintenance: (o.price * F.maintenanceReserve) / 12,
    total: 0,
  };
  monthly.total =
    monthly.pi + monthly.propTax + monthly.insurance + monthly.pmi + monthly.utilities + monthly.condoFee + monthly.maintenance;

  // What a lender counts at the target price: a fixed heating allowance, not real utilities
  // (zero on the US branch — see heatAllowance above). PMI is added to the numerator on the
  // US branch too, exactly as a lender's own DTI calculation would.
  const gdsAtTarget =
    qualIncome <= 0
      ? 0
      : ((cc.fin.loan * fq + cc.fin.monthlyInsurance + monthly.propTax + heatAllowance + o.condoFee * F.condoFeeInclusion) / (qualIncome / 12)) * 100;
  const tdsAtTarget =
    qualIncome <= 0
      ? 0
      : ((cc.fin.loan * fq + cc.fin.monthlyInsurance + monthly.propTax + heatAllowance + o.condoFee * F.condoFeeInclusion + o.debts) / (qualIncome / 12)) * 100;

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
    // All three follow the same down payment the ceilings were solved at, so the
    // breakdown rows cannot describe a different mortgage from the price above them.
    impliedMortgage: ceiling * financed,
    comfortDown: (comfort * o.dpPct) / 100,
    comfortPI: comfort * financed * fc,
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
  /** True for the first year of a new term. Always false on a US (toMaturity) schedule — there
   * are no terms to renew. */
  renewed: boolean;
  /** US only: PMI paid during this year (0 once it has terminated, or on every Canadian row —
   * the CMHC premium is a one-time amount financed into the loan, not a recurring line here). */
  insurance?: number;
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
 *
 * `F.mortgage.kind === "toMaturity"` (the US) takes a wholly separate path below: no
 * re-pricing at ANY boundary — `termYears`/`renewalRate` are ignored entirely, matching the
 * design spec's "no term, no renewal, no re-pricing" — monthly, not semi-annual, compounding,
 * and PMI charged into each row while `fin.insuranceMonths` says it applies.
 */
export function amortization(F: CountryRules, o: AmortizationInput) {
  if (F.country === "us") return amortizationToMaturity(F, o);
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

/**
 * The US (toMaturity) amortization path — a 30-year fixed compounds MONTHLY (`payFactorMonthly`,
 * not the Canadian `payFactor`) at ONE rate for the whole life of the loan. `termYears` and
 * `renewalRate` are ignored entirely: there is no term to renew. `paymentAfterRenewal` equals
 * `firstPayment` and `shock` is always zero — the same values the Canadian branch already
 * returns when no renewal is modelled, so a caller reading either field sees the honest "no
 * shock" answer rather than a second sentinel.
 *
 * PMI is charged into each row while `fin.insuranceMonths` says it still applies, and reflected
 * in `totalPaid` (`fin.monthlyInsurance` is NOT part of the mortgage payment `pay` itself — it
 * is billed alongside it, not amortized).
 */
function amortizationToMaturity(F: UsRules, o: AmortizationInput) {
  const fin = financing(F, o);
  const rate = o.contractRate / 100;
  const i = rate / 12;
  const pay = fin.loan * payFactorMonthly(rate, o.amortYears);
  const firstPayment = pay;

  let bal = fin.loan;
  const rows: AmortizationRow[] = [];
  let totalInterest = 0;
  let totalPaid = 0;

  for (let t = 1; t <= o.amortYears && bal > 0.005; t++) {
    const opening = bal;
    let interest = 0;
    let principal = 0;
    let insurance = 0;
    for (let m = 0; m < 12 && bal > 0.005; m++) {
      const monthIndex = (t - 1) * 12 + m + 1;
      const int = bal * i;
      const prin = Math.min(pay - int, bal);
      bal -= prin;
      interest += int;
      principal += prin;
      if (fin.insuranceMonths !== null && monthIndex <= fin.insuranceMonths) {
        insurance += fin.monthlyInsurance;
      }
    }
    if (bal < 0.005) bal = 0;
    totalInterest += interest;
    totalPaid += interest + principal + insurance;
    rows.push({ t, opening, interest, principal, closing: bal, payment: pay, rate: rate * 100, renewed: false, insurance });
  }

  return {
    fin,
    rows,
    totalInterest,
    totalPaid,
    firstPayment,
    peakPayment: firstPayment,
    paymentAfterRenewal: firstPayment,
    shock: 0,
    term: o.amortYears,
    payoffYear: rows.length,
  };
}

export type AmortizationResult = ReturnType<typeof amortization>;

/* ================================================================= *
 * Down payment — where the money actually comes from
 * ================================================================= */

/** Combined federal + provincial marginal rate on the next dollar of taxable income. */
export function marginalRate(F: CountryRulesBase, prov: string, income: number): number {
  const tbl = F.marginal[prov] ?? F.marginal[F.marginalFallbackKey];
  for (const [cap, rate] of tbl) if (cap === null || income <= cap) return rate;
  return tbl[tbl.length - 1][1];
}

/**
 * Tax on the slice of income between `from` and `to`, integrated over the bracket table.
 *
 * This exists because a large deduction is not priced at the top marginal rate. The RRSP
 * screen used to compute its refund as `contribution * marginalRate(income)`, which on the
 * defaults — $60,000 contributed against $75,000 of Ontario income — priced the whole
 * $60,000 at 29.65% and printed ~$17,790. The deduction actually walks the taxpayer DOWN
 * through three brackets to $15,000, and the true saving is ~$13,842: a 29% overstatement,
 * in the flattering direction, as that page's hero figure.
 *
 * The table is `[[ceiling, rate], …]` ascending, the ceiling INCLUSIVE and the final one
 * null — the same convention `marginalRate` reads, so the two can never drift apart.
 *
 * Note what this inherits: `federal.marginal` is `conf: "assumption"`, an unverified
 * prototype carry-over. Integrating it correctly makes the arithmetic honest, not the
 * brackets sourced; a figure derived from it still may not travel as a statutory claim.
 */
export function taxOnBand(F: CountryRulesBase, prov: string, from: number, to: number): number {
  const lo = Math.max(0, Math.min(from, to));
  const hi = Math.max(0, Math.max(from, to));
  if (hi <= lo) return 0;
  const tbl = F.marginal[prov] ?? F.marginal[F.marginalFallbackKey];
  let prev = 0;
  let tax = 0;
  for (const [cap, rate] of tbl) {
    const top = cap === null ? hi : Math.min(hi, cap);
    const bottom = Math.max(lo, prev);
    if (top > bottom) tax += (top - bottom) * rate;
    if (cap === null || hi <= cap) break;
    prev = cap;
  }
  return tax;
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
  /**
   * Why this source is unavailable, when it is. `"ftb"` means the programme is open only to
   * a first-time home buyer and the reader has said they are not one.
   *
   * Shaped as a discriminator on a row that is still PRESENT with `avail: 0`, mirroring
   * `CreditLine.st === "ftbOnly"` rather than inventing a second convention: dropping the
   * row would tell a reader who has $40,000 in an FHSA that the app simply forgot it, where
   * showing it blocked tells them the rule that stops them using it here.
   *
   * `"noProgram"` is the US case: FHSA, HBP and TFSA are Canadian registered-account
   * programmes with no US analogue at all (not merely gated by first-time-buyer status), so
   * a US call ignores whatever the caller passed for those three inputs and reports why —
   * the same "keep the row, explain the zero" treatment as `"ftb"`, for a different reason.
   */
  blocked?: "ftb" | "noProgram";
}

export interface WaterfallInput {
  need: number;
  prov: string;
  /**
   * First-time home buyer. Required, not optional with a default: an FHSA withdrawal and an
   * HBP withdrawal are both qualifying-home-buyer programmes in law, and defaulting the flag
   * either way would silently pick an answer for a reader the caller can simply ask.
   */
  ftb: boolean;
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
 * screen: FHSA, cash and a gift first because they are free, HBP and TFSA next
 * because they carry strings, and non-registered last because selling it
 * triggers tax. A user who reorders this is choosing to pay more, and the fixed
 * order is what makes that visible.
 *
 * `gift` used to sit BELOW `hbp` and `tfsa`, so the page drained fifteen years
 * of RRSP repayment obligation and a year of TFSA room before touching money
 * that costs nothing at all — under a heading reading "drawn in this order
 * because each source costs more than the one above it". Its `cost` field said
 * `free` the whole time; the array said otherwise, and the array is what renders.
 *
 * FHSA and HBP are gated on first-time-buyer status because both are
 * qualifying-home-buyer programmes in law. A blocked source keeps its row with
 * `avail: 0` and `blocked: "ftb"` rather than disappearing — see WaterfallRow.
 *
 * Tax on a partial non-registered draw is pro-rated by the fraction of the
 * account sold — selling a third of the account realises a third of the gain.
 *
 * US sources are `cash`, `gift` and `nonreg` only — no FHSA, HBP or TFSA analogue exists.
 * `fhsa`/`hbp`/`tfsa` on `WaterfallInput` are IGNORED on that branch, whatever the caller
 * passed: each row's `avail` is forced to zero and `blocked: "noProgram"` names why, rather
 * than silently drawing on a Canadian registered-account balance a US reader would not have
 * anyway. The IRA first-time-buyer $10,000 penalty exception (dossier A15) is NOT modelled —
 * flagged here as a follow-up rather than added ahead of a page that would surface it.
 */
export function waterfall(F: CountryRules, o: WaterfallInput) {
  const rate = marginalRate(F, o.prov, o.income);
  const hbpRoom = F.country === "ca" ? Math.min(Math.max(0, o.rrsp), F.hbp.max) : 0;
  const ftbOnly = o.ftb ? undefined : ("ftb" as const);
  const noProgram = F.country === "us" ? ("noProgram" as const) : undefined;
  const defs: {
    key: SourceKey;
    avail: number;
    cost: SourceCost;
    gain?: number;
    blocked?: "ftb" | "noProgram";
  }[] = [
    { key: "fhsa", avail: noProgram ? 0 : o.ftb ? Math.max(0, o.fhsa) : 0, cost: "free", blocked: noProgram ?? ftbOnly },
    { key: "cash", avail: Math.max(0, o.cash), cost: "free" },
    { key: "gift", avail: Math.max(0, o.gift), cost: "free" },
    { key: "hbp", avail: noProgram ? 0 : o.ftb ? hbpRoom : 0, cost: "strings", blocked: noProgram ?? ftbOnly },
    { key: "tfsa", avail: noProgram ? 0 : Math.max(0, o.tfsa), cost: "strings", blocked: noProgram },
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
      // Canada includes a FRACTION of the gain in ordinary income, taxed at the marginal rate
      // (`kind: "inclusion"`); the US taxes a realised long-term gain at its OWN flat rate,
      // unrelated to ordinary-income brackets (`kind: "flat"`) — see CountryRulesBase.gains.
      tax = F.gains.kind === "inclusion" ? gainRealised * F.gains.rate * rate : gainRealised * F.gains.rate;
    }
    if (d.key === "hbp" && drawn > 0 && F.country === "ca") repayAnnual = drawn / F.hbp.repayYears;
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
      blocked: d.blocked,
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
export function glidePath(F: CountryRulesBase, shortfall: number, monthly: number, months = 36) {
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
  /**
   * Taxable income BEFORE the contribution is deducted. The refund is the tax on the slice
   * the deduction removes, so the function needs the income and the province rather than a
   * single rate — see `taxOnBand`. It used to take a pre-computed `marginalRate`, which
   * priced a $60,000 deduction entirely at the top rate.
   */
  income: number;
  prov: string;
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
 * - `taxIfMissed` — what a missed repayment year costs, because that is
 *   the real risk: the missed amount is added to income and taxed at the
 *   marginal rate, permanently, with no way to put it back.
 *
 * Whether the refund is worth fifteen years of obligation depends on facts this
 * function is not given. The screen states the three numbers and lets the reader
 * decide, rather than asserting an answer it cannot support.
 */
export function hbpPlay(F: CaRules, o: HbpInput) {
  const contribution = Math.max(0, Math.min(o.contribution, F.hbp.max));
  const income = Math.max(0, o.income);
  // The rate on the NEXT dollar, which is what the deduction's first dollar saves and what
  // a missed repayment year costs. Correct for both of those and for neither of the refund.
  const rate = marginalRate(F, o.prov, income);
  // The refund is the tax on the band the deduction REMOVES — from the income down to what
  // is left of it — not the contribution priced at the top rate. On the defaults that is the
  // difference between ~$13,842 and ~$17,790, on the page's hero figure.
  const refund = taxOnBand(F, o.prov, Math.max(0, income - contribution), income);
  const requestedWithdraw = Math.max(0, o.withdrawAmount);
  const withdraw = Math.min(requestedWithdraw, contribution, F.hbp.max);
  /**
   * The model is "contribute, then withdraw what you contributed", so a withdrawal above
   * the new contribution is cut back to it — and a reader who already holds $60,000 in an
   * RRSP, contributes nothing further and asks to withdraw it therefore sees the entire
   * screen collapse to $0 with no explanation.
   *
   * The clamp is NOT removed here: whether the page should model a withdrawal against an
   * existing balance is a product question, and changing the arithmetic underneath the
   * copy would be worse than the silence. What is fixed is the silence — the page can now
   * say which of its two inputs bound the answer.
   */
  // Equivalent to `requestedWithdraw > withdraw`, and deliberately not written that way: the
  // contribution is ALWAYS the binding cap when a withdrawal is cut back, because it is
  // itself already capped at F.hbp.max two lines above. Naming the reason keeps the next
  // reader from "simplifying" it into a flag that also fires on the federal maximum.
  const clampedByContribution = requestedWithdraw > contribution;
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
    /**
     * The TAX on a missed repayment year, not the income added.
     *
     * The income added is `repayAnnual` — miss a year and that amount is
     * included in income. This is what that inclusion costs at the marginal
     * rate. It was called `inclusionIfMissed`, which in tax vocabulary names the
     * income inclusion rather than the tax on it, and the RRSP-HBP screen duly
     * printed "Added to your income for each year missed" beside this value —
     * out by a factor of the marginal rate. Renamed so the next reader cannot
     * make the same substitution.
     */
    taxIfMissed: repayAnnual * rate,
    /**
     * The marginal rate the screen displays. Still returned, and still correct for what it
     * labels — the next dollar — even though the refund above is no longer computed from it.
     */
    marginalRate: rate,
    /** True when `withdrawAmount` was cut back to the contribution. */
    clampedByContribution,
    /** What the reader actually asked to withdraw, for the sentence explaining the clamp. */
    withdrawRequested: requestedWithdraw,
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
 * Whether the rent this jurisdiction publishes describes the dwelling being priced.
 *
 * Every `rent` in the dataset is a CMHC two-bedroom apartment average, and
 * `bench.house` beside it is a detached house. Running the comparison across
 * that gap is not a close call — on Toronto's own figures it is a $1,455,200
 * house against a $2,045 apartment, and the record's provenance note already
 * says the condo-apartment average is $2,891, "a different and higher
 * quantity". The verdict that falls out is about two different lives.
 *
 * So an apartment rent answers a CONDO purchase and nothing else. For a house
 * or a new build there is no comparable published rent in Canada, which makes
 * this the same shape as `priceKnown`: the honest move is to ASK rather than to
 * answer from the wrong series. `resolveInputs` turns a false here into
 * `rentKnown: false`, and the page's existing ask state does the rest.
 *
 * A rent the READER gave is always comparable — they know what they would rent.
 */
export function rentComparable(j: Jurisdiction, ptype: PropertyType): boolean {
  if (j.rentBasis === undefined) return false;
  // The one basis the dataset holds. `newbuild` reads the house benchmark
  // (see `benchmarkPrice`), so it inherits the house answer.
  return j.rentBasis === "apartment2br" && ptype === "condo";
}

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
   * The contract rate the reader is actually being quoted, as a fraction.
   *
   * Optional, and absent means "derive it from the down payment" — the same
   * default every other page starts from. It exists because this page used to
   * read `F.rates.insured` / `.uninsured` directly and could not be told
   * otherwise: `RentVsBuyInput extends ClosingInput extends FinancingInput`,
   * none of which carries a rate. A reader who set their real rate on
   * Affordability or Amortization saw it honoured there and silently ignored
   * here, on the page that projects it forward for forty years.
   */
  contractRate?: number;
  /** Years per mortgage term. The mortgage is re-priced at the end of each one. */
  termYears: number;
  /**
   * The rate to renew at, as a fraction. `null` means model no renewal shock —
   * which is a CHOICE the reader makes, and no longer the silent default it was
   * when this page could not see the input at all.
   */
  renewalRate: number | null;
  /**
   * Invest the monthly difference between owning and renting. Off compares bare
   * outlays; on compares terminal wealth, which is the only comparison that does
   * not quietly credit the owner with forced saving the renter never did.
   */
  investDiff: boolean;
  years: number;
  /**
   * US only: taxable income, filing single (the assumption per the design spec), for the
   * itemised-vs-standard deduction benefit's marginal rate. Optional and defaults to $0 (the
   * lowest bracket) — no page wires a real income input to Rent vs Buy today; ignored entirely
   * on the Canadian branch.
   */
  taxableIncome?: number;
}

export interface RentVsBuyRow {
  t: number;
  opening: number;
  interest: number;
  paid: number;
  balance: number;
  propTax: number;
  insurance: number;
  /** In-suite services. Charged to BOTH sides — a tenant pays hydro too. */
  services: number;
  /** Strata / condo fee. Owner only; a tenant's rent already buys the building. */
  strata: number;
  /** The contract rate in force this year, as a fraction. Changes at renewal. */
  rate: number;
  /** Tax-time rebates received in year 1, grown at the investment return. */
  taxTimeCredits: number;
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
  /**
   * What selling this home in this year costs — the exact amount `equity` nets off,
   * returned rather than left for a screen to re-derive.
   *
   * The page printed `homeValue * federal.sellingCost` beside the equity row it
   * explains. The two agreed only by construction: change the selling-cost model here
   * — a floor, a per-jurisdiction commission, a land transfer tax on the sale — and the
   * row silently stops describing the figure directly beneath it.
   */
  sellingCost: number;
  equity: number;
  /** Terminal wealth if you bought. */
  buyW: number;
  /** Terminal wealth if you rented. */
  rentW: number;
  /** buyW − rentW. Positive means buying is ahead by this year. */
  adv: number;
  /**
   * US only: this year's itemised-deduction benefit over the standard deduction — mortgage
   * interest (capped at the acquisition-debt cap's SHARE of the loan) plus property tax
   * (capped at the SALT cap), less the standard deduction, times the marginal rate; zero when
   * the standard deduction would have been larger. Invested alongside everything else rather
   * than subtracted from `ownerOutlay` directly — see `rentVsBuyToMaturity`'s own comment.
   */
  deductionBenefit?: number;
  /** US only: whether itemising beat the standard deduction THIS year — most buyers, per the
   * design spec's own framing, get nothing from the deduction. */
  itemizedBeatsStandard?: boolean;
  /** US only: PMI actually charged THIS year, already folded into `ownerOutlay` — broken out
   * here so a screen can show the line item without re-deriving it from `fin.monthlyInsurance`
   * and `fin.insuranceMonths` a second time. Undefined on the Canadian branch, whose CMHC
   * premium is a one-time amount financed into the loan, not a recurring cost. */
  pmi?: number;
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
 *
 * `F.country === "us"` branches to `rentVsBuyToMaturity()` below — a separate function rather
 * than more `if`s threaded through this one, because the US path changes FOUR things at once
 * (compounding, no renewal, PMI, and the tax treatment of both the sale gain and the invested
 * difference) and interleaving them here would make neither branch legible.
 */
export function rentVsBuy(j: Jurisdiction, F: CountryRules, o: RentVsBuyInput) {
  if (F.country === "us") return rentVsBuyToMaturity(j, F, o);
  const years = Math.max(1, o.years);
  const fin = financing(F, o);
  const cc = closingTotal(j, F, o);
  // The cash the buyer must actually PRODUCE on closing day, which is what the
  // renter has to invest instead — so `net`, not `fin.down + cc.total`.
  //
  // `closingTotal` returns both, and the difference is `creditsAtClosing`: the
  // rebates a jurisdiction applies AT the closing table rather than at tax time.
  // A Toronto first-time buyer collects $8,475 of them (the Ontario land transfer
  // tax rebate plus Toronto's municipal one), and charging the renter with
  // investing money the buyer never had to find credited them ~$13,300 of phantom
  // wealth over ten years at the balanced return — tilting the verdict toward
  // renting, on the one page whose whole job is to weigh the two.
  //
  // It is also the figure this page PRINTS, under a Trace cross-link asserting it
  // is the Closing Costs page's own answer. That page's hero is `net`, so gross
  // here made the two disagree by the rebate on a link whose contract is that they
  // agree to the dollar. One source, both places.
  //
  // The CMHC premium is correctly absent from all of this: `financing()` adds it
  // to the loan, so it is never upfront cash. The provincial sales tax ON the
  // premium is not financeable and IS in `cc.total`, where it belongs.
  const upFront = cc.net;
  // The reader's own rate when they gave one, otherwise the same derivation every
  // other page starts from. Not `F.rates.insured` read directly, which is what made
  // this the one page that ignored an override the reader had already set.
  // `/ 100` because `defaultContractRate` returns a PERCENTAGE while everything in
  // this function is a fraction. Without it the loan never amortizes.
  const rate0 = o.contractRate ?? defaultContractRate(F, o.dpPct) / 100;
  const g = o.appreciationOn ? o.appreciation : 0;
  const ret = o.investReturn;

  let bal = fin.loan;
  let rp = 0;
  let bp = 0;
  let payoffYear: number | null = null;
  const rows: RentVsBuyRow[] = [];

  // A Canadian mortgage is priced for a TERM, not for its amortization, and this
  // page projects across up to forty years of them. Holding `rate0` for the whole
  // horizon handed the buyer a fixed rate no Canadian lender writes, while the
  // renter met full rent inflation every year — worth roughly $125,000 of the
  // verdict at a two-point renewal on Toronto's benchmark, always in buying's
  // favour. `Amortization.riskBody` one route away calls that exact assumption the
  // mistake that breaks budgets; this page used to make it silently, because
  // `renewalRate` could not reach it.
  //
  // `null` still means no shock — but now because the reader chose it.
  let rate = rate0;
  let i = Math.pow(1 + rate / 2, 2 / 12) - 1;
  let pay = fin.loan * payFactor(rate, o.amortYears);
  let renewedAt: number | null = null;

  for (let t = 1; t <= years; t++) {
    // Renewal lands at the START of the year after each whole term, and re-amortizes
    // the surviving balance over what is LEFT of the amortization — not over a fresh
    // one, which would quietly lower the payment by extending the loan.
    const termsElapsed = o.termYears > 0 ? (t - 1) / o.termYears : 0;
    if (
      o.renewalRate !== null &&
      bal > 0.005 &&
      t > 1 &&
      Number.isInteger(termsElapsed) &&
      termsElapsed >= 1
    ) {
      rate = o.renewalRate;
      i = Math.pow(1 + rate / 2, 2 / 12) - 1;
      const yearsLeft = Math.max(1, o.amortYears - (t - 1));
      pay = bal * payFactor(rate, yearsLeft);
      renewedAt ??= t;
    }
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
    // Insurance, utilities and condo fees grow at the cost of SERVICES, not at the price of
    // the house — so this is deliberately not `o.appreciation`. The rate itself moved to
    // the rules record with a provenance entry: as a module-local constant here it compounded for
    // up to forty years while being structurally unreachable by /sources, which builds its
    // inventory from the rules' provenance and the jurisdiction maps.
    const infl = Math.pow(1 + F.nonShelterInflation, t - 1);
    const propTax = o.price * Math.pow(1 + g, t - 1) * j.propTax.effective;
    const insurance = o.insuranceAnnual * infl;
    // Split, because only ONE half of this is a cost the renter escapes. A strata
    // fee buys the building; a tenant's rent already buys it. In-suite services —
    // hydro, heat where it is not included, internet — a tenant pays exactly as an
    // owner does, and charging them to owning alone put ~$50,000 into the renter's
    // column over ten years on the defaults, invested and compounded.
    const services = o.utilities * 12 * infl;
    const strata = o.condoFee * 12 * infl;
    const utilities = services + strata;
    // Grows at the cost of SERVICES, not at the price of the house. Materials and
    // trades inflate whether or not the market does, and tying this to `g` meant
    // switching appreciation off — the honest floor case the page offers precisely
    // so the verdict can be stress-tested — also froze the owner's largest recurring
    // cost, quietly flattering the case it was meant to test by ~$36,000.
    const maintenance = o.price * F.maintenanceReserve * infl;
    const ownerOutlay = paid + propTax + insurance + utilities + maintenance;
    // The tenant pays the same in-suite services the owner does. Rent, and the
    // building costs folded into it, are the parts that differ.
    const renterOutlay = o.rent * 12 * Math.pow(1 + o.rentInflation, t - 1) + services;
    const diff = ownerOutlay - renterOutlay;

    // Whoever spends LESS this year invests the difference. Only one side is
    // funded in any given year, which is what keeps the comparison symmetric.
    if (o.investDiff) {
      rp = rp * (1 + ret) + Math.max(0, diff);
      bp = bp * (1 + ret) + Math.max(0, -diff);
    }

    const homeValue = o.price * Math.pow(1 + g, t);
    const sellingCost = homeValue * F.sellingCost;
    const equity = homeValue - sellingCost - bal;
    // Rebates that arrive at TAX TIME rather than at the closing table — the home
    // buyers' amount, and the GST rebate where it applies. `upFront` already nets
    // off the at-closing ones; dropping these was the same omission one step later,
    // and it is the buyer's money either way. Received in the first year and
    // invested alongside everything else.
    const taxTimeCredits = cc.later * Math.pow(1 + ret, t - 1);
    const buyW = equity + taxTimeCredits + (o.investDiff ? bp : 0);
    const rentW = upFront * Math.pow(1 + ret, t) + (o.investDiff ? rp : 0);

    rows.push({
      t, opening, interest, paid, balance: bal, propTax, insurance, utilities, maintenance,
      services, strata, rate, taxTimeCredits,
      ownerOutlay, renterOutlay, diff,
      rp: o.investDiff ? rp : 0,
      bp: o.investDiff ? bp : 0,
      homeValue, sellingCost, equity, buyW, rentW, adv: buyW - rentW,
    });
  }

  return {
    fin, cc, upFront,
    /** The opening payment. It changes at renewal; every row carries its own rate. */
    pay,
    /** Percentage. The rate the mortgage OPENS at. */
    rate: rate0 * 100,
    /** Percentage, or null when no renewal shock is modelled. */
    renewalRate: o.renewalRate === null ? null : o.renewalRate * 100,
    /** First year the mortgage was re-priced. null when it never was. */
    renewedAt,
    rows,
    /** First year buying is ahead. null means never, inside the horizon modelled. */
    breakEven: rows.find((r) => r.adv > 0)?.t ?? null,
    payoffYear,
    years,
  };
}

/**
 * The US (toMaturity) Rent vs Buy path.
 *
 * Four things differ from the Canadian function above, all per the design spec:
 *
 * 1. **Compounding and renewal.** Monthly compounding (`payFactorMonthly`) at ONE contract
 *    rate for the whole horizon — no term, no renewal, ever. `o.termYears`/`o.renewalRate` are
 *    ignored entirely, the same choice `amortizationToMaturity()` makes.
 * 2. **PMI** is added to `ownerOutlay` for as long as `fin.insuranceMonths` says it applies —
 *    a real recurring cost a Canadian CMHC premium (financed once, up front) never is.
 * 3. **The itemised-vs-standard tax benefit.** Per the spec's own formula:
 *    `max(0, min(interest, interest * min(1, midCap/loan)) + min(propertyTax, saltCap) -
 *    standardDeduction.single) * marginalRate`. `min(interest, interest * min(1, midCap/loan))`
 *    collapses to `interest * min(1, midCap/loan)` (interest is never negative), reproduced
 *    literally rather than simplified so the formula stays checkable against the spec text.
 *    **Filing single is the assumption**, per the spec — `RentVsBuyInput.taxableIncome` is
 *    optional and defaults to $0 (the lowest bracket) when the caller does not supply it; this
 *    is a real gap the UI half must close by wiring an actual income input onto the page,
 *    flagged in the PR report rather than guessed at here. The benefit is invested into its
 *    own growing portfolio (`tbp`, mirroring `rp`/`bp`) rather than subtracted from
 *    `ownerOutlay` directly, because it is realised at tax-filing time, not at the moment the
 *    cost is incurred — the same reasoning `taxTimeCredits` already applies on the Canadian
 *    side, generalised to a benefit that recurs every year instead of arriving once.
 * 4. **Capital gains at "sale."** The owner's home-sale gain is excluded up to §121
 *    (`sec121.single`); the excess is taxed at the flat rate `F.gains.rate` (the US branch's
 *    `gains.kind` is always `"flat"`). The renter's and buyer's invested-difference portfolios
 *    (`rp`, `bp`, `tbp` — all just money in the market, regardless of which side funded them)
 *    face the SAME flat rate on their accumulated gain when "sold" for the wealth comparison —
 *    tracked via a running CONTRIBUTED total per portfolio (`afterGainsTax()` below), a FIFO-
 *    blind approximation rather than a lot-by-lot cost-basis simulation, disclosed here as a
 *    simplification rather than left silent.
 */
function rentVsBuyToMaturity(j: Jurisdiction, F: UsRules, o: RentVsBuyInput) {
  const years = Math.max(1, o.years);
  const rate0 = o.contractRate ?? defaultContractRate(F, o.dpPct) / 100;
  // `RentVsBuyInput.contractRate` is a FRACTION (its own doc comment says so); `FinancingInput`
  // — and therefore `financing()`'s `pmiTerminationMonth()` call — reads `contractRate` as a
  // PERCENTAGE (see that field's doc comment; `scenarioToMaturity()` normalises the same way).
  // `rate0` above is always the fraction, resolved once, so `priced` is the ONE place this
  // function converts it before anything downstream can see the wrong unit. Passing `o`
  // straight to `financing()`/`closingTotal()` here previously fed a fraction where a
  // percentage was expected — 0.0666 read as 0.0666%, not 6.66% — understating PMI's
  // auto-termination month by roughly half (month 49 instead of month 111 on $350k/10%/30y at
  // 6.66%, verified against `pmiTerminationMonth()` directly).
  const priced = { ...o, contractRate: rate0 * 100 };
  const fin = financing(F, priced);
  const cc = closingTotal(j, F, priced);
  const upFront = cc.net;
  const g = o.appreciationOn ? o.appreciation : 0;
  const ret = o.investReturn;
  const region = regionOf(j);
  const marginalIncome = o.taxableIncome ?? 0;
  const marginal = marginalRate(F, region, marginalIncome);
  const loanShare = fin.loan > 0 ? Math.min(1, F.tax.midCap / fin.loan) : 1;

  const flatGainsRate = F.gains.kind === "flat" ? F.gains.rate : 0;
  /** Value minus tax on its accumulated gain over `contributed`, at the flat LTCG rate — see
   * this function's own doc comment, point 4, for the FIFO-blind simplification. */
  const afterGainsTax = (value: number, contributed: number) =>
    value - Math.max(0, value - contributed) * flatGainsRate;

  const i = rate0 / 12;
  const pay = fin.loan * payFactorMonthly(rate0, o.amortYears);

  let bal = fin.loan;
  let rp = 0;
  let rpContrib = 0;
  let bp = 0;
  let bpContrib = 0;
  let tbp = 0;
  let tbpContrib = 0;
  let payoffYear: number | null = null;
  const rows: RentVsBuyRow[] = [];

  for (let t = 1; t <= years; t++) {
    const opening = bal;
    let interest = 0;
    let paid = 0;
    let insuranceThisYear = 0;
    for (let m = 0; m < 12 && bal > 0.005; m++) {
      const monthIndex = (t - 1) * 12 + m + 1;
      const int = bal * i;
      const prin = Math.min(pay - int, bal);
      bal -= prin;
      interest += int;
      paid += int + prin;
      if (fin.insuranceMonths !== null && monthIndex <= fin.insuranceMonths) {
        insuranceThisYear += fin.monthlyInsurance;
      }
    }
    if (bal < 0.005) {
      bal = 0;
      payoffYear ??= t;
    }
    const infl = Math.pow(1 + F.nonShelterInflation, t - 1);
    const price = o.price * Math.pow(1 + g, t - 1);
    const propTax = propertyTaxAnnual(j, price);
    const insurance = o.insuranceAnnual * infl;
    const services = o.utilities * 12 * infl;
    const strata = o.condoFee * 12 * infl;
    const utilities = services + strata;
    const maintenance = o.price * F.maintenanceReserve * infl;
    const pmi = insuranceThisYear;
    const ownerOutlay = paid + propTax + insurance + pmi + utilities + maintenance;
    const renterOutlay = o.rent * 12 * Math.pow(1 + o.rentInflation, t - 1) + services;
    const diff = ownerOutlay - renterOutlay;

    if (o.investDiff) {
      const rpDraw = Math.max(0, diff);
      const bpDraw = Math.max(0, -diff);
      rp = rp * (1 + ret) + rpDraw;
      rpContrib += rpDraw;
      bp = bp * (1 + ret) + bpDraw;
      bpContrib += bpDraw;
    }

    const itemizedInterest = interest * loanShare;
    const itemizedTax = Math.min(propTax, F.tax.saltCap);
    const itemized = itemizedInterest + itemizedTax;
    const itemizedBeatsStandard = itemized > F.tax.standardDeduction.single;
    const deductionBenefit = Math.max(0, itemized - F.tax.standardDeduction.single) * marginal;
    tbp = tbp * (1 + ret) + deductionBenefit;
    tbpContrib += deductionBenefit;

    const homeValue = o.price * Math.pow(1 + g, t);
    const sellingCost = homeValue * F.sellingCost;
    const homeGain = Math.max(0, homeValue - o.price);
    const taxableHomeGain = Math.max(0, homeGain - F.sec121.single);
    const homeGainTax = taxableHomeGain * flatGainsRate;
    const equity = homeValue - sellingCost - bal - homeGainTax;

    const buyW = equity + afterGainsTax(tbp, tbpContrib) + (o.investDiff ? afterGainsTax(bp, bpContrib) : 0);
    const rentW = afterGainsTax(upFront * Math.pow(1 + ret, t), upFront) + (o.investDiff ? afterGainsTax(rp, rpContrib) : 0);

    rows.push({
      t, opening, interest, paid, balance: bal, propTax, insurance, utilities, maintenance,
      services, strata, rate: rate0, taxTimeCredits: deductionBenefit,
      ownerOutlay, renterOutlay, diff,
      rp: o.investDiff ? rp : 0,
      bp: o.investDiff ? bp : 0,
      homeValue, sellingCost, equity, buyW, rentW, adv: buyW - rentW,
      deductionBenefit, itemizedBeatsStandard, pmi,
    });
  }

  return {
    fin, cc, upFront,
    pay,
    rate: rate0 * 100,
    /** Always null — a toMaturity mortgage never renews. */
    renewalRate: null,
    renewedAt: null,
    rows,
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
export function scenario(j: Jurisdiction, F: CountryRules, o: ScenarioInput) {
  if (F.country === "us") return scenarioToMaturity(j, F, o);
  const floor = minDown(F, o.price);
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
  const propTax = (o.price * j.propTax.effective) / 12;
  const maintenance = (o.price * F.maintenanceReserve) / 12;
  const monthly = {
    pi,
    propTax,
    insurance: o.insuranceAnnual / 12,
    // Always 0 on this (Canadian) branch — CMHC's premium is financed into the loan, not
    // billed monthly. See `monthly.pmi` on `scenarioToMaturity` below for the US figure;
    // both use the SAME key so a Scenarios column can render one PMI row for either
    // country without branching on which shape `monthly` is.
    pmi: 0,
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
  const housing = stressPay + propTax + F.heatAllowance + o.condoFee * F.condoFeeInclusion;
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

/**
 * The US (toMaturity) Scenarios path — the same "one down-payment column, every axis" shape as
 * `scenario()` above, using `financing()`/`minDown()`/`propertyTaxAnnual()`'s own US branches
 * rather than reimplementing PMI or the homestead exemption inline.
 */
function scenarioToMaturity(j: Jurisdiction, F: UsRules, o: ScenarioInput) {
  const floor = minDown(F, o.price, o.ftb);
  const requested = (o.price * o.dpPct) / 100;
  const down = Math.max(requested, floor);
  const dpPctEff = o.price > 0 ? (down / o.price) * 100 : 0;
  const belowMinimum = requested < floor - 0.5;

  const contractRate = o.contractRate ?? defaultContractRate(F, dpPctEff) / 100;
  const fin = financing(F, { price: o.price, dpPct: dpPctEff, amortYears: o.amortYears, ftb: o.ftb, contractRate: contractRate * 100 });
  const baseLoan = fin.baseLoan;
  const ltv = o.price > 0 ? baseLoan / o.price : 0;
  const insured = fin.insured;
  const premRate = fin.premRate;
  const premium = fin.premium;
  const totalMortgage = fin.loan;

  const f = payFactorMonthly(contractRate, o.amortYears);
  const pi = totalMortgage * f;
  const propTax = propertyTaxAnnual(j, o.price) / 12;
  const maintenance = (o.price * F.maintenanceReserve) / 12;
  const monthly = {
    pi,
    propTax,
    insurance: o.insuranceAnnual / 12,
    // PMI — see `monthly.pmi`'s comment on the Canadian branch above for why this is the
    // same key rather than a US-only field.
    pmi: fin.monthlyInsurance,
    utilities: o.utilities,
    condoFee: o.condoFee,
    maintenance,
    total: pi + propTax + o.insuranceAnnual / 12 + fin.monthlyInsurance + o.utilities + o.condoFee + maintenance,
  };

  const cc = closingTotal(j, F, { ...o, dpPct: dpPctEff });
  const cash = down + cc.total;
  const net = cash - cc.creditsAtClosing;
  const surplus = o.funds === null ? null : o.funds - net;
  const months = monthsToSave(surplus, o.save);

  // No B-20-style stress test — qualify at the bare contract rate.
  const qualRate = contractRate;
  const stressPay = totalMortgage * payFactorMonthly(qualRate, o.amortYears);
  // No heat allowance concept on a US mortgage; PMI IS counted, the way a lender's own DTI
  // calculation would.
  const housing = stressPay + fin.monthlyInsurance + propTax + o.condoFee * F.condoFeeInclusion;
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
    vsCeiling: monthly.total - o.comfortCeiling,
    closingTotal: cc.total,
    premiumTaxLine: j.premiumTax ? premium * j.premiumTax.rate : 0,
    creditsAtClosing: cc.creditsAtClosing,
    cash,
    net,
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
    /** Interest plus PMI paid while it applies — not a one-time premium on the US branch, so
     * this is a rough "extra cost of borrowing" figure rather than the literal sum
     * `costOfBorrowing`'s name implies on the Canadian side; disclosed here rather than
     * silently reused. */
    costOfBorrowing: totalInterest + (fin.insuranceMonths ?? 0) * fin.monthlyInsurance,
  };
}

export type ScenarioResult = ReturnType<typeof scenario>;
