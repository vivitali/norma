# Market data verification — `bench`, `rent`, `yoy` (2026-08-17)

Scope: the 14 records in `src/domain/jurisdictions/`. Every figure in those files is an unverified
placeholder carried over from `design-reference/`. This document records what could be sourced from
primary publishers as of **2026-08-17**, and what could not.

**Latest data available at time of writing:** resale boards had published **July 2026**; CMHC's most
recent Rental Market Survey reference period is **October 2025** (published 2025-12-11 — there is no
newer official RMS number, the June 2026 mid-year update publishes indices only, not dollar levels).

**No edits were made under `src/`.** This is a research artifact only.

---

## Conventions used below

- **`bench.house`** — matched to the board's *single-family detached* MLS® HPI benchmark where one
  exists; otherwise the board's single-family average/median, clearly labelled.
- **`bench.condo`** — the board's *apartment* MLS® HPI benchmark.
- **`bench.newbuild`** — see [New-build prices](#new-build-prices-benchnewbuild). No public source
  publishes new-construction price *levels* by city. Every `newbuild` figure below is `UNVERIFIED`.
- **`rent`** — CMHC Rental Market Survey, **average rent for a 2-bedroom purpose-built apartment**,
  October 2025, CMA level, pulled from CMHC's HMIP tables (the canonical query is
  `Primary Rental Market → Average Rent ($) → Bedroom Type`). Reliability codes from CMHC are quoted
  where relevant (`a` = excellent).
- **`yoy`** — the board's *composite* benchmark year-over-year change unless noted. Composite is the
  defensible choice for a single scalar; a per-property-type `yoy` would be more accurate but the
  type does not currently model that.
- **Geographic scope** matters and differs per record. Called out per row where the placeholder and
  the verified figure are measuring different geographies.

---

## Findings

| Jurisdiction | Field | Current placeholder | Verified value | Source (URL) | Source date | Confidence |
|---|---|---|---|---|---|---|
| **toronto** | `bench.house` | 1,180,000 | **$1,455,200** (City of Toronto, single-family detached MLS® HPI benchmark; −4.40% YoY). All-TRREB-areas equivalent is $1,221,800, −4.61% | [TRREB Market Watch mw2607.pdf](https://trreb.ca/wp-content/files/market-stats/market-watch/mw2607.pdf) p.25–26 | July 2026 | High |
| toronto | `bench.condo` | 688,000 | **$551,900** (City of Toronto apartment benchmark; −7.09% YoY). All-TRREB $535,200, −7.35% | [TRREB Market Watch mw2607.pdf](https://trreb.ca/wp-content/files/market-stats/market-watch/mw2607.pdf) p.26 | July 2026 | High |
| toronto | `bench.newbuild` | 1,090,000 | UNVERIFIED — see [New-build prices](#new-build-prices-benchnewbuild) | — | — | — |
| toronto | `rent` | 2,850 | **$2,045** (Toronto CMA, 2-bdrm purpose-built apartment, reliability `a`). City-of-Toronto-only zones run higher: Toronto (Central) $2,776 `b`, Toronto (North) $2,476 `a` | [CMHC HMIP — Toronto, Average Rent by Bedroom Type](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=2270&GeographyType=MetropolitanMajorArea&RowField=TIMESERIES) | October 2025 | High |
| toronto | `yoy` | +0.008 | **−0.0383** (City of Toronto composite). All-TRREB composite −0.0463 | [TRREB Market Watch mw2607.pdf](https://trreb.ca/wp-content/files/market-stats/market-watch/mw2607.pdf) | July 2026 | High |
| **ottawa** | `bench.house` | 690,000 | **$725,000** (single-family MLS® HPI benchmark; +0.7% YoY) | [CREA Stats — Ottawa Real Estate Board](https://creastats.crea.ca/board/otta/) | July 2026 | High |
| ottawa | `bench.condo` | 425,000 | **$385,500** (apartment benchmark; −5.2% YoY) | [CREA Stats — Ottawa Real Estate Board](https://creastats.crea.ca/board/otta/) | July 2026 | High |
| ottawa | `bench.newbuild` | 720,000 | UNVERIFIED | — | — | — |
| ottawa | `rent` | 2,150 | **$1,916** (Ottawa — Ontario part of the Ottawa-Gatineau CMA, 2-bdrm, `a`) | [CMHC HMIP — Ottawa](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=1265&GeographyType=MetropolitanMajorArea&RowField=TIMESERIES) | October 2025 | High |
| ottawa | `yoy` | +0.021 | **−0.005** (composite $634,000) | [CREA Stats — Ottawa Real Estate Board](https://creastats.crea.ca/board/otta/) | July 2026 | High |
| **vancouver** | `bench.house` | 1,720,000 | **$1,822,900** (Metro Vancouver detached MLS® HPI benchmark; −7.0% YoY) | [Greater Vancouver REALTORS® July 2026 release](https://www.mikestewart.ca/july-2026-greater-vancouver-realtors-statistics/) (GVR's own page at gvrealtors.ca returned 403 to automated fetch); June 2026 corroborated at [CREA Stats — GVR](https://creastats.crea.ca/board/vanc/) | July 2026 | Medium-High (figure reproduced from GVR release by a secondary site; June 2026 primary = $1,842,900) |
| vancouver | `bench.condo` | 762,000 | **$688,000** (apartment benchmark; −7.5% YoY). June 2026 primary: $695,200, −7.1% | [GVR July 2026 release](https://www.mikestewart.ca/july-2026-greater-vancouver-realtors-statistics/); [CREA Stats — GVR](https://creastats.crea.ca/board/vanc/) | July 2026 (June 2026 primary) | Medium-High |
| vancouver | `bench.newbuild` | 1,090,000 | UNVERIFIED | — | — | — |
| vancouver | `rent` | 3,150 | **$2,364** (Vancouver CMA, 2-bdrm, `a`) | [CMHC HMIP — Vancouver](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=2410&GeographyType=MetropolitanMajorArea&RowField=TIMESERIES) | October 2025 | High |
| vancouver | `yoy` | −0.005 | **−0.062** (composite $1,088,800) | [GVR July 2026 release](https://www.mikestewart.ca/july-2026-greater-vancouver-realtors-statistics/) | July 2026 | Medium-High |
| **halifax** | `bench.house` | 585,000 | **PARTIAL.** NSAR publishes MLS® HPI by property type only for **Nova Scotia province-wide**: single-family $425,200, +0.6% YoY. For Halifax-Dartmouth NSAR publishes only a composite benchmark ($557,300, ≈0.0% YoY) plus average sold prices: Halifax-Dartmouth SFD average $625,915 (+2.7%) | [CREA Stats — NSAR](https://creastats.crea.ca/board/nsar/); [NSAR statistical report stats0626.pdf](https://www.nsrealtors.ca/common/Uploaded%20files/NSAR%20PDF%20document/Public%20Site/stats0626.pdf); Halifax-Dartmouth composite via [WOWA Halifax](https://wowa.ca/halifax-housing-market) | July 2026 | Medium — the province-wide type split is not Halifax; the Halifax-specific number is an average, not a benchmark |
| halifax | `bench.condo` | 460,000 | **PARTIAL.** Nova Scotia province-wide apartment benchmark $435,100 (−7.8% YoY). Halifax-Dartmouth apartment *average* sold price $440,747 (−11.0%) | same as above | July 2026 | Medium |
| halifax | `bench.newbuild` | 640,000 | UNVERIFIED | — | — | — |
| halifax | `rent` | 2,050 | **$1,828** (Halifax CMA, 2-bdrm, `a`) | [CMHC HMIP — Halifax](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=0580&GeographyType=MetropolitanMajorArea&RowField=TIMESERIES) | October 2025 | High |
| halifax | `yoy` | +0.034 | **≈0.000** (Halifax-Dartmouth composite benchmark, essentially flat; NS province-wide composite $429,100, 0.0%) | [CREA Stats — NSAR](https://creastats.crea.ca/board/nsar/); [WOWA Halifax](https://wowa.ca/halifax-housing-market) | July 2026 | Medium-High |
| **winnipeg** | `bench.house` | 454,264 | **$454,264** — placeholder is exactly correct. Residential-detached **average** price (WinnipegREALTORS publishes averages, not an MLS® HPI benchmark), +2% YoY | [WinnipegREALTORS July 2026 release](https://www.winnipegregionalrealestatenews.com/market-statistics/market-releases/article/626/residential-detached-homes-and-condominiums-set-new-july-average-price-records) (published 2026-08-06) | July 2026 | High |
| winnipeg | `bench.condo` | 290,522 | **$290,522** — placeholder is exactly correct. Condominium average price, +2% YoY | same as above | July 2026 | High |
| winnipeg | `bench.newbuild` | 480,000 | UNVERIFIED | — | — | — |
| winnipeg | `rent` | 1,600 | **$1,570** (Winnipeg CMA, 2-bdrm, `a`) | [CMHC HMIP — Winnipeg](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=2680&GeographyType=MetropolitanMajorArea&RowField=TIMESERIES) | October 2025 | High |
| winnipeg | `yoy` | +0.024 | **+0.02** (rounded, as published — WinnipegREALTORS reports whole percents) | same release | July 2026 | Medium-High (precision limited by publisher) |
| **montreal** | `bench.house` | 640,000 | **$650,000** — Montreal CMA **median** price, single-family home (APCIQ/Centris publishes medians, not an HPI benchmark). +4% YoY. Island of Montreal only: $817,500, +7% | [APCIQ July 2026 statistics PDF](https://apciqca-152af.kxcdn.com/wp-content/uploads/sites/4/2026/08/stats-202607-en.pdf) p.4 | July 2026 | High |
| montreal | `bench.condo` | 442,000 | **$431,500** — Montreal CMA median condominium price, +2% YoY (exact: +1.53%). Island of Montreal: $480,000 | same PDF | July 2026 | High |
| montreal | `bench.newbuild` | 690,000 | UNVERIFIED | — | — | — |
| montreal | `rent` | 1,950 | **$1,346** (Montréal CMA, 2-bdrm, `a`) — the placeholder is ~45% too high | [CMHC HMIP — Montréal](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=1060&GeographyType=MetropolitanMajorArea&RowField=TIMESERIES) | October 2025 | High |
| montreal | `yoy` | +0.041 | **+0.04** (single-family median, Montreal CMA). APCIQ publishes no composite index | [APCIQ July 2026 PDF](https://apciqca-152af.kxcdn.com/wp-content/uploads/sites/4/2026/08/stats-202607-en.pdf) | July 2026 | High |
| **calgary** | `bench.house` | 622,000 | **$743,900** (detached benchmark; ≈−2% YoY) | [CREB July 2026 media release](https://www.creb.com/News/Media_Releases/2026/August/July_2026_Stats/); June 2026 corroborated at [CREA Stats — CREB](https://creastats.crea.ca/board/calg/) ($750,500) | July 2026 | High |
| calgary | `bench.condo` | 342,000 | **$297,600** (apartment-condominium benchmark; −8%+ YoY; ~13% below the 2024 peak) | [CREB July 2026 media release](https://www.creb.com/News/Media_Releases/2026/August/July_2026_Stats/) | July 2026 | High |
| calgary | `bench.newbuild` | 660,000 | UNVERIFIED | — | — | — |
| calgary | `rent` | 1,850 | **$1,908** (Calgary CMA, 2-bdrm, `a`) | [CMHC HMIP — Calgary](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=0140&GeographyType=MetropolitanMajorArea&RowField=TIMESERIES) | October 2025 | High |
| calgary | `yoy` | +0.028 | **−0.02** (total residential benchmark $569,200) | [CREB July 2026 media release](https://www.creb.com/News/Media_Releases/2026/August/July_2026_Stats/) | July 2026 | High |
| **saskatoon** | `bench.house` | 402,000 | **PARTIAL — $448,400** is Saskatoon's *residential composite* benchmark (record high, +4.9% YoY). The Saskatchewan REALTORS® Association does **not** publish an HPI split by property type for Saskatoon; June average price was $446,853 | [CREA Stats — Saskatchewan REALTORS® Association](https://creastats.crea.ca/board/sra/) | June 2026 | Medium — composite, not detached; and one month older than the other boards |
| saskatoon | `bench.condo` | 232,000 | **UNVERIFIED.** No apartment-level benchmark published for Saskatoon by SRA or CREA's public board page. Tried: creastats.crea.ca/board/sra/, saskatchewanrealtors.ca (DNS failure), CREA HPI tool (login-walled) | — | — | — |
| saskatoon | `bench.newbuild` | 455,000 | UNVERIFIED | — | — | — |
| saskatoon | `rent` | 1,450 | **$1,559** (Saskatoon CMA, 2-bdrm, `a`) | [CMHC HMIP — Saskatoon](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=1700&GeographyType=MetropolitanMajorArea&RowField=TIMESERIES) | October 2025 | High |
| saskatoon | `yoy` | +0.039 | **+0.049** (Saskatoon composite benchmark) | [CREA Stats — SRA](https://creastats.crea.ca/board/sra/) | June 2026 | Medium-High |
| **nb** (province-wide) | `bench.house` | 365,000 | **$345,500** — New Brunswick province-wide single-family MLS® HPI benchmark, +6.9% YoY. NBREA publishes a province-wide HPI, so no city proxy is needed | [CREA Stats — New Brunswick REALTORS®](https://creastats.crea.ca/board/nbreb/) | July 2026 | High |
| nb | `bench.condo` | 285,000 | **$277,100** — province-wide apartment benchmark, −3.6% YoY | same | July 2026 | High |
| nb | `bench.newbuild` | 420,000 | UNVERIFIED | — | — | — |
| nb | `rent` | *(absent — `cityData: false`)* | **$1,374** — New Brunswick province-wide, 2-bdrm, `a`. City detail: Moncton $1,452, Saint John $1,290 | [CMHC HMIP — New Brunswick](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=13&GeographyType=Province&RowField=TIMESERIES) | October 2025 | High |
| nb | `yoy` | *(absent)* | **+0.067** (province composite $344,000) | [CREA Stats — NBREA](https://creastats.crea.ca/board/nbreb/) | July 2026 | High |
| **nl** (province-wide) | `bench.house` | 335,000 | **$362,100** — NL province-wide single-family benchmark, +9.1% YoY. (St. John's metro alone: $447,800, +10.1%) | [CREA Stats — NL Association of REALTORS®](https://creastats.crea.ca/board/stjo/) | July 2026 | High |
| nl | `bench.condo` | 290,000 | **$275,300** — NL province-wide apartment benchmark, +8.8% YoY. (St. John's: $274,700) | same | July 2026 | High |
| nl | `bench.newbuild` | 400,000 | UNVERIFIED | — | — | — |
| nl | `rent` | *(absent)* | **$1,194** — NL province-wide, 2-bdrm, `a`. St. John's CMA: $1,348 (`b` — very good) | [CMHC HMIP — Newfoundland and Labrador](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=10&GeographyType=Province&RowField=TIMESERIES) | October 2025 | High |
| nl | `yoy` | *(absent)* | **+0.093** (province composite $359,300) | [CREA Stats — NLAR](https://creastats.crea.ca/board/stjo/) | July 2026 | High |
| **pe** (province-wide) | `bench.house` | 388,000 | **$388,400** — PEI composite/single-family benchmark, +2.4% YoY. (Placeholder is within $400 — likely already sourced from this series at an earlier date.) | [CREA Stats — PEI Real Estate Association](https://creastats.crea.ca/board/peia/) | July 2026 | High |
| pe | `bench.condo` | 320,000 | **UNVERIFIED.** PEIREA/CREA publish a *combined* composite/single-family benchmark only — no separate apartment or townhouse benchmark exists for PEI (transaction volume too low). Tried: creastats.crea.ca/board/peia/, members.peirea.com/public-statistics | — | — | — |
| pe | `bench.newbuild` | 440,000 | UNVERIFIED | — | — | — |
| pe | `rent` | *(absent)* | **$1,331** — PEI province-wide, 2-bdrm, `a` | [CMHC HMIP — Prince Edward Island](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=11&GeographyType=Province&RowField=TIMESERIES) | October 2025 | High |
| pe | `yoy` | *(absent)* | **+0.024** | [CREA Stats — PEIREA](https://creastats.crea.ca/board/peia/) | July 2026 | High |
| **yt** (Yukon) | `bench.house` | 620,000 | **UNVERIFIED** — see [Unverifiable / needs a human](#unverifiable--needs-a-human) | — | — | — |
| yt | `bench.condo` | 480,000 | **UNVERIFIED** | — | — | — |
| yt | `bench.newbuild` | 690,000 | **UNVERIFIED** | — | — | — |
| yt | `rent` | *(absent)* | **UNVERIFIED** — CMHC surveys Whitehorse but **suppresses every Yukon cell** (`**`) for all years 2013–2025 (confidentiality / not statistically reliable) | [CMHC HMIP — Yukon Territories](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=60&GeographyType=Province&RowField=TIMESERIES) | October 2025 | — (suppressed at source) |
| yt | `yoy` | *(absent)* | **UNVERIFIED** | — | — | — |
| **nt** (NWT) | `bench.house` | 470,000 | **UNVERIFIED** | — | — | — |
| nt | `bench.condo` | 380,000 | **UNVERIFIED** | — | — | — |
| nt | `bench.newbuild` | 560,000 | **UNVERIFIED** | — | — | — |
| nt | `rent` | *(absent)* | **$2,109** — Northwest Territories, 2-bdrm purpose-built apartment, `a`. (2024: $2,021) | [CMHC HMIP — Northwest Territories](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=61&GeographyType=Province&RowField=TIMESERIES) | October 2025 | High |
| nt | `yoy` | *(absent)* | **UNVERIFIED** | — | — | — |
| **nu** (Nunavut) | `bench.house` | 520,000 | **UNVERIFIED** | — | — | — |
| nu | `bench.condo` | 430,000 | **UNVERIFIED** | — | — | — |
| nu | `bench.newbuild` | 640,000 | **UNVERIFIED** | — | — | — |
| nu | `rent` | *(absent)* | **UNVERIFIED** — CMHC HMIP returns "No data available" for Nunavut for every year. Nunavut is not covered by the Rental Market Survey | [CMHC HMIP — Nunavut](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/TableMatchingCriteria?CategoryLevel1=Primary+Rental+Market&CategoryLevel2=Average+Rent+($)&ColumnField=2&GeographyId=62&GeographyType=Province&RowField=TIMESERIES) | — | — |
| nu | `yoy` | *(absent)* | **UNVERIFIED** | — | — | — |

### Notes on the HMIP links

The CMHC HMIP URLs above are the live query endpoints and render the table directly; a browser may
require re-selecting "October 2025" from the Reference Period control. The `($)` in the query string
must be URL-encoded as `(%24)` when fetched programmatically.

---

## New-build prices (`bench.newbuild`)

**No verified value could be produced for any of the 14 records, and this is a source problem, not a
search problem.** What was checked:

- **Statistics Canada New Housing Price Index** (table 18-10-0205-01, latest reference month
  **June 2026**) — publishes **index values only**, no dollar levels, by design. It cannot yield a
  price. <https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810020501>
- **CREA MLS® HPI** — resale only. New construction is out of scope for every board.
- **BILD GTA / Altus Group** — does publish a genuine *benchmark price for new single-family homes
  and new condominium apartments*, monthly, but **only for the GTA**. The bildgta.ca newsroom index
  is fetchable; the individual release pages carrying the dollar figures were not retrievable in this
  session. This is the one city where a real new-build benchmark exists and is worth chasing.
- **CMHC Market Absorption Survey** — publishes *average price of absorbed new single-detached
  units* by CMA in HMIP. This is the most defensible national-coverage proxy. I could not locate the
  correct HMIP category path for it in this session; a human with the HMIP UI can navigate to it in
  a couple of clicks.

### Recommendation

Three defensible options, in descending order of honesty:

1. **Drop the field.** Model `newbuild` as a *tax and warranty treatment* (GST/HST applies, new-home
   warranty fees apply, no status certificate) rather than as a price. The user supplies the price of
   the specific new build they are looking at — which is what actually happens, since new-build
   pricing is developer-set and pre-construction, not market-indexed. This also removes a whole
   column of un-sourceable numbers from `src/domain/`.
2. **CMHC Market Absorption Survey average absorbed single-detached price**, per CMA, cited with its
   reference year. Real, primary, nationally consistent — but annual/quarterly and lags badly.
3. **`bench.house` × a documented premium**, with the premium itself sourced and disclosed in the UI.
   Only acceptable if the premium is derived from a citable comparison, not invented. The current
   placeholders imply premiums ranging from −8% (Toronto: 1,090,000 vs 1,180,000) to +23% (NT), which
   is not a coherent model of anything.

Whatever is chosen, the current placeholders should **not** ship as if they were data.

---

## Staleness

These three fields decay on three very different clocks:

| Field | Publication cadence | Practical half-life | Notes |
|---|---|---|---|
| `bench.*` | Monthly, ~5th–15th of the following month | **1 month** | In the current market, single-month moves of 0.5–1.5% are routine (Vancouver detached moved −1.1% in one month; TRREB detached −5.3% MoM in July 2026). A figure three months old is already visibly wrong. |
| `yoy` | Monthly | **1 month** | The most volatile of the three. Toronto's placeholder `+0.008` versus the verified `−0.0383` is a *sign flip* — the app would tell a user prices are rising in a market that is falling ~4%/yr. |
| `rent` | **Annually.** CMHC RMS reference month is October; publication is ~December. | **12 months** | Structurally stale by design: on 2026-08-17 the newest official number is 10 months old. The June 2026 mid-year update publishes indices only. Asking-rent trackers (Rentals.ca, Urbanation) are monthly but measure *asking* rent on vacant units, a different and systematically higher quantity — do not mix them with RMS averages. |

### Do these belong hardcoded in `src/domain/`?

**No — not in their current form.** Two problems compound:

1. **Different vintages, one struct.** The verified `bench`/`yoy` figures are July 2026; the verified
   `rent` figures are October 2025. Today they sit in the same object literal with no way to tell
   them apart. A user reading "$1,346 rent" next to "benchmark $650,000" has no idea one is ten
   months older than the other.
2. **A code deploy is the wrong unit of change for a monthly data refresh.** These values change on a
   publisher's schedule, not a release schedule. Hardcoding guarantees they are stale between
   deploys and silently wrong if nobody is watching.

Concretely, I'd recommend:

- **Carry an explicit as-of date per figure**, not per file — e.g. `bench: { house: { value, asOf: "2026-07", source: "TRREB Market Watch" }, ... }` — and **render it in the UI next to every
  derived number**, the way the existing unverified-placeholder disclosure already works. This is the
  minimum change that makes the staleness honest.
- **Separate the market data from the rules data.** `src/domain/jurisdictions/*.ts` currently mixes
  slow-moving statutory rules (land transfer tax brackets, rebate caps, professional fees) with
  fast-moving market observations (`bench`, `rent`, `yoy`). The first changes at budget time, once or
  twice a year, and belongs in source. The second changes monthly and does not. Splitting them lets
  the market half move to a JSON/data file that a scheduled job — or a human with a checklist — can
  refresh without touching TypeScript, and lets tests pin the rules without pinning prices.
- **Treat these as *defaults the user overrides*, not as truth.** For an affordability tool the
  benchmark price is a starting slider position. Framing it that way makes a one-month-stale default
  harmless, and makes the as-of date a courtesy rather than a liability.

---

## Unverifiable / needs a human

### The three territories — `yt`, `nt`, `nu`

**No MLS® Home Price Index exists for any territory.** There is no CREA member board publishing an
HPI for Yukon, NWT, or Nunavut; CREA's board list has no territorial entry. Resale volume is far
below the threshold at which a hedonic index is meaningful. So `bench.house` / `bench.condo` /
`bench.newbuild` / `yoy` for `yt`, `nt`, `nu` are **all six-of-six unverifiable from the preferred
source list**, and all twelve figures currently in those files are inventions.

What I tried and what blocked it:

- **Yukon Bureau of Statistics** (`yukon.ca`) — HTTP 403, Cloudflare interstitial ("Just a moment…")
  on automated fetch. YBS *does* publish a quarterly Yukon Housing Price Index and residential sales
  report with average single-detached prices for Whitehorse. **A human with a browser can get this in
  two minutes.** This is the single highest-value manual lookup on the list.
- **NWT Bureau of Statistics** (`statsnwt.ca`) — reachable, and its Housing section was enumerated:
  it carries only *Housing Conditions* and *Internet Usage* from the NWT Community Survey. **No house
  price series is published at all.** The realistic sources are the City of Yellowknife's property
  assessment roll or the NWT Association of REALTORS® — neither is a statistical publication and
  both need a human to judge.
- **Nunavut Bureau of Statistics** (`gov.nu.ca`) — HTTP 403, Cloudflare. Note that Nunavut's housing
  market is overwhelmingly public/social and employer-provided housing; a "benchmark price for a
  single-family home in Nunavut" may not be a coherent quantity at all. **Someone should decide
  whether `nu` should carry price data or should instead tell the user the tool cannot model this
  market.** That is a product decision, not a research gap.
- **CMHC rents:** NWT is available and verified ($2,109). Yukon is surveyed but **every cell is
  suppressed by CMHC** across all years. Nunavut is **not surveyed**. For Yukon, the Yukon Bureau of
  Statistics' own *Yukon Rent Survey* is the substitute and is the second manual lookup worth doing.

### Province-wide records where no city proxy was needed

Good news: **`nb`, `nl`, and `pe` did not require a city proxy.** All three have province-wide MLS®
HPI benchmarks published directly by their boards (NBREA, NLAR, PEIREA via CREA), so the province-wide
record maps 1:1 to a province-wide published figure. Where a city figure exists it is given above as
context only (St. John's for `nl`; Moncton/Saint John rents for `nb`).

The one structural gap: **PEI has no apartment benchmark.** CREA/PEIREA publish a single combined
"composite/single-family" series — there is no condo/apartment split, presumably because volume is
too low to index. `pe.bench.condo` therefore cannot be sourced from the preferred list at all. A
human should decide whether to (a) suppress the condo option for PEI in the UI, (b) use the PEIREA
average condo sale price if they publish one behind the members' portal, or (c) leave it as an
explicit user input.

### Other gaps needing a human

- **`saskatoon.bench.condo`** — no apartment benchmark published for Saskatoon. SRA's public release
  and CREA's board page give a residential composite only. `saskatchewanrealtors.ca` failed DNS
  resolution during this session; the CREA MLS® HPI tool (`hpi.crea.ca`) that *does* carry
  type-level sub-area data is **login-walled**. A REALTOR® login, or a direct request to SRA, closes
  this.
- **`halifax.bench.house` / `.condo`** — NSAR's type-level HPI is **Nova Scotia province-wide**, not
  Halifax. For Halifax-Dartmouth specifically only a composite benchmark ($557,300) and average sold
  prices are public. The type-level Halifax-Dartmouth benchmark exists inside the CREA HPI tool —
  again login-walled. Until then, either use the composite for both types (wrong but honest) or use
  the Halifax-Dartmouth averages and label them as averages.
- **`vancouver` July 2026 figures** — GVR's own site (`gvrealtors.ca`) returns 403 to automated
  fetch. The July numbers above are reproduced from GVR's release by a secondary site and cross-check
  cleanly against CREA's June 2026 primary page (detached $1,842,900 → $1,822,900 is a −1.1% monthly
  move, exactly as GVR describes). Confidence is high but the primary PDF should be pulled by hand
  before these ship.
- **Scope decisions nobody has made yet.** For `toronto`, City of Toronto ($1,455,200 detached) and
  all-TRREB-areas ($1,221,800) differ by 19%. For `montreal`, Montreal CMA ($650,000) and Island of
  Montreal ($817,500) differ by 26%. For `vancouver`, "Vancouver" in the placeholder appears to mean
  Metro Vancouver, not the City. **Each of these is a product decision about who the user is**, and it
  changes the answer more than a month of price drift does. It should be written down per record.

### Sources consulted

[CREA Statistics board pages](https://creastats.crea.ca/) ·
[TRREB Market Watch, July 2026](https://trreb.ca/wp-content/files/market-stats/market-watch/mw2607.pdf) ·
[CREB July 2026 media release](https://www.creb.com/News/Media_Releases/2026/August/July_2026_Stats/) ·
[APCIQ July 2026 statistics](https://apciqca-152af.kxcdn.com/wp-content/uploads/sites/4/2026/08/stats-202607-en.pdf) ·
[WinnipegREALTORS July 2026 release](https://www.winnipegregionalrealestatenews.com/market-statistics/market-releases/article/626/residential-detached-homes-and-condominiums-set-new-july-average-price-records) ·
[NSAR statistical report](https://www.nsrealtors.ca/common/Uploaded%20files/NSAR%20PDF%20document/Public%20Site/stats0626.pdf) ·
[CMHC 2025 Rental Market Report (Fall 2025)](https://eppd1strscr01.blob.core.windows.net/cmhcprdcontainer/sf/project/archive/housing_markets/rentalmarketreportcanadaandselectedmarkets/rental-market-report-2025-fall-en.pdf) ·
[CMHC HMIP Rental Market Survey tables](https://www03.cmhc-schl.gc.ca/hmip-pimh/en/TableMapChart/) ·
[CMHC 2026 Mid-Year Rental Market Update](https://www.cmhc-schl.gc.ca/observer/2026/2026-mid-year-rental-market-update) ·
[StatCan NHPI table 18-10-0205-01](https://www150.statcan.gc.ca/t1/tbl1/en/tv.action?pid=1810020501) ·
[GVR July 2026 statistics (secondary)](https://www.mikestewart.ca/july-2026-greater-vancouver-realtors-statistics/) ·
[WOWA Halifax](https://wowa.ca/halifax-housing-market)
