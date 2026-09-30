# Canada combined federal + provincial marginal-rate tables, 2026 — sourced dossier

Date compiled: 2026-09-28. Scope: replace `marginal` in `src/domain/rules/ca.ts` (today `conf: "assumption"`, "an
unverified prototype carry-over"). Graded on `Provenance.conf` in `src/domain/types.ts`. **Nothing here has been written
into `src/`; this is research input only.**

Access notes: `curl` has no network in this sandbox. `WebFetch` works for HTML and, for PDFs, saves the binary under
`~/.claude/projects/.../tool-results/*.pdf`, which `pdftotext -layout` then reads cleanly (the tool's own summary of an
EY PDF is useless, "encrypted"; the saved file is fine). CRA pages were read through `WebFetch`'s summariser, so treat
their brackets as read-through-a-summariser and see the discrepancy flagged in section 2.

## What `taxOnBand()` needs the table to be

`taxOnBand(F, prov, lo, hi)` integrates `[cap, rate]` rows over `[lo, hi]`; `hbpPlay()` calls it with
`(income - contribution, income)`. So a row set must give the combined marginal rate on the next dollar of taxable
income for an employee whose only credits are the basic personal amounts. Effects the source tables include, per row,
are stated in section 6. Universal conventions of the EY tables:

- 0% up to the federal BPA ($16,452 in 2026: base $14,829 + additional $1,623), because federal tax on that slice is nil
  and provincial low-income reductions / BPAs zero the provincial tax until each province's own ceiling. Where a
  province's zero-tax ceiling is above 16,452 (ON, BC, AB, SK, NB, NL, NT, NU, PE) the row from 16,453 to that ceiling is
  the federal 14% alone. Where it is below (MB 15,780, NS 15,220) provincial tax starts first (10.8%, 13.79%) — the row
  is provincial alone.
- Federal BPA phase-down on net income 181,441-258,482: +0.29 points (EY: "0.29% on ordinary income"; +0.25 in QC on
  the abated tax).
- **Not in any table:** Ontario Health Premium, Quebec health services fund/QPP/QPIP, CPP/EI on earnings (a payroll cost,
  not income tax; RRSP deductions do not save them), AMT, non-refundable credits other than the BPAs.

## Summary table

| # | Item | Value | Conf | As of |
|---|------|-------|------|-------|
| 1 | Federal 2026 brackets | 14% to $58,523; 20.5% to $117,045; 26% to $181,440; 29% to $258,482; 33% above. **Lowest rate is 14% for 2026** (15% in 2024, 14.5% in 2025) | high | CRA, 2026 |
| 1 | Federal BPA 2026 | max $16,452 (base 14,829 + 1,623), phased down on net income $181,440-$258,482 to min $14,829 | high | CRA T4032, 2026 |
| 2 | Provincial/territorial statutory brackets | all 12 non-QC (section 2); QC from Revenu Quebec via EY | high (12) / medium (QC) | 2026 |
| 3 | Combined tables | reproduced by arithmetic for every row of 12 jurisdictions + QC built from EY's split tables; **zero mismatches** | medium (rows rest on EY notes for low-income reductions/surtax/BPA) | EY, to 2026-06-15 |
| 4 | Current ca.ts tables | wrong in all 13 (section 4); no province has a 0% band; six use a made-up `CA` fallback | — | — |
| 5 | winnipeg.ts `marginal` | **identical to the EY 2026-06-15 Manitoba table; usable as-is for `ca.marginal.MB`** | medium | EY 2026-06-15 |
| 6 | Stale-source warning | EY's 2026-01-15 BC and PEI tables are superseded by 2026-06-15 (BC 5.6% bottom rate; PEI 20% top bracket at $200,000). Manitoba unchanged | high (fact) | — |

---

## 1. Federal 2026

- Publisher: Canada Revenue Agency. "Tax rates and income brackets for 2026":
  https://www.canada.ca/en/revenue-agency/services/tax/individuals/tax-rates-brackets/current-year.html (linked from the
  "Canadian income tax rates for individuals - current and previous years" page). Read through WebFetch.
  Quoted table: `$0 – $58,523 | 14%`, `$58,523.01 – $117,045 | 20.5%`, `$117,045.01 – $181,440 | 26%`,
  `$181,440.01 – $258,482 | 29%`, `$258,482.01+ | 33%`.
- Payroll primary, T4032 (Manitoba, January 2026 edition), read through WebFetch:
  https://www.canada.ca/en/revenue-agency/services/forms-publications/payroll/t4032-payroll-deductions-tables/t4032mb-jan/t4032mb-january-general-information.html
  — "for income under $58,523, the tax rate is 14%" … "0.33" at "$258,482 and over"; constants $0 / $3,804 / $10,241 /
  $15,685 / $26,024; federal BPA "Maximum: $16,452", "Minimum: $14,829".
- Corroboration (EY note 5, every province): "the base amount ($14,829 for 2026) and an additional amount ($1,623 for
  2026). The additional amount is reduced for individuals with net income in excess of $181,440 and is fully eliminated
  for individuals with net income in excess of $258,482 … additional tax credit of $227 … 0.29% on ordinary income".
- Arithmetic: additional credit = 1,623 x 14% = $227.2; phase-out width 258,482 - 181,440 = 77,042; 227.2 / 77,042 =
  0.2949% -> **+0.29** on the 29% band, so the effective federal rate on 181,441-258,482 is 29.29%. Answer to "14% or
  15%": **14%** (the 2026 rate; the credit rate is also 14%).
- conf: **high**.

## 2. Provincial / territorial statutory brackets, 2026 (CRA page above; Revenu Quebec for QC)

Rates and cut-offs as quoted from CRA's 2026 page (Quebec: "Refer to Revenu Quebec's official website"):

| Jur. | Brackets (upper limit: rate) | BPA (derived: EY credit / lowest rate) |
|---|---|---|
| AB | 61,200: 8% · 154,259: 10% · 185,111: 12% · 246,813: 13% · 370,220: 14% · above: 15% | ~22,769 |
| BC | 50,363: 5.6% · 100,728: 7.7% · 115,648: 10.5% · 140,430: 12.29% · 190,405: 14.7% · 265,545: 16.8% · above: 20.5% | ~13,2xx (740/5.6%) |
| MB | 47,000: 10.8% · 100,000: 12.75% · above: 17.4% (**see discrepancy**) | 15,780 (primary: T4032MB "will remain at $15,780") |
| NB | 52,333: 9.4% · 104,666: 14% · 193,861: 16% · above: 19.5% | ~13,6xx |
| NL | 44,678: 8.7% · 89,354: 14.5% · 159,528: 15.8% · 223,340: 17.8% · 285,319: 19.8% · 570,638: 20.8% · 1,141,275: 21.3% · above: 21.8% | ~13,1xx |
| NT | 53,003: 5.9% · 106,009: 8.6% · 172,346: 12.2% · above: 14.05% | ~18,2xx |
| NS | 30,995: 8.79% · 61,991: 14.95% · 97,417: 16.67% · 157,124: 17.5% · above: 21% | ~11,9xx |
| NU | 55,801: 4% · 111,602: 7% · 181,439: 9% · above: 11.5% | ~19,6xx |
| ON | 53,891: 5.05% · 107,785: 9.15% · 150,000: 11.16% · 220,000: 12.16% · above: 13.16% (+20% and 36% surtaxes) | — |
| PE | 33,928: 9.5% · 65,820: 13.47% · 106,890: 16.6% · 142,520: 17.62% · 200,000: 19% · above: 20% | 15,000 |
| QC | 54,345: 14% · 108,680: 19% · 132,245: 24% · above: 25.75% (EY, from Revenu Quebec) | 18,952 |
| SK | 54,532: 10.5% · 155,805: 12.5% · above: 14.5% | ~20,381 |
| YT | 58,523: 6.4% · 117,045: 9% · 181,440: 10.9% · 500,000: 12.8% · above: 15% | 16,452 (= federal) |

BPA column is a derived figure (EY "Basic personal credit" / bottom rate), medium at best; it only matters because the
EY tables already embed it.

**Manitoba discrepancy (resolved).** WebFetch's read of CRA's rates page printed MB as `$47,564 / $101,200`. Those are
not 2026 figures: CRA's own T4032MB (2026) quotes "for income under $47,000 … 10.8% … $47,000–$100,000 … 0.1275 … over
$100,000 … 0.1740" with constants $0 / $917 / $5,567 (check: 47,000 x (12.75% - 10.8%) = 916.5 -> 917 ✓;
100,000 x (17.4% - 12.75%) + 917 = 5,567 ✓). Manitoba Finance (https://www.gov.mb.ca/finance/personal/ptaxes.html):
"Indexation of Manitoba's tax bracket thresholds to inflation is paused, effective for the 2025 tax year" — thresholds stay at the
2024 levels of $47,000 and $100,000. EY and TaxTips agree. The ca.ts `47564 / 101200` are wrong.

conf: **high** for the 11 non-QC statutory rate/cut-off rows (CRA); QC **medium** (EY quoting Revenu Quebec; not read
at revenuquebec.ca).

## 3. Combined marginal tables and the cross-check

Compilation used: EY, "Combined federal and provincial personal income tax rates - 2026", one PDF per jurisdiction,
**version "to June 15, 2026"** (newest; the January-15 versions are older):
`https://www.ey.com/content/dam/ey-unified-site/ey-com/en-ca/services/tax/tax-calculators/2026/ey-tax-rates-<province-slug>-2026-06-15.pdf`
(`manitoba`, `ontario`, `british-columbia`, `alberta`, `quebec`, `saskatchewan`, `nova-scotia`, `new-brunswick`,
`newfoundland-labrador`, `prince-edward-island`, `yukon`, `northwest-territories`, `nunavut`). Cross-check with TaxTips
(https://www.taxtips.ca/taxrates/mb.htm) for MB. Jan -> Jun diff: only BC and PE changed (BC low-income cut-offs and
bottom rate 5.06% -> 5.6%; PE added the $200,000 / 20% band).

Model used for the cross-check: `combined(x) = fed(x) + prov(x)`, with `fed` = 0 to 16,452, then 14/20.5/26/29.29/33 from
section 1 and `prov` = the CRA rate for x's bracket, adjusted by: ON surtax x1.2 above ~$94,901 taxable income and x1.56
above ~$111,810 (20% and 36% surtaxes, applied to the provincial rate); low-income tax reduction (LIT) claw-backs (ON
+5.05 on 18,931-24,870; BC +3.56 on 25,571-44,952; NB +3 on 22,359-49,592; NL +16 on 24,192-29,454; NS +5 on
15,221-21,000; PE +5 on 23,001-30,000 — **these cut-offs and claw-back rates come only from the EY notes, so the rows
that contain them are medium, not high**); MB BPA claw-back +0.852 on 200,001-400,000 (arithmetic: 15,780 x 10.8% = 1,704.24
credit; 1,704.24 / 200,000 = 0.852%); YT BPA claw-back +0.13. Result: **every row of every table reproduces to within
0.01 points**; the only differences are rounding (YT 42.23 vs 42.22; MB 47.55 vs 47.54). Nothing is unexplained.

Rows the naive arithmetic (fed + statutory rate) does NOT reproduce, and why:

| Where | Row | Naive | Table | Reason |
|---|---|---|---|---|
| all | 181,441-258,482 | fed 29 | 29.29 | federal BPA phase-down |
| MB | 15,781-16,452 | 10.8 | 10.8 | provincial only; fed BPA covers |
| MB | 200,001-400,000 | 17.4/18.25 | +0.85 | MB BPA claw-back; disappears above 400,000 so the top row FALLS (51.25 -> 50.40) |
| ON | every row above $18,930 | statutory | LIT band, then surtax | reduction claw-back 5.05; surtax 20% / 36% (summed with statutory 5.05/9.15/11.16/12.16/13.16) |
| BC, NB, NL, NS, PE | bottom 3-4 rows | statutory | +3.56 / +3 / +16 / +5 / +5 | LIT claw-back (rate can FALL at the end of the band) |
| QC | all | fed 14/20.5/... | x 0.835 | 16.5% federal abatement, verified 14 x .835 = 11.69, 20.5 x .835 = 17.12, 26 x .835 = 21.71, 33 x .835 = 27.56 |

Full row-by-row arithmetic (generated from the model above; "Fed" and "Prov" are points, "Table" is the EY figure):

**AB - Alberta**

| Row upper limit | Fed | Prov (as modelled) | Sum | Table | Match |
|---|---|---|---|---|---|
| 16452 | 0.00 | 0.00 | 0.00 | 0.00 | yes |
| 22769 | 14.00 | 0.00 | 14.00 | 14.00 | yes |
| 58523 | 14.00 | 8.00 | 22.00 | 22.00 | yes |
| 61200 | 20.50 | 8.00 | 28.50 | 28.50 | yes |
| 117045 | 20.50 | 10.00 | 30.50 | 30.50 | yes |
| 154259 | 26.00 | 10.00 | 36.00 | 36.00 | yes |
| 181440 | 26.00 | 12.00 | 38.00 | 38.00 | yes |
| 185111 | 29.29 | 12.00 | 41.29 | 41.29 | yes |
| 246813 | 29.29 | 13.00 | 42.29 | 42.29 | yes |
| 258482 | 29.29 | 14.00 | 43.29 | 43.29 | yes |
| 370220 | 33.00 | 14.00 | 47.00 | 47.00 | yes |
| open | 33.00 | 15.00 | 48.00 | 48.00 | yes |

**BC - British Columbia**

| Row upper limit | Fed | Prov (as modelled) | Sum | Table | Match |
|---|---|---|---|---|---|
| 16452 | 0.00 | 0.00 | 0.00 | 0.00 | yes |
| 25537 | 14.00 | 0.00 | 14.00 | 14.00 | yes |
| 25570 | 14.00 | 5.60 | 19.60 | 19.60 | yes |
| 44952 | 14.00 | 9.16 | 23.16 | 23.16 | yes |
| 50363 | 14.00 | 5.60 | 19.60 | 19.60 | yes |
| 58523 | 14.00 | 7.70 | 21.70 | 21.70 | yes |
| 100728 | 20.50 | 7.70 | 28.20 | 28.20 | yes |
| 115648 | 20.50 | 10.50 | 31.00 | 31.00 | yes |
| 117045 | 20.50 | 12.29 | 32.79 | 32.79 | yes |
| 140430 | 26.00 | 12.29 | 38.29 | 38.29 | yes |
| 181440 | 26.00 | 14.70 | 40.70 | 40.70 | yes |
| 190405 | 29.29 | 14.70 | 43.99 | 43.99 | yes |
| 258482 | 29.29 | 16.80 | 46.09 | 46.09 | yes |
| 265545 | 33.00 | 16.80 | 49.80 | 49.80 | yes |
| open | 33.00 | 20.50 | 53.50 | 53.50 | yes |

**MB - Manitoba**

| Row upper limit | Fed | Prov (as modelled) | Sum | Table | Match |
|---|---|---|---|---|---|
| 15780 | 0.00 | 0.00 | 0.00 | 0.00 | yes |
| 16452 | 0.00 | 10.80 | 10.80 | 10.80 | yes |
| 47000 | 14.00 | 10.80 | 24.80 | 24.80 | yes |
| 58523 | 14.00 | 12.75 | 26.75 | 26.75 | yes |
| 100000 | 20.50 | 12.75 | 33.25 | 33.25 | yes |
| 117045 | 20.50 | 17.40 | 37.90 | 37.90 | yes |
| 181440 | 26.00 | 17.40 | 43.40 | 43.40 | yes |
| 200000 | 29.29 | 17.40 | 46.69 | 46.69 | yes |
| 258482 | 29.29 | 18.25 | 47.54 | 47.55 | yes |
| 400000 | 33.00 | 18.25 | 51.25 | 51.25 | yes |
| open | 33.00 | 17.40 | 50.40 | 50.40 | yes |

**NB - New Brunswick**

| Row upper limit | Fed | Prov (as modelled) | Sum | Table | Match |
|---|---|---|---|---|---|
| 16452 | 0.00 | 0.00 | 0.00 | 0.00 | yes |
| 22358 | 14.00 | 0.00 | 14.00 | 14.00 | yes |
| 49592 | 14.00 | 12.40 | 26.40 | 26.40 | yes |
| 52333 | 14.00 | 9.40 | 23.40 | 23.40 | yes |
| 58523 | 14.00 | 14.00 | 28.00 | 28.00 | yes |
| 104666 | 20.50 | 14.00 | 34.50 | 34.50 | yes |
| 117045 | 20.50 | 16.00 | 36.50 | 36.50 | yes |
| 181440 | 26.00 | 16.00 | 42.00 | 42.00 | yes |
| 193861 | 29.29 | 16.00 | 45.29 | 45.29 | yes |
| 258482 | 29.29 | 19.50 | 48.79 | 48.79 | yes |
| open | 33.00 | 19.50 | 52.50 | 52.50 | yes |

**NL - Newfoundland and Labrador**

| Row upper limit | Fed | Prov (as modelled) | Sum | Table | Match |
|---|---|---|---|---|---|
| 16452 | 0.00 | 0.00 | 0.00 | 0.00 | yes |
| 22772 | 14.00 | 0.00 | 14.00 | 14.00 | yes |
| 24191 | 14.00 | 8.70 | 22.70 | 22.70 | yes |
| 29454 | 14.00 | 24.70 | 38.70 | 38.70 | yes |
| 44678 | 14.00 | 8.70 | 22.70 | 22.70 | yes |
| 58523 | 14.00 | 14.50 | 28.50 | 28.50 | yes |
| 89354 | 20.50 | 14.50 | 35.00 | 35.00 | yes |
| 117045 | 20.50 | 15.80 | 36.30 | 36.30 | yes |
| 159528 | 26.00 | 15.80 | 41.80 | 41.80 | yes |
| 181440 | 26.00 | 17.80 | 43.80 | 43.80 | yes |
| 223340 | 29.29 | 17.80 | 47.09 | 47.09 | yes |
| 258482 | 29.29 | 19.80 | 49.09 | 49.09 | yes |
| 285319 | 33.00 | 19.80 | 52.80 | 52.80 | yes |
| 570638 | 33.00 | 20.80 | 53.80 | 53.80 | yes |
| 1141275 | 33.00 | 21.30 | 54.30 | 54.30 | yes |
| open | 33.00 | 21.80 | 54.80 | 54.80 | yes |

**NS - Nova Scotia**

| Row upper limit | Fed | Prov (as modelled) | Sum | Table | Match |
|---|---|---|---|---|---|
| 15220 | 0.00 | 0.00 | 0.00 | 0.00 | yes |
| 16452 | 0.00 | 13.79 | 13.79 | 13.79 | yes |
| 21000 | 14.00 | 13.79 | 27.79 | 27.79 | yes |
| 30995 | 14.00 | 8.79 | 22.79 | 22.79 | yes |
| 58523 | 14.00 | 14.95 | 28.95 | 28.95 | yes |
| 61991 | 20.50 | 14.95 | 35.45 | 35.45 | yes |
| 97417 | 20.50 | 16.67 | 37.17 | 37.17 | yes |
| 117045 | 20.50 | 17.50 | 38.00 | 38.00 | yes |
| 157124 | 26.00 | 17.50 | 43.50 | 43.50 | yes |
| 181440 | 26.00 | 21.00 | 47.00 | 47.00 | yes |
| 258482 | 29.29 | 21.00 | 50.29 | 50.29 | yes |
| open | 33.00 | 21.00 | 54.00 | 54.00 | yes |

**NT - Northwest Territories**

| Row upper limit | Fed | Prov (as modelled) | Sum | Table | Match |
|---|---|---|---|---|---|
| 16452 | 0.00 | 0.00 | 0.00 | 0.00 | yes |
| 18198 | 14.00 | 0.00 | 14.00 | 14.00 | yes |
| 53003 | 14.00 | 5.90 | 19.90 | 19.90 | yes |
| 58523 | 14.00 | 8.60 | 22.60 | 22.60 | yes |
| 106009 | 20.50 | 8.60 | 29.10 | 29.10 | yes |
| 117045 | 20.50 | 12.20 | 32.70 | 32.70 | yes |
| 172346 | 26.00 | 12.20 | 38.20 | 38.20 | yes |
| 181440 | 26.00 | 14.05 | 40.05 | 40.05 | yes |
| 258482 | 29.29 | 14.05 | 43.34 | 43.34 | yes |
| open | 33.00 | 14.05 | 47.05 | 47.05 | yes |

**NU - Nunavut**

| Row upper limit | Fed | Prov (as modelled) | Sum | Table | Match |
|---|---|---|---|---|---|
| 16452 | 0.00 | 0.00 | 0.00 | 0.00 | yes |
| 19659 | 14.00 | 0.00 | 14.00 | 14.00 | yes |
| 55801 | 14.00 | 4.00 | 18.00 | 18.00 | yes |
| 58523 | 14.00 | 7.00 | 21.00 | 21.00 | yes |
| 111602 | 20.50 | 7.00 | 27.50 | 27.50 | yes |
| 117045 | 20.50 | 9.00 | 29.50 | 29.50 | yes |
| 181439 | 26.00 | 9.00 | 35.00 | 35.00 | yes |
| 258482 | 29.29 | 11.50 | 40.79 | 40.79 | yes |
| open | 33.00 | 11.50 | 44.50 | 44.50 | yes |

**ON - Ontario**

| Row upper limit | Fed | Prov (as modelled) | Sum | Table | Match |
|---|---|---|---|---|---|
| 16452 | 0.00 | 0.00 | 0.00 | 0.00 | yes |
| 18930 | 14.00 | 0.00 | 14.00 | 14.00 | yes |
| 24870 | 14.00 | 10.10 | 24.10 | 24.10 | yes |
| 53891 | 14.00 | 5.05 | 19.05 | 19.05 | yes |
| 58523 | 14.00 | 9.15 | 23.15 | 23.15 | yes |
| 94901 | 20.50 | 9.15 | 29.65 | 29.65 | yes |
| 107785 | 20.50 | 10.98 | 31.48 | 31.48 | yes |
| 111810 | 20.50 | 13.39 | 33.89 | 33.89 | yes |
| 117045 | 20.50 | 17.41 | 37.91 | 37.91 | yes |
| 150000 | 26.00 | 17.41 | 43.41 | 43.41 | yes |
| 181440 | 26.00 | 18.97 | 44.97 | 44.97 | yes |
| 220000 | 29.29 | 18.97 | 48.26 | 48.26 | yes |
| 258482 | 29.29 | 20.53 | 49.82 | 49.82 | yes |
| open | 33.00 | 20.53 | 53.53 | 53.53 | yes |

**PE - Prince Edward Island**

| Row upper limit | Fed | Prov (as modelled) | Sum | Table | Match |
|---|---|---|---|---|---|
| 16452 | 0.00 | 0.00 | 0.00 | 0.00 | yes |
| 18684 | 14.00 | 0.00 | 14.00 | 14.00 | yes |
| 23000 | 14.00 | 9.50 | 23.50 | 23.50 | yes |
| 30000 | 14.00 | 14.50 | 28.50 | 28.50 | yes |
| 33928 | 14.00 | 9.50 | 23.50 | 23.50 | yes |
| 58523 | 14.00 | 13.47 | 27.47 | 27.47 | yes |
| 65820 | 20.50 | 13.47 | 33.97 | 33.97 | yes |
| 106890 | 20.50 | 16.60 | 37.10 | 37.10 | yes |
| 117045 | 20.50 | 17.62 | 38.12 | 38.12 | yes |
| 142250 | 26.00 | 17.62 | 43.62 | 43.62 | yes |
| 181440 | 26.00 | 19.00 | 45.00 | 45.00 | yes |
| 200000 | 29.29 | 19.00 | 48.29 | 48.29 | yes |
| 258482 | 29.29 | 20.00 | 49.29 | 49.29 | yes |
| open | 33.00 | 20.00 | 53.00 | 53.00 | yes |

**SK - Saskatchewan**

| Row upper limit | Fed | Prov (as modelled) | Sum | Table | Match |
|---|---|---|---|---|---|
| 16452 | 0.00 | 0.00 | 0.00 | 0.00 | yes |
| 20381 | 14.00 | 0.00 | 14.00 | 14.00 | yes |
| 54532 | 14.00 | 10.50 | 24.50 | 24.50 | yes |
| 58523 | 14.00 | 12.50 | 26.50 | 26.50 | yes |
| 117045 | 20.50 | 12.50 | 33.00 | 33.00 | yes |
| 155805 | 26.00 | 12.50 | 38.50 | 38.50 | yes |
| 181440 | 26.00 | 14.50 | 40.50 | 40.50 | yes |
| 258482 | 29.29 | 14.50 | 43.79 | 43.79 | yes |
| open | 33.00 | 14.50 | 47.50 | 47.50 | yes |

**YT - Yukon**

| Row upper limit | Fed | Prov (as modelled) | Sum | Table | Match |
|---|---|---|---|---|---|
| 16452 | 0.00 | 0.00 | 0.00 | 0.00 | yes |
| 58523 | 14.00 | 6.40 | 20.40 | 20.40 | yes |
| 117045 | 20.50 | 9.00 | 29.50 | 29.50 | yes |
| 181440 | 26.00 | 10.90 | 36.90 | 36.90 | yes |
| 258482 | 29.29 | 12.93 | 42.22 | 42.23 | yes |
| 500000 | 33.00 | 12.80 | 45.80 | 45.80 | yes |
| open | 33.00 | 15.00 | 48.00 | 48.00 | yes |

**QC - Quebec** (EY gives separate federal and provincial tables; combined by me)

| Row upper limit | Federal (abated) | Provincial | Sum | Table row |
|---|---|---|---|---|
| 16,452 | 0 | 0 | 0 | 0 |
| 18,952 | 11.69 (14 x .835) | 0 (QC BPA 18,952) | 11.69 | 11.69 |
| 54,345 | 11.69 | 14 | 25.69 | 25.69 |
| 58,523 | 11.69 | 19 | 30.69 | 30.69 |
| 108,680 | 17.12 (20.5 x .835) | 19 | 36.12 | 36.12 |
| 117,045 | 17.12 | 24 | 41.12 | 41.12 |
| 132,245 | 21.71 (26 x .835) | 24 | 45.71 | 45.71 |
| 181,440 | 21.71 | 25.75 | 47.46 | 47.46 |
| 258,482 | 24.46 (29 x .835 = 24.215 + 0.25 clawback) | 25.75 | 50.21 | 50.21 |
| open | 27.56 (33 x .835) | 25.75 | 53.31 | 53.31 |

Caveat, QC only: the two tables' thresholds are on *Quebec* and *federal* taxable income, which "is likely to differ"
(EY note 2); merging them on one axis treats them as equal, which is right for an employee whose only deduction is the
RRSP (deductible in full on both). Quebec's low-income adjustments are not modelled by EY.

Grade of the tables: **medium** everywhere. The statutory rate step in every row is reproduced from CRA's own numbers
(section 2, high), but each jurisdiction's zero-tax ceiling, low-income-reduction claw-back and ON surtax cut-offs
were read only from EY's notes and BPA credit chart; the primary documents (each ministry's rate page / T4032 for that
province) were not read for those. **MB is the closest to `high`**: every row up to $200,000 (the whole range this
product uses) reproduces from T4032MB's own 10.8/12.75/17.4%, $47,000/$100,000 and $15,780, plus CRA's federal table; only
the MB BPA claw-back on 200,001-400,000 (+0.852) rests on EY note 6 (arithmetic is shown above and matches EY).

## 4. What is wrong in ca.ts today, and the effect on a refund

Current tables versus 2026 (all 13):

- **No table has the 0% BPA band.** Every current table starts at the first taxable bracket, so income below ~$16,452
  is taxed at 20-27% instead of 0%.
- **Every threshold is stale or invented** (`58522`, `117000`, `181400`, `258500` are rounded/2024-25 federal cut-offs;
  2026 is 58,523 / 117,045 / 181,440 / 258,482).
- **MB**: caps `47564` and `101200` are wrong (frozen at 47,000 / 100,000); no 0% and 10.8% bands; last three rows
  `0.434 / 0.464 / 0.504` miss the 200,000 (46.69%), 258,482 (47.55%) and 400,000 (51.25% then 50.40%) structure.
- **ON**: first cap `52886` (should be 53,891 with a 0% / 14% / 24.10% low-income structure below), `105775` and
  `253414` are not ON 2026 figures; missing the $150,000 / $220,000 brackets (11.16 / 12.16 / 13.16 plus surtax) so
  everything from ~$107k to ~$258k is wrong by up to 1.5 points; top 53.53 is right.
- **BC**: rates `0.2006 / 0.227 / 0.287 / 0.317 / 0.407 / 0.457 / 0.535` reflect the old 5.06% bottom bracket and six
  wrong caps; 2026 has 7 provincial brackets (5.6-20.5%).
- **QC**: `53255` etc. are federal-style caps mixed with QC ones; no 0% or 11.69% (abated fed only) band; 58,522 row wrong.
- **AB**: `[60000, 0.24]` — AB now has an 8% bracket to 61,200 and 10-15% above; 0.24 is the old 10% + 14% fed; whole
  table off by 1-6 points below $154k, and no 0% band.
- **SK, NS**: SK `54000/0.245`, `58522/.26` etc. are near-right in the middle but miss 0% band and cap 54,532 / 155,805;
  NS's `32074 / 0.2379`, `64181 / 0.345` and `0.43` above 117,000 do not match 2026 (38.00% to 157,124, then 43.5 / 47.0 / 50.29 / 54.0).
- **NB, NL, PE, YT, NT, NU** (six jurisdictions) all read the made-up `CA` table (24.5% to 55,000; 27% to 58,522;
  33.5% to 110,000; …). It is wrong for all six by 0 to 8 points at every income (e.g. NU/NT/YT overstated by ~7-8
  points at $40,000).

`taxOnBand` results (refund on a $13,500 RRSP deduction; slices 61,500-75,000 and 26,500-40,000), current vs corrected,
whole dollars (script over the exact `taxOnBand` algorithm; hand arithmetic for five below):

| Prov | $75k current | $75k corrected | $40k current | $40k corrected | Note |
|---|---|---|---|---|---|
| MB | 4,489 | 4,489 | 3,348 | 3,348 | identical *at these two incomes* only |
| ON | 4,003 | 4,003 | 2,707 | 2,572 | -135 |
| BC | 3,874 | 3,807 | 2,708 | 3,127 | +419 at $40k |
| QC | 4,876 | 4,876 | 3,582 | 3,468 | |
| AB | 4,118 | 4,118 | 3,240 | 2,970 | -270 |
| SK | 4,522 | 4,455 | 3,308 | 3,308 | |
| NS | 5,577 | 5,010 | 3,704 | 3,631 | 75k overstated by $567 |
| NB | 4,522 (CA fallback) | 4,658 | 3,308 | 3,564 | |
| NL | 4,522 (fallback) | 4,725 | 3,308 | 3,537 | |
| PE | 4,522 (fallback) | 4,873 | 3,308 | 3,589 | |
| YT | 4,522 (fallback) | 3,982 | 3,308 | 2,754 | overstated $540 / $554 |
| NT | 4,522 (fallback) | 3,929 | 3,308 | 2,686 | overstated $593 / $622 |
| NU | 4,522 (fallback) | 3,713 | 3,308 | 2,430 | overstated $809 / $878 |

Hand arithmetic (rate x dollars in each band; `taxOnBand` = sum over bands of overlap x rate):

- **MB $75,000**: slice 61,500-75,000 lies wholly in the 58,523-100,000 row. Current: 58,522-101,200 row 0.3325 ->
  13,500 x 0.3325 = **4,488.75**. Corrected: 58,523-100,000 row 0.3325 -> 13,500 x 0.3325 = **4,488.75**. Same.
- **MB $40,000**: slice 26,500-40,000, wholly in 16,452-47,000 (corrected) / 0-47,564 (current). 13,500 x 0.248 =
  **3,348.00** both. **The example incomes hide the MB error; where the slice touches an edge it shows:**
  - $20,000 (slice 6,500-20,000): corrected 9,280 x 0 + 672 x 0.108 + 3,548 x 0.248 = 0 + 72.58 + 879.90 = **952.48**;
    current 13,500 x 0.248 = **3,348.00** (overstated 2,395, i.e. 3.5x).
  - $50,000 (36,500-50,000): current 11,064 x .248 + 2,436 x .2675 = 2,743.9 + 651.6 = 3,395.5; corrected 10,500 x .248 +
    3,000 x .2675 = 2,604 + 802.5 = 3,406.5 (+11).
  - $110,000 (96,500-110,000): current 4,700 x .3325 + 8,800 x .379 = 1,562.75 + 3,335.2 = 4,897.95; corrected
    3,500 x .3325 + 10,000 x .379 = 1,163.75 + 3,790 = 4,953.75 (+56).
  - $190,000 (176,500-190,000): current 4,900 x .434 + 8,600 x .464 = 2,126.6 + 3,990.4 = 6,117.0; corrected
    4,940 x .434 + 8,560 x .4669 = 2,143.96 + 3,996.66 = 6,140.6 (+24; the MB claw-back band).
- **ON $40,000** (26,500-40,000): current 0-52,886 row 0.2005 -> 13,500 x 0.2005 = **2,706.75**; corrected 24,871-53,891 row
  0.1905 -> 13,500 x 0.1905 = **2,571.75**. The 1-point gap is the current table using 5.05 + 15 stacked (old
  federal rate 15%) instead of 14 + 5.05.
- **BC $40,000** (26,500-40,000): current 13,500 x 0.2006 = 2,708.1; corrected 25,571-44,952 row 0.2316 -> 13,500 x
  0.2316 = **3,126.6** — the low-income claw-back band (the tax reduction is being clawed back at 3.56 points).
- **NS $75,000** (61,500-75,000): corrected 61,500-61,991 = 491 x 0.3545 = 174.06; 61,991-75,000 = 13,009 x 0.3717 =
  4,835.4; total **5,009.5**; current 61,500-64,181 x .345 (2,681 x .345 = 924.9) + 64,181-75,000 x .43 (10,819 x .43 =
  4,652.2) = **5,577.1** (overstated by 568 — a 13% error in the headline refund).
- **YT $40,000** (26,500-40,000): corrected 13,500 x 0.204 = **2,754**; current CA fallback 13,500 x 0.245 = **3,307.5**.

Reading: at the product's typical incomes the current tables are wrong by tens to several hundred dollars per province
(up to ~27% at $40,000 for the territories), and by thousands below the BPA. The refund never goes negative, so it is a one-sided
overstatement of the payoff, i.e. exactly the headline the page leads with.

## 5. Manitoba — winnipeg.ts `marginal` vs ca.ts `marginal.MB`

`src/domain/jurisdictions/winnipeg.ts` `marginal` (sourced from EY 2026-01-15):
`[15780,0] [16452,.108] [47000,.248] [58523,.2675] [100000,.3325] [117045,.379] [181440,.434] [200000,.4669]
[258482,.4755] [400000,.5125] [null,.504]`. It equals, row for row, the EY **2026-06-15** Manitoba table (I diffed the
January and June PDFs: Manitoba is unchanged) and equals the corrected table in section 7. Every row up to $200,000
reproduces from CRA's T4032MB (10.8 / 12.75 / 17.4%, 47,000 / 100,000, BPA 15,780, federal table). **Yes: it can be used
as-is for `ca.marginal.MB`**, and the two should be one constant so they cannot drift (winnipeg.ts's `marginal` field
is unread today — `grep` shows only ca.ts's table is consumed by `taxOnBand`). Suggested grade for both: `medium`, src
EY, asOf `2026-06-15` (the June PDF), with the note that rows to $200,000 are primary-reproducible; winnipeg.ts's comment
"nothing reads this field yet" is also stale relative to the engine. TaxTips' MB page agrees (rate 47.54 vs EY 47.55 on
200,001-258,482 is rounding of the +0.852 claw-back).

## 6. Effects included per jurisdiction

| Jur. | 0% BPA band | Fed BPA phase-down | Prov BPA/LIT claw-back | Surtax | Other |
|---|---|---|---|---|---|
| AB | to 16,452, then 14% to 22,769 | yes | none (AB BPA is a flat credit) | none | — |
| BC | 0 to 16,452; 14% to 25,537 | yes | LIT claw-back +3.56 (25,571-44,952) | none | BC top rate 20.5% |
| MB | 0 to 15,780; 10.8% to 16,452 | yes | MB BPA claw-back +0.852 (200k-400k) | none | drops above 400k |
| NB | to 16,452, 14% to 22,358 | yes | LIT +3 to 49,592 | none | — |
| NL | to 16,452, 14% to 22,772 | yes | LIT +16 (24,192-29,454) | none | eight brackets |
| NS | 0 to 15,220; 13.79 to 16,452 | yes | LIT +5 (15,221-21,000) | none | — |
| NT | to 16,452, 14% to 18,198 | yes | none | none | — |
| NU | to 16,452, 14% to 19,659 | yes | none | none | — |
| ON | to 16,452, 14% to 18,930 | yes | LIT +5.05 (18,931-24,870) | 20% & 36% included | **OHP excluded** (up to $900 for taxable income above $200,599; a stepped premium that adds a few points on narrow ranges between $20k and $200,599) |
| PE | to 16,452, 14% to 18,684 | yes | LIT +5 (23,001-30,000) | none | 20% band above $200k |
| QC | to 16,452; 11.69 to 18,952 | yes (+0.25 abated) | no QC low-income modelled | none | 16.5% federal abatement; QPP/health fund excluded |
| SK | to 16,452, 14% to 20,381 | yes | none | none | — |
| YT | to 16,452 | yes | YT BPA claw-back +0.13 | none | YT BPA = federal BPA |

## 7. Changes recommended

Replace the whole `marginal` object in `src/domain/rules/ca.ts` with the thirteen keys below (keep `marginalFallbackKey:
"CA"`; `ca.test.ts` requires `marginal.CA` and ascending caps ending in `null`, all satisfied — the tables are
deliberately NOT monotone in rate: several fall at the end of a low-income claw-back). Each `conf`/`asOf`/`src` below is
for the **provenance entry** (`marginal`) — one entry carries one conf, so use `medium` and record the per-province caveats in `note`.

**Suggested provenance for the `marginal` map entry** (replace the current `assumption`):

```ts
marginal: {
  conf: "medium",
  src: "EY, Combined federal and provincial personal income tax rates - 2026 (one PDF per jurisdiction; rates reflect budget proposals and news releases to 2026-06-15). Statutory rates cross-checked against CRA's 2026 tax rates page and T4032 (Manitoba edition) for the federal table and the twelve non-Quebec jurisdictions; Quebec combined by summing EY's federal (16.5%-abated) and provincial tables",
  asOf: "2026-06-15",
  url: "https://www.ey.com/content/dam/ey-unified-site/ey-com/en-ca/services/tax/tax-calculators/2026/ey-tax-rates-manitoba-2026-06-15.pdf",
  note: "Every row reproduces from CRA's statutory rates by shown arithmetic (fed 14/20.5/26/29/33 + provincial, +0.29 federal BPA phase-down 181,441-258,482). Low-income-reduction claw-backs (ON/BC/NB/NL/NS/PE), the Ontario 20%/36% surtax and the MB BPA claw-back (+0.852, 200k-400k) come from EY's notes only, hence medium. EXCLUDES the Ontario Health Premium (up to $900), Quebec's health services fund, CPP/EI/QPP, AMT and every credit other than the basic personal amounts. Supersedes the 2026-01-15 EY edition for BC (5.6% bottom rate) and PE (20% band above $200,000). Manitoba: 47,000/100,000 thresholds (indexation frozen since 2025), NOT 47,564/101,200. CRA's page as read through a summariser printed 47,564; T4032MB and Manitoba Finance say 47,000.",
},
```

(Optional: `MB` alone could be `high` for rows to $200,000 if the row set were split; not recommended, one conf per map entry.)

The rows (values are fractions, upper limit inclusive, ready to paste; each block's includes-list follows it):

### AB
```ts
AB: [[16452, 0], [22769, 0.14], [58523, 0.22], [61200, 0.285], [117045, 0.305], [154259, 0.36], [181440, 0.38], [185111, 0.4129], [246813, 0.4229], [258482, 0.4329], [370220, 0.47], [null, 0.48]],
```
- conf: `medium` · asOf `2026-06-15` · includes: 0% to 16,452 (fed BPA); 14% (fed only) 16,453-22,769 (AB BPA $22,769 - derived from EY credit chart 1,822/8%); 22% = 14+8; then 8/10/12/13/14/15% AB brackets (CRA) stacked on fed; 0.29 fed BPA clawback 181,441-258,482 included.

### BC
```ts
BC: [[16452, 0], [25537, 0.14], [25570, 0.196], [44952, 0.2316], [50363, 0.196], [58523, 0.217], [100728, 0.282], [115648, 0.31], [117045, 0.3279], [140430, 0.3829], [181440, 0.407], [190405, 0.4399], [258482, 0.4609], [265545, 0.498], [null, 0.535]],
```
- conf: `medium` · asOf `2026-06-15` · includes: 0% to 16,452; 14% until 25,537 (BC low-income tax reduction zeroes BC tax to $25,537, EY note 5); 19.60% (25,538-25,570) then 23.16% (25,571-44,952) = 14+5.6+3.56 LIT clawback; 19.60/21.70 = 14+5.6 / 14+7.7; higher rows stack CRA's 10.5/12.29/14.7/16.8/20.5 on fed. June-2026 EY revision; January EY (5.06% rate, 24,580/41,722 cut-offs) is STALE - do not use.

### MB
```ts
MB: [[15780, 0], [16452, 0.108], [47000, 0.248], [58523, 0.2675], [100000, 0.3325], [117045, 0.379], [181440, 0.434], [200000, 0.4669], [258482, 0.4755], [400000, 0.5125], [null, 0.504]],
```
- conf: `medium` · asOf `2026-06-15` · includes: 0% to 15,780 (MB BPA); 10.8% MB only 15,781-16,452 (fed BPA still zeroes fed tax); then fed+MB. Includes fed BPA phase-down (+0.29 on 181,441-258,482) and MB BPA clawback (+0.852 on 200,001-400,000, falling away above 400,000). No surtax, no low-income reduction in MB.

### NB
```ts
NB: [[16452, 0], [22358, 0.14], [49592, 0.264], [52333, 0.234], [58523, 0.28], [104666, 0.345], [117045, 0.365], [181440, 0.42], [193861, 0.4529], [258482, 0.4879], [null, 0.525]],
```
- conf: `medium` · asOf `2026-06-15` · includes: 0% to 16,452; 14% to 22,358 (NB low-income reduction); 26.40% = 14+9.4+3.0 clawback to 49,592; 23.40% = 14+9.4; then 14/16/19.5 stacked; fed clawback included.

### NL
```ts
NL: [[16452, 0], [22772, 0.14], [24191, 0.227], [29454, 0.387], [44678, 0.227], [58523, 0.285], [89354, 0.35], [117045, 0.363], [159528, 0.418], [181440, 0.438], [223340, 0.4709], [258482, 0.4909], [285319, 0.528], [570638, 0.538], [1141275, 0.543], [null, 0.548]],
```
- conf: `medium` · asOf `2026-06-15` · includes: 0% to 16,452; 14% to 22,772; 22.70% = 14+8.7; 38.70% = 14+8.7+16 (LIT clawback) 24,192-29,454; then 22.70 again 29,455-44,678; 8 provincial brackets stacked; fed clawback included. June-2026 EY.

### NS
```ts
NS: [[15220, 0], [16452, 0.1379], [21000, 0.2779], [30995, 0.2279], [58523, 0.2895], [61991, 0.3545], [97417, 0.3717], [117045, 0.38], [157124, 0.435], [181440, 0.47], [258482, 0.5029], [null, 0.54]],
```
- conf: `medium` · asOf `2026-06-15` · includes: 0% to 15,220 (NS BPA/LIT); 13.79% = 8.79 + 5 clawback (fed still 0) 15,221-16,452; 27.79% = 14+8.79+5 to 21,000; 22.79% = 14+8.79; then 14.95/16.67/17.5/21 stacked; fed clawback included.

### NT
```ts
NT: [[16452, 0], [18198, 0.14], [53003, 0.199], [58523, 0.226], [106009, 0.291], [117045, 0.327], [172346, 0.382], [181440, 0.4005], [258482, 0.4334], [null, 0.4705]],
```
- conf: `medium` · asOf `2026-06-15` · includes: 0% to 16,452; 14% to 18,198 (NT BPA ~$18.2k); then fed + 5.9/8.6/12.2/14.05.

### NU
```ts
NU: [[16452, 0], [19659, 0.14], [55801, 0.18], [58523, 0.21], [111602, 0.275], [117045, 0.295], [181439, 0.35], [258482, 0.4079], [null, 0.445]],
```
- conf: `medium` · asOf `2026-06-15` · includes: 0% to 16,452; 14% to 19,659 (NU BPA ~$19.7k); then fed + 4/7/9/11.5. EY's top-of-bracket 181,439/181,440 quirk reproduced from CRA (NU 3rd bracket ends 181,439).

### ON
```ts
ON: [[16452, 0], [18930, 0.14], [24870, 0.241], [53891, 0.1905], [58523, 0.2315], [94901, 0.2965], [107785, 0.3148], [111810, 0.3389], [117045, 0.3791], [150000, 0.4341], [181440, 0.4497], [220000, 0.4826], [258482, 0.4982], [null, 0.5353]],
```
- conf: `medium` · asOf `2026-06-15` · includes: 0% to 16,452; 14% to 18,930 (ON low-income tax reduction); 24.10 = 14+5.05+5.05 (reduction clawback) 18,931-24,870; 19.05 = 14+5.05; 23.15 = 14+9.15; then surtax: 9.15x1.2 (94,902-111,810 with 11.16 x1.2 above 107,785) and x1.56 above 111,810 (20% + 36% surtax). EXCLUDES Ontario Health Premium (up to $900).

### PE
```ts
PE: [[16452, 0], [18684, 0.14], [23000, 0.235], [30000, 0.285], [33928, 0.235], [58523, 0.2747], [65820, 0.3397], [106890, 0.371], [117045, 0.3812], [142250, 0.4362], [181440, 0.45], [200000, 0.4829], [258482, 0.4929], [null, 0.53]],
```
- conf: `medium` · asOf `2026-06-15` · includes: 0% to 16,452; 14% to 18,684; 23.50% = 14+9.5; 28.50% = 14+9.5+5 clawback 23,001-30,000; 23.50% again 30,001-33,928; 27.47/33.97/37.10/38.12 etc. stacked; PEI 19%/20% bands split at 200,000 so 181,441-200,000 = 29.29+19 = 48.29 and above 49.29. June-2026 EY (January lacked the 200,000 split and the 20% top rate: STALE).

### QC
```ts
QC: [[16452, 0], [18952, 0.1169], [54345, 0.2569], [58523, 0.3069], [108680, 0.3612], [117045, 0.4112], [132245, 0.4571], [181440, 0.4746], [258482, 0.5021], [null, 0.5331]],
```
- conf: `medium` · asOf `2026-06-15` · includes: Built by me from EY's separate tables: federal column already net of the 16.5% Quebec abatement (14% x 0.835 = 11.69; 20.5 x .835 = 17.12; 26 x .835 = 21.71; 29 x .835 + 0.25 clawback = 24.46; 33 x .835 = 27.56) + QC provincial 14/19/24/25.75% with QC BPA 18,952 (no QC low-income band modelled). Excludes QPP/health fund contribution. Uses federal thresholds for both (QC taxable income differs slightly).

### SK
```ts
SK: [[16452, 0], [20381, 0.14], [54532, 0.245], [58523, 0.265], [117045, 0.33], [155805, 0.385], [181440, 0.405], [258482, 0.4379], [null, 0.475]],
```
- conf: `medium` · asOf `2026-06-15` · includes: 0% to 16,452; 14% to 20,381 (SK BPA ~$20,381); then fed + 10.5/12.5/14.5; fed clawback included.

### YT
```ts
YT: [[16452, 0], [58523, 0.204], [117045, 0.295], [181440, 0.369], [258482, 0.4223], [500000, 0.458], [null, 0.48]],
```
- conf: `medium` · asOf `2026-06-15` · includes: 0% to 16,452 (Yukon BPA = federal BPA incl. additional amount); fed + 6.4/9/10.9/12.8/15; +0.29 fed and +0.13 YT clawbacks 181,441-258,482 (EY shows 42.23%; arithmetic 29.29+12.8+0.13 = 42.22, 0.01 rounding).

### CA (fallback, replaces the made-up table)
```ts
CA: [[16452, 0], [58523, 0.14], [117045, 0.205], [181440, 0.26], [258482, 0.2929], [null, 0.33]],
```
Federal-only (0% to the federal BPA $16,452, 14/20.5/26/29.29/33): every input is CRA's own 2026 figures, so this row set is `high`. It is used only for an unknown region.
