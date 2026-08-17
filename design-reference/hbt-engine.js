/* Can I Buy This House? — calculation engine. Pure functions, no DOM, no state.
   Both the Closing Costs and Affordability screens read from here so the two can never
   disagree. Rule VALUES live in hbt-data.js; only mechanics live here.
   Canadian mortgages compound semi-annually — payFactor() is not the US monthly formula. */
(function () {

  function bracketTax(price, brackets) {
    let prev = 0, total = 0; const parts = [];
    for (const [cap, rate] of brackets) {
      const top = cap == null ? price : Math.min(price, cap);
      if (top > prev) { const amt = (top - prev) * rate; total += amt; parts.push({ from: prev, to: top, rate, amt }); }
      if (cap != null && price <= cap) break;
      prev = cap == null ? price : cap;
    }
    return { total, parts };
  }

  /* Monthly payment per $1 of mortgage, Canadian semi-annual compounding. */
  function payFactor(annualRate, years) {
    const i = Math.pow(1 + annualRate / 2, 2 / 12) - 1;
    const n = Math.max(1, years * 12);
    return i <= 0 ? 1 / n : i / (1 - Math.pow(1 + i, -n));
  }

  function minDown(price) {
    if (price <= 500000) return price * 0.05;
    if (price < 1500000) return 25000 + (price - 500000) * 0.10;
    return price * 0.20;
  }

  /* Insurance premium and loan size for a given price / down payment. */
  function financing(F, o) {
    const down = o.price * o.dpPct / 100;
    const baseLoan = o.price - down;
    const insured = o.dpPct < 20 && o.price < F.cmhc.insuredCap;
    let premRate = 0;
    if (insured) {
      const ltv = baseLoan / o.price;
      const band = F.cmhc.bands.find(b => ltv <= b[0]) || F.cmhc.bands[F.cmhc.bands.length - 1];
      premRate = band[1] + (o.amortYears > 25 ? F.cmhc.longAmortSurcharge : 0);
    }
    const premium = insured ? baseLoan * premRate : 0;
    return { down, baseLoan, insured, premRate, premium, loan: baseLoan + premium, minDown: minDown(o.price) };
  }

  /* Closing-cost line items, straight off the jurisdiction record.
     A line item that does not apply is ABSENT, never a zero row. */
  function buildLines(j, F, o) {
    const fin = financing(F, o);
    const gov = [];
    for (const it of j.transfer) {
      if (o.elsewhere && it.tier === 'municipal' && j.prov === 'ON') continue;
      let amt = 0, parts = null;
      if (it.kind === 'brackets') { const r = bracketTax(o.price, it.brackets); amt = r.total; parts = r.parts; }
      else if (it.kind === 'flat') amt = o.price * it.rate;
      else if (it.kind === 'fixed') amt = it.amount;
      else if (it.kind === 'perValue') {
        const on = it.on === 'loan' ? fin.loan : o.price;
        amt = it.base + it.per * Math.ceil(Math.max(0, on - (it.exempt || 0)) / it.unit);
        if (it.min) amt = Math.max(it.min, amt);
      } else if (it.kind === 'rateMin') amt = o.price > it.floor ? o.price * it.rate : it.min;
      gov.push({ key: it.key, ex: it.ex, amount: amt, parts, tier: it.tier, exact: true });
    }
    if (j.premiumTax && fin.premium > 0) {
      gov.push({ key: 'li_premTax', ex: 'ex_premTax', amount: fin.premium * j.premiumTax.rate, tier: 'provincial', exact: true, cashOnly: true, sub: j.premiumTax.label });
    }

    const f = j.fees, pro = [];
    pro.push({ key: j.pro === 'notary' ? 'li_notary' : j.pro === 'lawyerOrNotary' ? 'li_lawyerOrNotary' : 'li_lawyer', amount: f.lawyer || f.notary });
    if (f.locCert != null) pro.push({ key: 'li_locCert', amount: f.locCert });
    if (f.titleIns != null) pro.push({ key: 'li_titleIns', amount: f.titleIns });
    pro.push({ key: 'li_inspect', amount: f.inspect });
    pro.push({ key: 'li_appraisal', amount: f.appraisal });
    if (o.ptype === 'condo' && f.statusCert) pro.push({ key: 'li_statusCert', amount: f.statusCert });

    const adj = [
      { key: 'li_taxAdj', ex: 'ex_taxAdj', amount: o.price * j.propTax / 4 },
      { key: 'li_moving', amount: f.moving },
      { key: 'li_setup', amount: f.setup }
    ];
    return { fin, gov, pro, adj };
  }

  /* Rebate component states: applied | capped | phasedOut | none | ftbOnly */
  function credits(j, F, o, gov) {
    const atClosing = [], later = [];
    for (const rb of (j.rebates || [])) {
      const target = gov[rb.on];
      const raw = target ? target.amount : 0;
      let amount = 0, st = 'none';
      if (rb.kind === 'none') st = 'none';
      else if (!o.ftb) st = 'ftbOnly';
      else if (rb.kind === 'cap') { amount = Math.min(rb.cap, raw); st = raw > rb.cap ? 'capped' : 'applied'; }
      else if (rb.kind === 'fullExempt') { amount = raw; st = 'applied'; }
      else if (rb.kind === 'exemptBand') {
        const full = bracketTax(Math.min(o.price, rb.capBase), j.transfer[rb.on].brackets).total;
        if (o.price <= rb.full) { amount = Math.min(full, raw); st = 'applied'; }
        else if (o.price <= rb.partial) { amount = Math.min(full, raw) * (rb.partial - o.price) / (rb.partial - rb.full); st = 'capped'; }
        else st = 'phasedOut';
      }
      atClosing.push({ key: rb.key, kind: rb.kind, amount, st, target: target ? target.key : null, cap: rb.cap, noTax: rb.noTax });
    }
    if (o.ftb) for (const c of (j.taxTime || [])) later.push({ key: c.key, ex: c.ex, amount: c.amount });
    if (o.ftb && o.ptype === 'newbuild') {
      const g = F.gstFthb, gst = o.price * g.rate;
      const amt = o.price <= g.fullTo ? Math.min(gst, g.cap)
        : o.price >= g.zeroAt ? 0
        : Math.min(gst, g.cap) * (g.zeroAt - o.price) / (g.zeroAt - g.fullTo);
      if (amt > 0) later.push({ key: 'cr_gstFthb', ex: 'ex_gstFthb', amount: amt });
    }
    return { atClosing, later };
  }

  /* Total cash at closing without the itemised table — for screens that only need the number. */
  function closingTotal(j, F, o) {
    const L = buildLines(j, F, o);
    const sum = a => a.reduce((t, r) => t + r.amount, 0);
    const total = sum(L.gov) + sum(L.pro) + sum(L.adj);
    const C = credits(j, F, o, L.gov);
    const cr = C.atClosing.reduce((t, c) => t + c.amount, 0);
    return { fin: L.fin, total, creditsAtClosing: cr, later: C.later.reduce((t, c) => t + c.amount, 0), cash: L.fin.down + total, net: L.fin.down + total - cr };
  }

  /* Affordability. Mirrors the Affordability tab of the Winnipeg model.
     o: { income1, income2, otherIncome, haircut, debts, amortYears, comfortCeiling,
          insuranceAnnual, utilities, condoFee, contractRate, price, dpPct, ftb, ptype } */
  function affordability(j, F, o) {
    const gross = o.income1 + o.income2 + o.otherIncome;
    const qualIncome = gross * (1 - o.haircut / 100);
    const qualRate = Math.max(F.stressTest.floor, o.contractRate + F.stressTest.buffer) / 100;
    const fq = payFactor(qualRate, o.amortYears);
    const fc = payFactor(o.contractRate / 100, o.amortYears);

    const gdsAllow = qualIncome * (F.gds / 100) / 12;
    const tdsAllow = qualIncome * (F.tds / 100) / 12 - o.debts;
    const binding = Math.min(gdsAllow, tdsAllow);
    const tdsBinds = tdsAllow < gdsAllow;

    /* Solved so property tax scales with price. Assumes 20% down, as the model does. */
    const denomLender = 0.8 * fq + j.propTax / 12;
    const ceiling = qualIncome <= 0 ? 0 : Math.max(0, (binding - F.heatAllowance - o.condoFee * 0.5) / denomLender);

    const budget = o.comfortCeiling - o.insuranceAnnual / 12 - o.utilities - o.condoFee;
    const denomComfort = 0.8 * fc + j.propTax / 12 + F.maintenanceReserve / 12;
    const comfort = Math.max(0, budget) / denomComfort;

    /* The target price, actually financed at the actual down payment. */
    const cc = closingTotal(j, F, { price: o.price, dpPct: o.dpPct, ftb: o.ftb, ptype: o.ptype, amortYears: o.amortYears, elsewhere: o.elsewhere });
    const pi = cc.fin.loan * payFactor((cc.fin.insured ? F.rates.insured : F.rates.uninsured) * 100 / 100, o.amortYears);
    const monthly = {
      pi, propTax: o.price * j.propTax / 12, insurance: o.insuranceAnnual / 12,
      utilities: o.utilities, condoFee: o.condoFee, maintenance: o.price * F.maintenanceReserve / 12
    };
    monthly.total = monthly.pi + monthly.propTax + monthly.insurance + monthly.utilities + monthly.condoFee + monthly.maintenance;
    /* What a lender counts, at the target price: heating allowance not real utilities. */
    const gdsAtTarget = qualIncome <= 0 ? 0 : (cc.fin.loan * fq + monthly.propTax + F.heatAllowance + o.condoFee * 0.5) / (qualIncome / 12) * 100;
    const tdsAtTarget = qualIncome <= 0 ? 0 : (cc.fin.loan * fq + monthly.propTax + F.heatAllowance + o.condoFee * 0.5 + o.debts) / (qualIncome / 12) * 100;

    /* Marginal cost of debt: what one dollar of monthly obligation removes from the ceiling. */
    const capacityPerDollar = 1 / denomLender;

    return {
      gross, qualIncome, qualRate: qualRate * 100, fq, fc, gdsAllow, tdsAllow, binding, tdsBinds,
      ceiling, comfort, budget, monthly, cc, gdsAtTarget, tdsAtTarget, capacityPerDollar,
      impliedMortgage: ceiling * 0.8, comfortDown: comfort * 0.2, comfortPI: comfort * 0.8 * fc,
      approvalPass: o.price <= ceiling, comfortPass: monthly.total <= o.comfortCeiling,
      comfortGap: monthly.total - o.comfortCeiling, gap: ceiling - comfort
    };
  }

  /* One down-payment scenario, end to end. Mirrors the Scenarios tab.
     o: { price, dpPct, amortYears, ftb, ptype, elsewhere, insuranceAnnual, utilities,
          condoFee, comfortCeiling, qualIncome, debts, funds, save } */
  function scenario(j, F, o) {
    /* The legal minimum overrides a lower requested percentage. */
    const floor = minDown(o.price);
    const down = Math.max(o.price * o.dpPct / 100, floor);
    const dpPctEff = o.price > 0 ? down / o.price * 100 : 0;
    const belowMinimum = o.price * o.dpPct / 100 < floor - 0.5;

    const baseLoan = o.price - down;
    const ltv = o.price > 0 ? baseLoan / o.price : 0;
    const insurable = o.price < F.cmhc.insuredCap;
    const insured = ltv > 0.80 && insurable;
    let premRate = 0;
    if (insured) {
      const band = F.cmhc.bands.find(b => ltv <= b[0]) || F.cmhc.bands[F.cmhc.bands.length - 1];
      premRate = band[1] + (o.amortYears > 25 ? F.cmhc.longAmortSurcharge : 0);
    }
    const premium = baseLoan * premRate;
    const totalMortgage = baseLoan + premium;

    /* Insured mortgages price below uninsured — the lender's risk is covered. */
    const contractRate = insured ? F.rates.insured : F.rates.uninsured;
    const f = payFactor(contractRate, o.amortYears);
    const pi = totalMortgage * f;
    const monthly = {
      pi, propTax: o.price * j.propTax / 12, insurance: o.insuranceAnnual / 12,
      utilities: o.utilities, condoFee: o.condoFee, maintenance: o.price * F.maintenanceReserve / 12
    };
    monthly.total = monthly.pi + monthly.propTax + monthly.insurance + monthly.utilities + monthly.condoFee + monthly.maintenance;
    const vsCeiling = o.comfortCeiling - monthly.total;

    /* Closing costs are recomputed per column, not held constant: provinces that tax the
       CMHC premium charge more cash at closing on the low-down-payment columns. */
    const cc = closingTotal(j, F, { price: o.price, dpPct: dpPctEff, ftb: o.ftb, ptype: o.ptype, amortYears: o.amortYears, elsewhere: o.elsewhere });
    const premiumTaxLine = j.premiumTax ? premium * j.premiumTax.rate : 0;
    const cash = down + cc.total;
    const surplus = o.funds - (cash - cc.creditsAtClosing);
    const months = o.save > 0 ? (surplus >= 0 ? 0 : Math.ceil(-surplus / o.save)) : null;

    const qualRate = Math.max(F.stressTest.floor / 100, contractRate + F.stressTest.buffer / 100);
    const stressPay = totalMortgage * payFactor(qualRate, o.amortYears);
    const housing = stressPay + monthly.propTax + F.heatAllowance + o.condoFee * 0.5;
    const gds = o.qualIncome > 0 ? housing * 12 / o.qualIncome * 100 : 0;
    const tds = o.qualIncome > 0 ? (housing + o.debts) * 12 / o.qualIncome * 100 : 0;
    const qualifies = o.qualIncome > 0 && gds <= F.gds && tds <= F.tds;

    const totalInterest = pi * o.amortYears * 12 - totalMortgage;
    const costOfBorrowing = totalInterest + premium;

    return {
      dpPct: o.dpPct, dpPctEff, belowMinimum, down, baseLoan, ltv, insured, premRate, premium,
      totalMortgage, contractRate: contractRate * 100, f, monthly, vsCeiling,
      closingTotal: cc.total, premiumTaxLine, creditsAtClosing: cc.creditsAtClosing,
      cash, net: cash - cc.creditsAtClosing, surplus, months, fundable: surplus >= 0,
      qualRate: qualRate * 100, stressPay, gds, tds, qualifies,
      totalInterest, costOfBorrowing
    };
  }

  /* Currency. The sign goes outside the symbol: −$340 in en, −340 $ in fr/uk/es.
     Never "$-340". Shared by every screen so the bug cannot come back in one of them. */
  function money(n, loc, trailing, dp) {
    const r = Math.round(n * (dp ? 100 : 1)) / (dp ? 100 : 1);
    const q = r === 0 ? 0 : r;
    const v = new Intl.NumberFormat(loc, { minimumFractionDigits: dp || 0, maximumFractionDigits: dp || 0 }).format(Math.abs(q));
    const body = trailing ? v + ' $' : '$' + v;
    return q < 0 ? '− ' + body : body;
  }

  /* Rent vs buy terminal wealth. Mirrors the Rent vs Buy tab, extended from 15 to 40 years.
     The schedule runs MONTHLY, not annually: past 25 or 30 years the mortgage is discharged and
     the payment stops, which a 15-year table never had to model. Owner outlay drops accordingly
     and that is exactly where the buy line steepens. */
  function rentVsBuy(j, F, o) {
    const years = o.years || 40;
    const fin = financing(F, { price: o.price, dpPct: o.dpPct, amortYears: o.amortYears });
    const cc = closingTotal(j, F, { price: o.price, dpPct: o.dpPct, ftb: o.ftb, ptype: o.ptype, amortYears: o.amortYears, elsewhere: o.elsewhere });
    const upFront = fin.down + cc.total;
    const rate = fin.insured ? F.rates.insured : F.rates.uninsured;
    const i = Math.pow(1 + rate / 2, 2 / 12) - 1;
    const pay = fin.loan * i / (1 - Math.pow(1 + i, -(o.amortYears * 12)));
    const g = o.appreciationOn ? o.appreciation : 0;
    const ret = o.investReturn;

    let bal = fin.loan, rp = 0, bp = 0, payoffYear = null;
    const rows = [];
    for (let t = 1; t <= years; t++) {
      const opening = bal;
      let interest = 0, paid = 0;
      for (let m = 0; m < 12 && bal > 0.005; m++) {
        const int = bal * i;
        const prin = Math.min(pay - int, bal);
        bal -= prin; interest += int; paid += int + prin;
      }
      if (bal < 0.005) { bal = 0; if (payoffYear == null) payoffYear = t; }
      const propTax = o.price * Math.pow(1 + g, t - 1) * j.propTax;
      const ins = o.insuranceAnnual * Math.pow(1.03, t - 1);
      const util = (o.utilities + o.condoFee) * 12 * Math.pow(1.03, t - 1);
      const maint = o.price * F.maintenanceReserve * Math.pow(1 + g, t - 1);
      const ownerOutlay = paid + propTax + ins + util + maint;
      const renterOutlay = o.rent * 12 * Math.pow(1 + o.rentInflation, t - 1);
      const diff = ownerOutlay - renterOutlay;
      if (o.investDiff) { rp = rp * (1 + ret) + Math.max(0, diff); bp = bp * (1 + ret) + Math.max(0, -diff); }
      const homeValue = o.price * Math.pow(1 + g, t);
      const equity = homeValue * (1 - F.sellingCost) - bal;
      const buyW = equity + (o.investDiff ? bp : 0);
      const rentW = upFront * Math.pow(1 + ret, t) + (o.investDiff ? rp : 0);
      rows.push({ t, opening, interest, paid, balance: bal, propTax, ins, util, maint,
        ownerOutlay, renterOutlay, diff, rp: o.investDiff ? rp : 0, bp: o.investDiff ? bp : 0,
        homeValue, equity, buyW, rentW, adv: buyW - rentW });
    }
    let breakEven = null;
    for (const r of rows) if (r.adv > 0) { breakEven = r.t; break; }
    const at = y => rows[Math.max(0, Math.min(rows.length - 1, y - 1))];
    return { fin, cc, upFront, pay, rate: rate * 100, i, rows, breakEven, payoffYear, years, at };
  }

  /* Cross-screen state. Lives in this browser only — no server, per §6 of the brief, which
     also makes that a thing worth telling the user. UI-only state (depth, open rows, theme,
     picker) is deliberately NOT shared. Read from ?s= too, so a shared link can carry inputs;
     the hash is left alone because the jump rails use it for anchors. */
  var SHARED_KEYS = ['jurId', 'lang', 'price', 'dpPct', 'amortYears', 'ftb', 'ptype',
    'insuranceAnnual', 'utilities', 'condoFee', 'comfortCeiling', 'funds', 'save', 'rent',
    'rentInflation', 'holding', 'inc1', 'inc2', 'app2', 'haircut', 'car', 'student', 'cc', 'otherDebt', 'debts',
    'apprKey', 'retKey', 'investDiff', 'appreciationOn',
    'fhsa', 'cashSav', 'rrsp', 'tfsa', 'gift', 'nonreg', 'nonregGain', 'taxIncome'];
  var STORE = 'cibth.inputs.v1';
  var lastWritten = null;

  function coerce(v) {
    if (v === 'true') return true;
    if (v === 'false') return false;
    var n = parseFloat(v);
    return (typeof v === 'string' && v !== '' && !isNaN(n) && String(n) === v) ? n : v;
  }
  function loadShared() {
    var out = {};
    try {
      var raw = window.localStorage.getItem(STORE);
      if (raw) { var o = JSON.parse(raw); SHARED_KEYS.forEach(function (k) { if (o[k] !== undefined) out[k] = o[k]; }); }
    } catch (err) {}
    try {
      var q = new URLSearchParams(window.location.search).get('s');
      if (q) { var p = JSON.parse(decodeURIComponent(q)); SHARED_KEYS.forEach(function (k) { if (p[k] !== undefined) out[k] = coerce(p[k]); }); }
    } catch (err) {}
    return out;
  }
  function saveShared(state) {
    var o = {};
    SHARED_KEYS.forEach(function (k) { if (state[k] !== undefined) o[k] = state[k]; });
    var json = JSON.stringify(o);
    if (json === lastWritten) return o;
    lastWritten = json;
    try { window.localStorage.setItem(STORE, json); } catch (err) {}
    return o;
  }
  function shareLink(state) {
    var o = saveShared(state);
    return window.location.origin + window.location.pathname + '?s=' + encodeURIComponent(JSON.stringify(o));
  }
  function onSharedChange(cb) {
    window.addEventListener('storage', function (ev) {
      if (ev.key !== STORE) return;
      if (ev.newValue === lastWritten) return;
      lastWritten = ev.newValue;
      cb(loadShared());
    });
  }

  /* Amortization with renewal. Canadians do not lock a rate for the life of the loan: they take
     a term (five years typically) and renew into whatever rate exists then. Renewal risk is the
     largest unmodelled risk in any Canadian mortgage, so the schedule is built to be re-run at a
     different rate from the first renewal onward, and the payment is recomputed on the remaining
     balance over the remaining amortization exactly as a lender would. */
  function amortization(j, F, o) {
    const fin = financing(F, { price: o.price, dpPct: o.dpPct, amortYears: o.amortYears });
    const term = o.termYears || 5;
    const startRate = o.contractRate / 100;
    const renewRate = (o.renewalRate == null ? o.contractRate : o.renewalRate) / 100;

    let bal = fin.loan;
    let rate = startRate;
    let pay = fin.loan * payFactor(rate, o.amortYears);
    const firstPayment = pay;
    const rows = [];
    let totalInterest = 0, totalPaid = 0, peakPayment = pay, paymentAfterRenewal = null;

    for (let t = 1; t <= o.amortYears && bal > 0.005; t++) {
      /* renew at the end of each term: same remaining balance, remaining amortization, new rate */
      if (t > 1 && (t - 1) % term === 0) {
        rate = renewRate;
        const remaining = o.amortYears - (t - 1);
        pay = bal * payFactor(rate, remaining);
        if (paymentAfterRenewal == null) paymentAfterRenewal = pay;
        if (pay > peakPayment) peakPayment = pay;
      }
      const opening = bal;
      let interest = 0, principal = 0;
      for (let m = 0; m < 12 && bal > 0.005; m++) {
        const int = bal * (Math.pow(1 + rate / 2, 2 / 12) - 1);
        const prin = Math.min(pay - int, bal);
        bal -= prin; interest += int; principal += prin;
      }
      if (bal < 0.005) bal = 0;
      totalInterest += interest; totalPaid += interest + principal;
      rows.push({ t, opening, interest, principal, closing: bal, payment: pay, rate: rate * 100,
        renewed: t > 1 && (t - 1) % term === 0 });
    }
    return { fin, rows, totalInterest, totalPaid, firstPayment, peakPayment,
      paymentAfterRenewal: paymentAfterRenewal == null ? firstPayment : paymentAfterRenewal,
      shock: (paymentAfterRenewal == null ? firstPayment : paymentAfterRenewal) - firstPayment,
      term, payoffYear: rows.length };
  }

  /* Combined marginal rate for a taxable income in a province. */
  function marginalRate(F, prov, income) {
    const tbl = F.marginal[prov] || F.marginal.CA;
    for (const [cap, rate] of tbl) if (cap == null || income <= cap) return rate;
    return tbl[tbl.length - 1][1];
  }

  /* Funding waterfall. Order is fixed by cost, not by preference:
     FHSA -> cash -> RRSP/HBP -> TFSA -> gift -> non-registered. */
  function waterfall(F, o) {
    const rate = marginalRate(F, o.prov, o.income);
    const hbpRoom = Math.min(o.rrsp || 0, F.hbp.max);
    const defs = [
      { key: 'accFhsa', avail: o.fhsa || 0, cost: 'free' },
      { key: 'accCash', avail: o.cash || 0, cost: 'free' },
      { key: 'accHbp', avail: hbpRoom, cost: 'strings', cap: F.hbp.max },
      { key: 'accTfsa', avail: o.tfsa || 0, cost: 'strings' },
      { key: 'accGift', avail: o.gift || 0, cost: 'free' },
      { key: 'accNonreg', avail: o.nonreg || 0, cost: 'tax', gain: o.nonregGain || 0 }
    ];
    let need = Math.max(0, o.need), rows = [], taxTotal = 0, drawnTotal = 0;
    for (const d of defs) {
      const drawn = Math.min(d.avail, need);
      need -= drawn; drawnTotal += drawn;
      let tax = 0, gainRealised = 0, repayAnnual = 0;
      if (d.cost === 'tax' && d.avail > 0 && drawn > 0) {
        gainRealised = (d.gain || 0) * (drawn / d.avail);
        tax = gainRealised * F.capGainsInclusion * rate;
      }
      if (d.key === 'accHbp' && drawn > 0) repayAnnual = drawn / F.hbp.repayYears;
      taxTotal += tax;
      rows.push({ key: d.key, avail: d.avail, drawn, left: d.avail - drawn, tax, gainRealised, repayAnnual, cost: d.cost, exhausted: d.avail > 0 && drawn >= d.avail - 0.5, untouched: drawn <= 0.5 });
    }
    return { rows, rate, drawnTotal, taxTotal, shortfall: need, surplus: Math.max(0, defs.reduce((t, d) => t + d.avail, 0) - o.need) };
  }

  /* 36-month savings glide path against a shortfall. */
  function glidePath(F, shortfall, monthly, months) {
    const i = F.savingsReturn / 12, n = months || 36;
    const series = []; let bal = 0, reach = null;
    for (let m = 0; m <= n; m++) {
      if (m > 0) bal = bal * (1 + i) + monthly;
      series.push({ m, saved: bal });
      if (reach === null && bal >= shortfall && shortfall > 0) reach = m;
    }
    return { series, reach, target: shortfall, max: Math.max(shortfall, bal) };
  }

  /* RRSP -> Home Buyers' Plan: contribute, deduct, wait 90 days, withdraw, repay.
     o: { contribution, marginalRate, withdrawAmount, investReturn } */
  function hbpPlay(F, o) {
    const contribution = Math.min(o.contribution, F.hbp.max);
    const refund = contribution * o.marginalRate;
    const withdraw = Math.min(o.withdrawAmount, contribution, F.hbp.max);
    const repayAnnual = withdraw / F.hbp.repayYears;
    const schedule = [];
    let bal = withdraw;
    for (let y = 1; y <= F.hbp.repayYears; y++) { bal = Math.max(0, bal - repayAnnual); schedule.push({ year: y, repay: repayAnnual, balance: bal }); }
    /* Worth it if the refund plus the tax-free growth during the 90-day wait beats leaving
       the money in a taxable account for the same window. */
    const waitGrowth = withdraw * (o.investReturn / 12) * 3;
    const netBenefit = refund + waitGrowth;
    const worthIt = netBenefit > 0 && withdraw > 0;
    return { contribution, refund, withdraw, repayAnnual, schedule, waitGrowth, netBenefit, worthIt, ruleDays: F.hbp.ruleDays };
  }

  window.CIBTH_ENGINE = { marginalRate, waterfall, glidePath, hbpPlay, loadShared, saveShared, shareLink, onSharedChange, money, rentVsBuy, amortization, bracketTax, payFactor, minDown, financing, buildLines, credits, closingTotal, affordability, scenario };
  window.dispatchEvent(new Event('cibth-engine'));
})();
