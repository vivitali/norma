# US / Florida / Tampa (Hillsborough County) figures — sourced dossier

Date compiled: 2026-10-25. Scope: Phase 1 of `.claude/skills/add-state/SKILL.md`'s "new state" path —
Florida is a NEW STATE (Texas via Houston and Austin, Washington via Seattle, ship today). Item
letters: A = Florida state-level facts, B = Tampa / Hillsborough County facts, D = the modelling
decisions this dossier hands to `src/domain/jurisdictions/tampa.ts` (each D item names the A/B items
it rests on and the grade the record may carry — never higher). Every figure is graded on the
`Provenance.conf` scale in `src/domain/types.ts`. **This file is research input; it is committed
before any `src/domain` code.**

**Florida's tax-year convention differs from both Texas's and Washington's.** Property is assessed as
of January 1; TRIM notices go out in August; each taxing authority adopts its FINAL millage at
September hearings; bills are mailed around November 1 of the SAME year. As of 2026-10-25 the
Hillsborough County Property Appraiser had not yet posted its 2026 final millage sheet, so the
record carries the **2025 FINAL** rates (the bills mailed November 2025), labelled as such (B1).

**Pending change — re-verify on 2026-11-04.** Amendment 3 (CS/HJR 1F) is on the 2026-11-03 ballot
(A8). If it passes (60% required), from 2027-01-01 the non-school homestead exemption rises to
$150,000, then $250,000 in 2028, and a buyer who is not a Florida resident on 2026-12-31 keeps the
current $50,000 non-school amount until their fifth year of exemption. The record models CURRENT law
(A6) and says so.

Research method: two parallel research passes (A, B) whose drafts are reproduced below with light
editing, plus B6, fetched while assembling. "Proxy" means `https://r.jina.ai/<url>` text extraction of
the SAME publisher URL, which counts as reading the publisher's own page.

## Summary — A (Florida state-level)

| # | Item | Value | Conf | As of |
|---|------|-------|------|-------|
| A1 | State personal income tax | None on natural persons; Art. VII §5(a) caps any such tax at the federal-credit amount, i.e. nothing net | high | Constitution (current text, fetched 2026-10-25) |
| A2 | Doc stamp tax on deeds | $0.70 per $100 of consideration (fraction of $100 rounds up) = 0.007 | high | §201.02(1)(a), 2026 Fla. Stat. |
| A3 | Doc stamp tax on mortgage-secured debt | $0.35 per $100 or fraction thereof of the debt = 0.0035; **$2,450 cap does NOT apply to the mortgage (§201.08(1)(b))**, only to unsecured notes ((1)(a)) and retail-charge notes ((2)(a)) | high | §201.08, 2026 Fla. Stat. |
| A4 | Nonrecurring intangible tax | 2 mills per dollar = 0.002 on the mortgage-secured note, one time | high | §199.133, 2026 Fla. Stat. |
| A5 | Who pays (Hillsborough) | Contract default: seller = deed stamps; buyer = note/mortgage stamps + intangible tax + lender's policy + recording of deed/mortgage; owner's policy = seller in Hillsborough by custom (checkbox 9(c)(i)) | high (form allocation) / medium (Hillsborough custom) | FR/BAR AS IS Rev.7 (7/24); custom article 2026-04-05 |
| A6 | Homestead exemption | $25,000 (all levies) + additional band $50,000–$75,000 AV, non-school only, CPI-indexed: **$26,411 for 2026**, $25,722 for 2025; apply by Mar 1; owner on Jan 1 | high | DOR table rev. Jan 2026 |
| A7 | Save Our Homes cap | min(3%, CPI) per year; reset to just value Jan 1 after change of ownership; non-homestead 10% cap §193.1555 | high | §193.155, §193.1555, 2026 Fla. Stat. |
| A8 | Nov 3, 2026 ballot | **Amendment 3 (HJR 1F)**: non-school homestead exemption to $150,000 (2027) / $250,000 (2028); non-homestead cap 10% to 5%; 5-year wait for new residents; needs 60%. Amend. 1 (budget stabilization) and 2 (ag TPP) are not homestead | high (text, DOS entry) / medium (litigation status) | DOS database, ballot cert. 2026-06-16; AG rewrite 2026-08-13 |
| A9 | Title insurance (promulgated) | Owner's: $5.75/$1,000 to $100k, +$5.00/$1,000 to $1M. **$400k = $2,075; $450k = $2,325.** Simultaneous lender's policy = $25 (loan ≤ owner's amount). Form 9 = 10% of premium. Settlement fee NOT promulgated | high (rate) / assumption (settlement fee) | 69O-186.003 (eff. 2002-01-27; text re-posted 2023-04-27) |
| A10 | Homeowners insurance | OIR statewide admitted-market avg HO: $3,757 incl. wind / $2,586 excl. wind (Apr 2026); page headline tiles say $3,736 / $2,124 (Sep 2026). Citizens HO-3 Hillsborough avg $2,918 (4/30/2025). No county figure from OIR located. Flood excluded | medium | OIR page Sep 2026; Citizens exhibit 2025-12-10 |
| A11 | Recording fees | $5.00 first page + $4.00 each add'l page, +$1.00/$0.50 PRMTF, +$4.00 per page technology surcharge (§28.24(13)(a),(b),(d),(e)) | high | §28.24, 2026 Fla. Stat. |

## A. Florida state-level

### A1. State personal income tax

- Value: none. Constitution Art. VII §5(a), quoted: "No tax upon estates or inheritances or upon the income of natural persons who are residents or citizens of the state shall be levied by the state, or under its authority, in excess of the aggregate of amounts which may be allowed to be credited upon or deducted from any similar tax levied by the United States or any state." (§5(b) lets a corporate income tax run up to 5%.) Effect: any state tax on residents' personal income is limited to the federal credit amount; Florida levies none.
- Publisher: Florida Legislature (Online Sunshine).
- Document: Florida Constitution, Article VII, Section 5, "Estate, inheritance and income taxes."
- URL: http://www.leg.state.fl.us/statutes/index.cfm?Mode=Constitution&Submenu=3&Tab=statutes (Art. VII §5)
- asOf: current text; history line "Am. H.J.R. 7-B, 1971; adopted 1971."
- conf: high
- Access: `curl -A "<desktop Chrome UA>" -e http://www.leg.state.fl.us/`, plain 200 HTML; text extracted.
- Caveat: the Constitution forbids rather than "states there is none"; absence of a levy is shown by the Art. VII text plus the absence of any income-tax chapter. Not separately confirmed on floridarevenue.com.

### A2. Documentary stamp tax on deeds

- Value: $0.70 per $100 of consideration = 0.007. Quote, §201.02(1)(a): "On deeds, instruments, or writings whereby any lands, tenements, or other real property, or any interest therein, shall be granted, assigned, transferred, or otherwise conveyed to, or vested in, the purchaser or any other person by his or her direction, on each $100 of the consideration therefor the tax shall be 70 cents. When the full amount of the consideration ... is not shown in the face of such deed ... the tax shall be at the rate of 70 cents for each $100 or fractional part thereof of the consideration therefor. For purposes of this section, consideration includes ... the money paid or agreed to be paid; the discharge of an obligation; and the amount of any mortgage, purchase money mortgage lien, or other encumbrance, whether or not the underlying indebtedness is assumed."
- Rounding: "fractional part thereof" appears in the second sentence (undisclosed-consideration case); the first sentence says "on each $100". Treat as round-up per $100 (DOR practice) — statutory text for the stated-consideration case is not itself explicit; flag for a follow-up read of F.A.C. 12B-4 / DOR form DR-219.
- Miami-Dade exception: NOT present in the 2026 text. §201.02(1)(b) in 2026 is the "conduit entity" paragraph (beneficial-interest transfers within 3 years, same 70 cents). The older 60-cent Miami-Dade single-family rate no longer appears in this section. Related: §201.031 permits a county discretionary surtax on deeds but "there shall be no surtax on any document pursuant to which the interest ... involves only a single-family residence" (condo unit or detached dwelling). Hillsborough is not relevant to either.
- Publisher: Florida Legislature. Document: Fla. Stat. §201.02, "Tax on deeds and other instruments relating to real property or interests in real property."
- URL: http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0200-0299/0201/Sections/0201.02.html (and .../0201.031.html)
- asOf: 2026 Florida Statutes (page header date 2026-10-25).
- conf: high
- Access: curl with Chrome UA + legislature referer.
- Caveat: who pays is a contract allocation, not statutory (see A5).

### A3. Documentary stamp tax on notes / mortgages

- Value: $0.35 per $100 or fraction thereof of the indebtedness = 0.0035.
- Quote, §201.08(1)(b): "On mortgages, trust deeds, security agreements, or other evidences of indebtedness filed or recorded in this state, and for each renewal of the same, the tax shall be 35 cents on each $100 or fraction thereof of the indebtedness or obligation evidenced thereby. ... When there is both a mortgage, trust deed, or security agreement and a note, certificate of indebtedness, or obligation, the tax shall be paid on the mortgage, trust deed, or security agreement at the time of recordation. A notation shall be made on the note ... that the tax has been paid on the mortgage ..."
- Quote, §201.08(1)(a) (the capped paragraph): "On promissory notes, nonnegotiable notes, written obligations to pay money, or assignments of salaries, wages, or other compensation made, executed, delivered, sold, transferred, or assigned in the state, and for each renewal of the same, the tax shall be 35 cents on each $100 or fraction thereof of the indebtedness or obligation evidenced thereby. The tax on any document described in this paragraph may not exceed $2,450."
- Cap answer: the $2,450 cap is written only into paragraph (1)(a) (stand-alone notes made in the state) and (2)(a) (retail-charge-account notes). Paragraph (1)(b) (mortgages recorded in Florida) contains no cap. Because the tax is paid on the mortgage when a mortgage secures the note, a recorded residential mortgage is taxed uncapped. (Interpretive note: the cap and the "pay on the mortgage" rule come from the structure of the statute; no DOR guidance was read to confirm. Model: 0.0035 x loan, rounded up to next $100, no cap.)
- Publisher: Florida Legislature. Document: Fla. Stat. §201.08. URL: http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0200-0299/0201/Sections/0201.08.html
- asOf: 2026 Florida Statutes.
- conf: high (text); the "no cap on a recorded mortgage" reading is a statutory-structure inference, high on text, medium on DOR practice.
- Access: curl with Chrome UA.

### A4. Nonrecurring intangible tax on mortgages

- Value: 2 mills per dollar = 0.002 of the secured amount, one time. Quote, §199.133(1): "A one-time nonrecurring tax of 2 mills is hereby imposed on each dollar of the just valuation of all notes, bonds, and other obligations for payment of money which are secured by mortgage, deed of trust, or other lien upon real property situated in this state." Base per (2): applies "only to the extent it is secured by mortgage, deed of trust, or other lien upon real property situated in this state"; "In no event shall the portion ... subject to the nonrecurring tax exceed in value the value of the real property situated in this state which is the security." Constitutional ceiling: Art. VII §2, "not more than two mills on the dollar."
- Rounding: statute says per dollar; no "fraction of $100" language. Model as 0.002 x loan amount.
- Publisher: Florida Legislature. Document: Fla. Stat. §199.133 "Levy of nonrecurring tax." URL: http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0199/Sections/0199.133.html
- asOf: 2026 Florida Statutes; history s. 10, ch. 85-342, amended ch. 2006-312.
- conf: high
- Access: curl with Chrome UA.

### A5. Who pays in a Hillsborough County (Tampa) purchase

Contract form read: Florida Realtors/Florida Bar "AS IS" Residential Contract for Sale and Purchase, FloridaRealtors/FloridaBar-ASIS-7, Rev. 7/24 (per the Alta Star form-set listing, in effect 2025-01-01).

- Value (quoted, Para. 9, REDLINE of ASIS-6 to ASIS-7 — strike-through text is interleaved in the extraction, wording below is the live text):
  - 9(a) COSTS TO BE PAID BY SELLER: "Documentary stamp taxes and surtax on deed, if any"; "Owner's Policy and Charges (if Paragraph 9(c)(i) is checked)"; "Title search charges (if Paragraph 9(c)(iii) is checked)"; "Municipal lien search (if Paragraph 9(c)(i) or (iii) is checked)"; "Recording and other fees needed to cure title"; "HOA/Condominium Association estoppel fees"; "Seller's attorneys' fees"; "Seller's Closing Services".
  - 9(b) COSTS TO BE PAID BY BUYER: "Taxes and recording fees on notes and mortgages"; "Recording fees for deed and financing statements"; "Owner's Policy and Charges (if Paragraph 9(c)(ii) is checked)"; "Survey (and elevation certification, if required)"; "Lender's title policy and endorsements"; "Loan expenses"; "Appraisal fees"; "Buyer's Inspections"; "HOA/Condominium Association application/transfer fees"; "Buyer's Closing Services".
  - 9(c) (CHECK ONE): "(i) Seller shall designate Closing Agent and pay for Owner's Policy and Charges, and Buyer shall pay the premiums for any lender's title policy, endorsements; and charges for closing services related to the lender's policy and loan closing"; "(ii) Buyer shall designate Closing Agent and pay for Owner's Policy and Charges and premiums for any lender's title policy, endorsements; and closing services related to ... loan closing"; "(iii) [MIAMI-DADE/BROWARD REGIONAL PROVISION]: Buyer shall designate Closing Agent and pay for premiums for owner's title policy, any lender's title policy and endorsements, and any post-Closing continuation. Seller shall pay actual costs for: (A) a title search or continuation ... not to exceed $____ (if left blank, then $200.00); (B) tax search; and (C) municipal lien search." Also: "'Closing Services' shall have the meaning ascribed ... in Section 627.7711(1)(a), F.S.; each party shall bear their own Closing Services fees."
  - Mapping: deed stamps (A2) = SELLER; note/mortgage stamps (A3) = BUYER ("Taxes ... on notes and mortgages"); intangible tax (A4) = BUYER (a tax on the mortgage, same line); owner's policy = per 9(c) box; lender's policy = BUYER; settlement/closing services = each party its own; deed + mortgage recording = BUYER (deed recording is listed under buyer, "Recording fees for deed").
- Publisher: Florida Realtors (with The Florida Bar). Document: "AS IS" Residential Contract for Sale and Purchase (FloridaRealtors-FloridaBar-ASIS-7), Redline. URL: https://www.floridarealtors.org/sites/default/files/2024-12/AS%20IS%20Residential%20Contract%20for%20Sale%20and%20Purchase%20(FloridaRealtors-FloridaBar-ASIS-7)%20Redline%20(1).pdf
- asOf: footer "Rev.7/24"; effective 2025-01-01 (Alta Star listing, secondary).
- conf: high for the form's default allocation (read in the publisher's own PDF); the parties may change any of it by negotiation, and the form is not law.
- Access: direct curl with Chrome UA + floridarealtors.org referer returned the PDF; `pdftotext -layout`.
- Caveat: (1) this is the 12/2024 redline, not the clean form; a later revision ("ASIS-7x", Feb 2026 FinCEN paragraph change per Alta Star) exists at https://www.floridarealtors.org/media/5857, which returns only the site shell via proxy and a Cloudflare page via curl — NOT read. Re-verify Para. 9 in the current clean form. (2) The 12/2024 text also says "The title insurance premium charges for the owner's policy and any lender's policy will be calculated and allocated in accordance with Florida law, but may be reported differently on certain federally mandated closing disclosures."
- Hillsborough custom (owner's policy): seller pays, seller picks the title agent (9(c)(i)). Source: Barnes Walker (Florida law firm), "Who Pays for Title Insurance in Florida? Buyer, Seller, or Negotiable?", published 2026-04-05, county table row "Hillsborough (Tampa) | Seller pays | Seller chooses"; same table lists Sarasota, Miami-Dade, Broward as buyer-pays (and Manatee, Pinellas, Lee, Charlotte seller-pays). URL: https://barneswalker.com/who-pays-for-title-insurance-in-florida/ . conf: medium (secondary, law-firm marketing article, custom not law; the article's own text elsewhere is inconsistent on Sarasota). Access: proxy. Sources also state Florida statutes do not dictate who pays.

### A6. Homestead exemption (amounts, deadline, Jan-1 rule)

- Constitution Art. VII §6(a)(1), quoted: "Every person who has the legal or equitable title to real estate and maintains thereon the permanent residence of the owner, or another legally or naturally dependent upon the owner, shall be exempt from taxation thereon, except assessments for special benefits, as follows: a. Up to the assessed valuation of twenty-five thousand dollars; and b. For all levies other than school district levies, on the assessed valuation greater than fifty thousand dollars and up to seventy-five thousand dollars, upon establishment of right thereto in the manner prescribed by law." §6(a)(2): "The twenty-five thousand dollar amount ... provided in subparagraph (a)(1)b. shall be adjusted annually on January 1 of each year for inflation using the percent change in the Consumer Price Index for All Urban Consumers ... if such percent change is positive."
- §196.031(1)(a): "A person who, on January 1, has the legal title or beneficial title in equity to real property in this state and who in good faith makes the property his or her permanent residence ... is entitled to an exemption ... up to the assessed valuation of $25,000". §196.031(1)(b): "...an additional exemption of up to $25,000 on the assessed valuation greater than $50,000 for all levies other than school district levies. The $25,000 value ... shall be adjusted annually on January 1 of each year for inflation using the percentage change in the Consumer Price Index ..."
- DOR-published adjusted amount of the additional (non-school) exemption — Florida DOR, "Additional Homestead Exemption Adjustment, Revised January 2026": **2026: CPI +2.7%, $26,411; 2025: CPI +2.9%, $25,722; 2024: base year $25,000.** Statement: "The adjustment begins with the 2025 tax year assessment." So total exemption: 2026 up to $51,411 on non-school levies (applied to AV over $50,000: the band is $50,000 to $76,411); school levies $25,000. URL: https://www.floridarevenue.com/property/Documents/cpi_homestead_exemption.pdf . asOf 2026-01 (published 2026-01-14). conf: high. Access: proxy.
- DOR guide PT-113 (R. 08/25): "The first $25,000 applies to all property taxes, including school district taxes. The additional exemption of up to $25,000 applies to the assessed value over $50,000 and only to non-school taxes." Application: "To apply ... you must complete and submit Form DR-501 to your county property appraiser by March 1 of the tax year." Also §196.011(1)(a): "on or before March 1 of each year, file an application for exemption with the county property appraiser ... Failure to make application ... on or before March 1 ... shall constitute a waiver of the exemption privilege for that year." URL: https://floridarevenue.com/property/Documents/pt113.pdf ; http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0196/Sections/0196.011.html . conf: high. Access: proxy / curl.
- Jan-1 rule, DOR PT-107 (First-Time Florida Homebuyers, R. 08/24): "When the property changes ownership, Florida law requires the property appraiser to remove exemptions and reassess the property so the assessed value equals the just value. This takes effect on January 1 after you purchase the property. The previous owner's exemption and SOH benefit stay with the property for the remainder of the tax (calendar) year in which you purchase your home ... If you owned property on January 1 and apply for the homestead exemption by March 1, your tax bill for the year will reflect the reduction in taxable value, but the SOH benefit will not take effect until the following year." Modelling consequence: a buyer closing after Jan 1 cannot claim homestead until the next Jan 1; the first-year bill is the prior owner's; the buyer should expect a reassessment to just value. URL: https://floridarevenue.com/property/Documents/pt107.pdf . conf: high. Access: proxy.
- asOf: as dated above. conf: high.
- Caveat: Amendment 3 (A8) would restructure all of this from 2027; the 2026 amounts above remain law until then. DOR's PT-113 sample table (CPI examples) is illustrative; use the cpi_homestead_exemption.pdf table for actual amounts. 2027 indexed amount will not exist until DOR publishes (CPI-based, January 2027).

### A7. Save Our Homes cap (and §193.1555)

- §193.155(1), quoted: "Beginning in 1995, or the year following the year the property receives homestead exemption, whichever is later, the property shall be reassessed annually on January 1. Any change resulting from such reassessment shall not exceed the lower of the following: (a) Three percent of the assessed value of the property for the prior year; or (b) The percentage change in the Consumer Price Index for All Urban Consumers, U.S. City Average, all items 1967=100 ... for the preceding calendar year ..."; (2): assessed value is lowered if it exceeds just value; (3)(a): "property assessed under this section shall be assessed at just value as of January 1 of the year following a change of ownership." Also the lead-in: "Property receiving the homestead exemption after January 1, 1994, shall be assessed at just value as of January 1 of the year in which the property receives the exemption" (new-buyer first year at just value).
- §193.1555 (context): "For all levies other than school district levies, nonresidential real property and residential real property that is not assessed under s. 193.155 or s. 193.1554 shall be assessed at just value as of January 1 of the year that the property becomes eligible ..."; (3): "Any change resulting from such reassessment may not exceed 10 percent of the assessed value of the property for the prior year"; (5): reset to just value after a qualifying improvement or change of ownership or control. Not applicable to school levies.
- Publisher: Florida Legislature. URLs: http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0193/Sections/0193.155.html ; .../0193.1555.html
- asOf: 2026 Florida Statutes. conf: high. Access: curl with Chrome UA.
- Caveat: Amendment 3 (A8) would lower the 10% to 5% for non-homestead from 2027 and leaves the 3%/CPI homestead cap in place (per the enrolled resolution text).

### A8. November 3, 2026 ballot — constitutional amendments touching property tax

Source checked: Florida Division of Elections Initiatives/Amendments/Revisions Database list (https://dos.elections.myflorida.com/initiatives/initiativelist.asp, via proxy) and each detail page (https://constitutionalinitiatives.dos.fl.gov/Home/InitDetail?account=10&seqnum=108 / 109 / 110, via proxy). The list shows three "2026 GEN" entries; the rest of the 24 listed are "2028 GEN". Page 2 of the list was not retrievable, but the table sorts 2026 entries first. Vote threshold, per the DOS page https://dos.fl.gov/elections/laws-rules/constitutional-amendments/ (web page last updated March 20, 2026): "A proposed amendment requires at least 60% approval from voters to pass [Art. XI]."

1. Ballot No. 1, Budget Stabilization Fund (HJR 5019): fund cap 10% to 25% of general revenue; no property-tax effect. Not relevant.
2. Ballot No. 2, Exemption of Tangible Personal Property on Agricultural Land (HJR 1215): exempts TPP on agricultural land from ad valorem tax, first applies tax years beginning 2027-01-01. Tangible personal property only; no homestead effect.
3. **Ballot No. 3, "INCREASED HOMESTEAD EXEMPTION; LOWER CAP ON INCREASES IN NON-HOMESTEAD PROPERTY ASSESSMENTS" (CS/HJR 1F, 2026 special session F; made ballot 2026-06-16; Art. VII §§4, 6, 9 and Art. XII).** DOS database summary (this is the attorney general's REWRITTEN title and summary, after the 2026-08-03 circuit-court ruling; the DOS entry links "AG Letter (Title & Summary rewritten)", dated 2026-08-14 in the PDF header):
   > "This amendment increases the homestead exemption, for all non-school taxes, to $150,000 in 2027 and $250,000 in 2028, and adjusts for inflation thereafter. It requires the Legislature to prescribe a uniform procedure for counties and municipalities, for their respective levies, to increase the homestead exemption up to full assessed value, and allows special districts, subject to referendum approval, to do the same. Persons who are not Florida residents on December 31, 2026, will receive the existing homestead exemption upon qualifying for a homestead exemption, with the increased homestead exemption beginning with the fifth year of exemption, to the extent permitted by the U.S. Constitution. This amendment reduces the annual cap on assessment increases for non-homestead properties from 10% to 5%. This amendment requires counties and municipalities to use property taxes solely for public safety, education and schools, infrastructure, natural resources, bond debt service, retirement benefits for employees, and operations and administration. Other expenditures may be approved by county officers or county or municipal governing bodies unless prohibited by general law, notwithstanding Article VII, Section 9(a) of the Florida Constitution, which allows counties and municipalities to levy property taxes for their respective purposes. This amendment takes effect January 1, 2027."
   Original legislative ballot title (now struck by the court): "SAVE OUR HOMES FROM EXCESSIVE PROPERTY TAXES" with taglines "Exempts the first $250,000 of a homestead's value from taxation for all levies other than school district levies and requires, through general law, a schedule for full elimination." and "Requires any person who establishes Florida residency after January 1, 2027, to maintain Florida residency for five years prior to receiving the increased homestead exemption." (from enrolled text, below).
   Operative text, read from the enrolled resolution (https://initiativepetitions.dos.fl.gov/InitiativeForms/FulltextPDF/10-110.pdf via proxy; "ENROLLED CS/HJR 1F 2026F", published 2026-06-08): Art. VII §6(a)(1)a: "1.a. For school district levies, up to the assessed valuation of twenty-five thousand dollars; and 2.b. For all levies other than school district levies, I. Beginning on January 1, 2027, up to the assessed valuation of one hundred and fifty thousand dollars. II. Beginning on January 1, 2028, up to the assessed valuation of two hundred and fifty thousand dollars." New-resident clause: persons not maintaining a Florida permanent residence "as of December 31, 2026" get $25,000 (school) and "up to the assessed valuation of fifty thousand dollars" (non-school); "beginning with the fifth year of exemption ... such person shall be exempt up to the amount ... provided by sub-sub-subparagraph a.2.II., as adjusted." Indexing: the $250,000 amount is inflation-adjusted "beginning on January 1, 2029"; the $50,000 new-resident figure "beginning on January 1, 2028". Local option to exempt up to all remaining assessed value (§6(a)(4)); non-homestead (≤9 units and other non-homestead, non-school levies): 10% "Before January 1, 2027", "five percent (5%)" "Beginning January 1, 2027". Homestead SOH 3%/CPI cap text in §4(d) is unchanged. §9(a)(2) restricts county/municipal ad valorem use to the listed purposes. Art. XII schedule: takes effect January 1, 2027.
   - Vote: 60% (Art. XI §5). Effective date if passed: 2027-01-01 (tax-year 2027 assessments; first bills Nov 2027).
   - Litigation status (secondary, news): three consolidated suits; Leon County Circuit Judge David Frank granted summary judgment 2026-08-03 against the original title/summary, ordered a rewrite within 10 days; AG Uthmeier released the rewrite 2026-08-13 (sources: WLRN 2026-08-14 https://www.wlrn.org/government-politics/2026-08-14/florida-ag-revises-property-tax-amendment-language-after-judges-ruling ; Fox35 / WPTV). I found no report of an appeal result or of final certification of the rewritten wording on the ballot. The measure itself remains on the ballot. conf of that status: medium.
- Publisher: Florida Division of Elections (DOS) and the Legislature's enrolled resolution as hosted by DOS.
- asOf: made ballot 2026-06-16; rewritten summary 2026-08-13/14; DOS page text fetched 2026-10-25.
- conf: high (DOS entry text and enrolled resolution read at publisher URLs); medium (litigation status).
- Access: proxy for DOS pages (direct curl hits a Cloudflare "Just a moment" challenge); the PDF 10-110_AG.pdf is a scanned image and its text was NOT extracted — the summary quoted above is the DOS database's text, which matches the news descriptions of the rewrite.
- Caveat: the enrolled text contains tracked-change artifacts (strike-throughs flattened); the quoted operative lines are the new language. Calculator effect if it passes: the 2027 non-school exemption jumps from about $51,400 to $150,000 on assessed value, to $250,000 in 2028; a buyer who is not a Florida resident on 2026-12-31 gets the old $50,000 until their fifth year of exemption. Counties/cities may additionally exempt up to full value (not automatic). School levies stay at $25,000. Re-verify on 2026-11-04 after the election.

### A9. Title insurance (promulgated rates)

- Value, Fla. Admin. Code R. 69O-186.003(1)(a) "owner's and leasehold" schedule (quoted, per $1,000 of liability): "From $0 to $100,000 of liability written $5.75"; "From $100,000 to $1 million, add $5.00"; "Over $1 million to and up to $5 million, add $2.50"; "Over $5 million and up to $10 million, add $2.25"; "Over $10 million, add $2.00" (plus minimum insurer retention 30–40%). "The minimum premium for all conveyances except multiple conveyances shall be $100." Preamble: "To compute any insurance premium on a fractional thousand of insurance (except as to minimum premiums), multiply such fractional thousand by the rate per thousand applicable, considering any fraction of $100.00 as a full $100.00." "In all cases the owner's policy shall be issued for the full insurable value of the premises." Mortgage (lender's) policy standalone uses the identical schedule, (1)(b).
- Arithmetic (original, non-reissue rates; rate is per $1,000, so $100,000 = 100 units):
  - $400,000 owner's: first $100,000 = 100 x $5.75 = $575.00; next $300,000 = 300 x $5.00 = $1,500.00; total **$2,075.00**.
  - $450,000 owner's: $575.00 + 350 x $5.00 = $1,750.00; total **$2,325.00**.
- Simultaneous issue, 69O-186.003(5)(a), quoted: "When an owner's and a mortgagee's policy or policies covering identical land are to be issued simultaneously the risk premiums applicable for the owner's policy shall be the regular owner's rate as provided for herein. The rate for the mortgage policy or policies so simultaneously issued will be a minimum $25.00 for an amount of insurance not in excess of the owner's policy. The risk premium on the amount of the mortgage policy or policies in excess of the owner's policy shall be figured at the regular original title insurance rates for mortgage policies." So with a loan at or below the policy amount, the lender's policy = **$25**. Example: a $450,000 purchase with a $360,000 loan: owner's $2,325 + lender's $25 = $2,350. Caveat on 69O-186.005: that rule is the endorsement-premium rule, NOT simultaneous issue. Both subsections (b): title must be examined through recording of both deed and mortgage, policies bear identical dates, owner's policy shows the mortgage as a Schedule B exception.
- Endorsements, 69O-186.005 (quoted): "(6)(a) ... the minimum premium shall be $25.00 for each endorsement on any mortgage or owner's policy issued" for ALTA 4/4.1 Condominium, ALTA 5/5.1 Planned Unit Development, ALTA 6/6.1/6.2, ALTA 7.0 Manufactured Housing, ALTA 8.0/8.1 Environmental Protection Lien and Revolving Credit. Subsection (9): "1-4 Family Unit Residential Risks: $25 minimum per endorsement, $100 maximum per endorsement ... except that the risk rate premium for the following approved endorsements shall be at minimum the percentage of the total policy premium as indicated; however, on a simultaneously issued mortgage policy, the endorsement charge shall be based on the underlying owner, and loan policy premium: (a) Florida Endorsement Form 9-10%. (b) Navigational Servitude - 10%." Subsection (5): Truth-in-Lending (ALTA 2) endorsement "TEN PERCENT (10%) OF MORTGAGEE POLICY PROMULGATED RATE WITH A MINIMUM CHARGE OF TWENTY-FIVE DOLLARS ($25.00) AND A MAXIMUM CHARGE OF ONE HUNDRED DOLLARS ($100.00)" (ALTA 2 is an old form; modern lenders rarely use it).
  - Illustration, Form 9 on a $400,000 simultaneous issue: base = owner's $2,075 + loan $25 = $2,100; 10% = $210. On $450,000: ($2,325 + $25) x 10% = $235. Ambiguity: "at minimum the percentage" vs the "$100 maximum per endorsement" in the same subsection — it is unclear whether the $100 ceiling also bounds Form 9; readers should treat Form 9 as roughly $100 to 10% of the premium. A residential lender's policy with Form 9 + ALTA 5.1/4.1 + 8.1 therefore adds roughly $100–$210 + $25 each (rule minimums). Which endorsements a given lender requires was not found in any regulator document.
- Reissue and other: reissue premium (policy within 3 years) $3.30/$1,000 to $100k, +$3.00 to $1M ((2)); new-home purchase discount for first sale of 1–4 family residential ((3)); not modelled above.
- Settlement/closing-services fee: NOT promulgated. Rule (11)(a): "At least actual cost must be charged for related title services in addition to the adopted risk premium"; (11)(b): charges for "title search, examination, and closing" are shown separately on the closing statement; only the risk premium is promulgated. No regulator publishes a typical range. A web search for Tampa-area figures returned only lender/realtor blog content: a $300–$800 "finalization" fee, and another table with $350–$1,200 and a $700 average. Grade: assumption (with note: rests on non-authoritative blogs; no schedule located). A default of roughly $500–$800 for the buyer's own closing-services fee is defensible as an assumption; flag it as unverified. conf: assumption.
- Publisher: Florida Office of Insurance Regulation (Financial Services Commission), Fla. Admin. Code ch. 69O-186. Documents: "69O-186.003 Title Insurance Rates"; "69O-186.005 Premium Schedule Applicable to 'Truth in Lending' and Other Endorsements".
- URLs: https://www.flrules.org/gateway/ruleNo.asp?id=69O-186.003 and https://www.flrules.org/gateway/ruleNo.asp?id=69O-186.005 (rule-file Word documents: `readFile.asp?sid=0&tid=2803511&type=1&file=69O-186.003.doc`, `tid=2803705 ... 69O-186.005.doc`).
- asOf: rule effective 2002-01-27 (subsections (1)–(4) effective 2002-07-01 per subsection (12)); 69O-186.005 last amended 2005-11-03. The flrules.org page is the "latest version of the final adopted rule" as of 2026-10-25 and the .doc was posted 2023-04-27 on flrules.
- conf: high (rule text read at flrules.org; computed arithmetic transparent). Caveat: promulgated rates can change by OIR rulemaking; flrules lists 2008-09 rate-change attempts as withdrawn/invalid; I found no later amended schedule. The "Florida DFS/OIR rate" is the same for every underwriter; agents retain a share (30%) of the premium, not a discount.
- Access: proxy for the rule pages; direct curl with Chrome UA + flrules referer for the `.doc`; converted with macOS `textutil`.

### A10. Homeowners insurance

- OIR statewide (publisher: Florida Office of Insurance Regulation, "Florida Property Insurance Market" / Market Overview, https://floir.gov/property-casualty/market-overview, via proxy, read 2026-10-25). Two sets appear on the same page:
  - Headline tiles (page note "Data as of September 2026"): "$3,736 Admitted Market Avg. Homeowner's Premium (Including Wind)"; "$2,124 Admitted Market Avg. Homeowner's Premium (Excluding Wind)".
  - "Average Homeowners' Policy Premium Data" panel (image, read visually, "as of April 2026"): homeowners admitted market including wind $3,757; excluding wind $2,586; condo unit owners including wind $1,800, excluding wind $1,453; surplus-lines homeowners $7,181; surplus-lines condo $4,541 ("OIR does not regulate rates for surplus line carriers"). Method (OIR text): "The average premium by OIR is calculated by dividing direct written premium by policies in force."
  - The two sets disagree on the excluding-wind figure ($2,124 vs $2,586), so cite as a range and name both dates. The page also says OIR "tracks the average homeowners' policy premium by county" but the county table is not published in text; the Market Intelligence Report (QUASRng reports, https://apps.fldfs.com/QSRNG/Reports/ReportCriteriaWizard.aspx) was not queried (interactive app). No Hillsborough OIR average found.
  - Policy type: not stated by OIR (a blend of homeowners forms, excluding condo/renters). Flood: not stated; homeowners multi-peril (HO-3) forms exclude flood, and NFIP/private flood is a separate policy (general knowledge, not read on an OIR page), so these averages EXCLUDE flood. "Including wind" means the policy covers windstorm/hurricane; many Florida admitted policies exclude wind and pair with Citizens wind-only.
  - conf: medium (direct publisher page, but two internally inconsistent figure sets, policy form unspecified, statewide not Hillsborough).
- Citizens Property Insurance Corporation (publisher: Citizens; document: "Recommended Rate Filing Executive Summary", Actuarial & Underwriting Committee / Board of Governors, 2025-12-10; URL: https://www.citizensfla.com/documents/20702/39142684/20251210+03Ba+2026+Recommended+Rate+Filing-+combined.pdf/d22e03e1-d36e-3574-cbf5-278d80043b2f?t=1765369714748 , via proxy):
  - Exhibit 4 "MULTIPERIL HO3", in-force policies as of 04/30/2025, **Hillsborough: 22,882 policies; current average premium $2,918; recommended change +0.7%; recommended average $2,939.** Statewide HO-3 current average $3,506 (337,025 policies; -4.8% to $3,339 recommended).
  - Exhibit 3 "ALL PERSONAL LINES COMBINED": Hillsborough 36,253 policies, current average $2,539 (0.0%); statewide $2,943 (-2.6% to $2,867).
  - Exhibit 6 "MULTIPERIL HO6" Hillsborough: 242 policies, $1,015; Exhibit 5 "WIND-ONLY HW2": Hillsborough 0 policies.
  - Citizens' board-recommended average personal-lines change was -2.6%; OIR-approved final multiperil rates (March 2026, effective for new/renewal business on or after 2026-07-01) were reported at -8.8% statewide on average in Citizens' news release (https://www.citizensfla.com/-/20260304-citizens-2026-multiperil-rates-to-drop-statewide) — I read only a search snippet of that, so the 2026-07-01 Hillsborough HO-3 average after the final decrease is NOT confirmed. A secondary blog (movewithmomentum.com) gives ~$2,425 approved 2026 all-lines average for Hillsborough (=$2,539 less 4.5%) — medium/low, not used.
  - Includes wind; excludes flood (Citizens does not write flood). Citizens is the insurer of last resort and priced above or near market in some counties; it is not a market average.
  - conf: high for the exhibit numbers as published; medium as a calculator input (Citizens-only, April 2025, pre-final-rate, not a market average). asOf: in-force 2025-04-30; filed 2025-12-10.
- Suggested use: statewide market average is not a Tampa figure; a Hillsborough private-market average was not located at any publisher. Treat any Tampa homeowners default as `assumption` or `medium` and disclose that it excludes flood and varies strongly by home age, roof, and coastal zone.

### A11. Recording fees

- Quote, §28.24(13) (instrument not more than 14 x 8 1/2 inches): "For recording, indexing, and filing any instrument not more than 14 inches by 8 1/2 inches, including required notice to property appraiser where applicable: (a) First page or fraction thereof: 5.00. (b) Each additional page or fraction thereof: 4.00. (c) For indexing instruments recorded in the official records which contain more than four names, per additional name: 1.00. (d) An additional service charge must be paid to the clerk of the circuit court to be deposited in the Public Records Modernization Trust Fund for each instrument listed in s. 28.222, except judgments received from the courts and notices of lis pendens, recorded in the official records: 1. First page: 1.00. 2. Each additional page: 0.50. ... (e) An additional service charge of $4 per page shall be paid to the clerk of the circuit court for each instrument listed in s. 28.222, except judgments received from the courts and notices of lis pendens, recorded in the official records." Plats/condo exhibits larger than 14 x 8 1/2 inches: $30.00 first page, $15.00 each additional ((12)). Preamble: charges "may not exceed those specified in this section, except as provided in s. 28.345."
- Arithmetic (statute only): per instrument, first page $5 + $1 + $4 = **$10.00**; each additional page $4 + $0.50 + $4 = **$8.50**. A typical 3-page deed = $10 + 2 x $8.50 = $27; a 20-page mortgage = $10 + 19 x $8.50 = $171.50. Reading of (e) ("$4 per page ... for each instrument") as applying to every page is inferred from the text; the Hillsborough Clerk's own fee page (item B4) should confirm the $10 / $8.50 figures. §28.222 lists deeds and mortgages among the covered instruments (not fetched).
- Related: the documentary stamp taxes (A2, A3) and intangible tax (A4) are collected by the clerk at recording but are separate taxes.
- Publisher: Florida Legislature. Document: Fla. Stat. §28.24 "Service charges." URL: http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0000-0099/0028/Sections/0028.24.html
- asOf: 2026 Florida Statutes. conf: high (text); medium on the "$4 per page" application until checked against the clerk's schedule.
- Access: curl with Chrome UA. Subsection (14)+ and §28.345 not read; a clerk may add other statutory or convenience fees not covered here.

## Open questions / re-verify — A

1. **A8**: Amendment 3 outcome on 2026-11-03 (needs 60%). Re-verify A6/A7/A8 on 2026-11-04. Confirm (a) the final ballot wording after the court-ordered rewrite and any appeal; (b) read the scanned AG letter (10-110_AG.pdf) or the ballot certification; (c) page 2 of the DOS list for any other 2026 GEN measure.
2. **A6**: DOR will publish a 2027 CPI-adjusted additional exemption in about January 2027 (if Amendment 3 fails). Re-check `cpi_homestead_exemption.pdf`. If Amendment 3 passes, DOR/Legislature implementing law will define $150,000 (2027) mechanics.
3. **A5**: read the current clean FR/BAR AS IS form (ASIS-7x, Feb 2026 revision, https://www.floridarealtors.org/media/5857) Para. 9; the 12/2024 redline was the text read. Hillsborough custom is from one law-firm article; ask a Tampa title agent or corroborate with a second source.
4. **A2**: confirm round-up-to-next-$100 treatment in DOR guidance (F.A.C. 12B-4 / DR-219). **A3**: confirm with DOR guidance that the $2,450 cap is not applied to a recorded residential mortgage.
5. **A9**: confirm no OIR rule change since 2002; confirm which endorsements residential lenders require and whether the $100 per-endorsement maximum bounds Form 9; settlement-fee default needs a better source (Tampa title agent fee schedule).
6. **A10**: pull a Hillsborough market (admitted) average from OIR's QUASRng Market Intelligence Report; get Citizens' final post-2026-07-01 Hillsborough HO-3 average from its 2026 Rate Kit (https://www.citizensfla.com/documents/20702/35182283/2026+Rate+Kit.pdf/a9199889-6745-3479-f061-6a6983f3d373?t=1765383355156); reconcile OIR's two inconsistent statewide figure sets.
7. **A11**: confirm against Hillsborough Clerk's recording fee page (item B4); read §28.222 and §28.24(14)+.

## Summary — B (Tampa / Hillsborough County)

| # | Item | Value | Conf | As of |
|---|---|---|---|---|
| B1 | City of Tampa district (TA) total millage, 2025 FINAL | 19.8428 mills ($19.8428 per $1,000 = 0.0198428); SCHOOL 6.3400, NON-SCHOOL 13.5028 | high (as 2025 final); 2026 final not yet published | Final 2025 (file ver 2025-10-06) |
| B1b | 2026 final, confirmed levies only | City 6.2076 (adopted 2026-09-22); SWFWMD 0.1831 (adopted 2026-09-22) | high (each, own document) | Sep 22, 2026 |
| B2 | Median sale price, Hillsborough County, Aug 2026 | SF $419,900 (-0.8% YoY); Townhouse/Condo $279,000 (+2.2% YoY) | high | Aug 2026 (released 2026-09-16) |
| B3 | HUD FY2027 FMR 2BR, Tampa-St. Petersburg-Clearwater MSA | $1,917 (0BR 1597, 1BR 1648, 2BR 1917, 3BR 2448, 4BR 2977); FY2026 was $1,977 | high | FY2027 (eff. 2026-10-01) |
| B4 | Hillsborough Clerk recording fee | $10.00 first page + $8.50 each additional page; $1.00 per name after the 4th | high | page fetched 2026-10-25 (no date on page) |
| B5 | Hillsborough homeowners premium (Citizens/OIR) | none found at a primary source | none | - |

## B. Tampa / Hillsborough County

### B1. Property-tax millage, City of Tampa taxing district — itemized, 2025 FINAL

- Value: **TA district total 19.8428 mills** = $19.8428 per $1,000 of taxable value = fraction 0.0198428 (1.98428%).
- Publisher: Hillsborough County Property Appraiser.
- Document: "Hillsborough County Property Appraiser — Final 2025" millage sheet (Crystal Reports PDF; sections CITY OF TAMPA, CITY OF TEMPLE TERRACE, CITY OF PLANT CITY, UNINCORPORATED).
- URL: https://www.hcpafl.org/Portals/HCPAFL/pdfs/2025FinalMillage.pdf?ver=2025-10-06-114623-490 (linked from https://www.hcpafl.org/Property-Info/Truth-In-Millage)
- asOf: "Final 2025" (the sheet's own title); file version stamp 2025-10-06. Tax year 2025.
- Access method: `curl -A "<desktop Chrome UA>" -e https://www.hcpafl.org/` then `pdftotext -layout`. Plain fetch also worked.
- District code/name the source uses: **"TA"** under the heading **"CITY OF TAMPA"**; 143,969 parcels counted ("COUNT"). (TT = Temple Terrace, PC = Plant City, U = Unincorporated.)
- Row as printed (column order per the sheet; each in mills = $ per $1,000):

| Levying authority | Sheet code | Mills ($/$1,000) | Fraction |
|---|---|---|---|
| County General Revenue | 100 | 5.4608 | 0.0054608 |
| County Environmental Lands (ECFL) | 130 | 0.0604 | 0.0000604 |
| *County Countywide subtotal* | | *5.5212* | |
| County MSTU (not levied in TA) | 200 | - | |
| Library Services | 210 | 0.5583 | 0.0005583 |
| Parks & Rec (not levied in TA) | 220 | - | |
| *Total County Levy* | | *6.0795* | |
| School — Local | 320 | 3.2480 | 0.0032480 |
| School — State (Required Local Effort) | 330 | 3.0920 | 0.0030920 |
| *Total School Levy* | | *6.3400* | |
| Port Tampa Bay (Port Authority) | 400 | 0.0737 | 0.0000737 |
| Hillsborough Transit Authority (HART) | 410 | 0.5000 | 0.0005000 |
| Children's Board | 430 | 0.4589 | 0.0004589 |
| SWFWMD | 500 | 0.1831 | 0.0001831 |
| Municipality — City of Tampa | 600 | 6.2076 | 0.0062076 |
| **Total millage, district TA** | | **19.8428** | **0.0198428** |

- Cross-foot (done by me): 6.0795 + 6.3400 + 0.0737 + 0.5000 + 0.4589 + 0.1831 + 6.2076 = **19.8428** ✓ (matches printed total). County check: 5.5212 + 0.5583 = 6.0795 ✓. School check: 3.2480 + 3.0920 = 6.3400 ✓.
- **SCHOOL subtotal = 6.3400 mills (0.0063400).**
- **NON-SCHOOL subtotal = 19.8428 - 6.3400 = 13.5028 mills (0.0135028)** = County 6.0795 + Port 0.0737 + HART 0.5000 + Children's Board 0.4589 + SWFWMD 0.1831 + City 6.2076.
- Split inside school: the sheet shows only "Local" 3.2480 and "State" 3.0920 (the 3.0920 matches FLDOE's published Required Local Effort for Hillsborough per a search snippet of FLDOE's 2025-26 summary, not fetched; treat as medium). The sheet does NOT break Local into discretionary operating / capital outlay / voted; I did not source that split. Do not invent it.
- Voted debt: the sheet has no debt/voted column or footnote; it does not say whether any listed levy is voted debt. City of Tampa's 6.2076 is a single "Municipality" figure; the City's levy resolution describes it as the General Fund operating levy (incl. CRA), with no separate debt levy. County Environmental Lands (0.0604) is a countywide voted program in practice but the sheet does not label it as such (unsourced here). Say nothing stronger.
- **2026 confirmations (own documents):**
  - City of Tampa: Resolution "levying an ad valorem tax at the rate of 6.2076 mills ... for the Fiscal Year 2027", PASSED AND ADOPTED Sep 22, 2026; 6.2076 exceeds rolled-back rate 6.0680 by 2.30%. URL: https://www.tampa.gov/sites/default/files/document/2026/doc-city-resolutions-reso-2026-779-meeting-date-10_22_2026-year-2026.pdf (plain curl). conf high. (File name references a 10/22/2026 meeting; the signature block date is "SEP 22 2026" — recheck.)
  - SWFWMD: news release Sep 22, 2026 "District Fiscal Year 2027 Budget Funds Water Resources Projects": "the District's Governing Board has adopted a millage rate of 0.1831 mill". URL: https://www.swfwmd.state.fl.us/the-newsroom/2026/district-fiscal-year-2027-budget-funds-water-resources-projects (plain curl). conf high.
  - County, School Board, Port, HART, Children's Board: no 2026 final found at a primary source. DOR Table 1 (comparison of levies, 2025-26) confirms County GR 5.4608 for 2025 (search snippet only).
- conf: **high** for the 2025 FINAL values (read verbatim off HCPA's own sheet). Tax-year-2026 total for TA: **not published as of 2026-10-25**; if used, label "2025 final; 2026 City and SWFWMD unchanged".
- Caveat: millage applies to TAXABLE value (after exemptions, Save Our Homes/non-homestead caps). Homestead exemption interaction is covered by the statewide dossier. The sheet is for the City of Tampa district only; other cities/unincorporated differ (U = 18.2515, adds County MSTU 4.6163).

### B2. Sale-price benchmark — Hillsborough County, August 2026

- Value (metric = **Median Sale Price**, as the source labels it; average also printed):
  - Single-family homes: **$419,900** (Aug 2026) vs $423,450 (Aug 2025) = **-0.8%** YoY. Closed sales 1,134 vs 1,318. Average SF price $553,452 vs $563,911 (-1.9%).
  - Townhouses & Condos: **$279,000** (Aug 2026) vs $273,000 (Aug 2025) = **+2.2%** YoY. Closed sales 301 vs 333. Average $411,465 vs $339,070 (+21.4%).
- Geography: **Hillsborough County** (the taxing county). No City-of-Tampa-only figure from a REALTOR association was found; not substituted. Not the MSA figure.
- Publisher: Hillsborough STAR (Stellar MLS data, produced by Florida Realtors; hosted by Pinellas Realtor Org).
- Document: "Hillsborough County Monthly Statistics — August 2026" (PDF; "Monthly Market Detail - August 2026", Single-Family Homes and Townhouses and Condos sections).
- URL: https://pinellasrealtor.org/wp-content/uploads/2026/09/Hillsborough-STAR-Monthly-Statistics-August-2026.pdf
- asOf: August 2026; "Source: Stellar MLS Live Data 9/16/2026"; "Data released on Wednesday, September 16, 2026. Next data release is Friday, October 16, 2026."
- Access method: `curl -A "<desktop Chrome UA>" -e https://pinellasrealtor.org/` + `pdftotext -layout`.
- September 2026 county data: released Oct 16, 2026 but no Hillsborough PDF found (guessed `.../2026/10/Hillsborough-STAR-Monthly-Statistics-{Sept,September,Sep}-2026.pdf` all 404). Florida Realtors' statewide SF summary for September 2026 (https://www.floridarealtors.org/sites/default/files/2026-10/September-2026-Fla-single-family-summary.pdf) has no Hillsborough row (statewide SF median $415,000 vs $410,000, +1.2%; context only).
- Context: July 2026 county SF median $430,000 vs $430,000 (0.0%) from the same series.
- conf: **high** (verbatim in publisher document).
- Caveat: the series is Stellar MLS-based via a local association; "combined SF + TH/condo" headline is on page 1 (closed sales 1,435), no combined median extracted. Prior-year values are the report's own Aug 2025 comparison column.

### B3. HUD Fair Market Rent — Tampa-St. Petersburg-Clearwater, FL MSA

- Fiscal year used: **FY2027 (effective 2026-10-01) is published** and used. FY2026 shown for comparison.
- Row (FY2027 PDF, Florida → Metropolitan FMR Areas): `+Tampa-St. Petersburg-Clearwater, FL MSA.......... 1597  1648  1917  2448  2977  Hernando, Hillsborough, Pasco, Pinellas`
  - **0BR $1,597 · 1BR $1,648 · 2BR $1,917 · 3BR $2,448 · 4BR $2,977.**
- FY2026 row (same method): 1593 / 1696 / **1977** / 2527 / 3077. So 2BR fell $60 (-3.0%) FY2026 to FY2027.
- Publisher: HUD (HUD USER). Document: "FY 2027 Schedule of Metropolitan & Non-Metropolitan Fair Market Rents" (page header reads "FY 2027").
- URL: https://www.huduser.gov/portal/datasets/fmr/fmr2027/FY2027_FMR_Schedule.pdf (FY2026: .../fmr2026/FY2026_FMR_Schedule.pdf)
- Access method: `curl -A "<desktop Chrome UA>" -e https://www.huduser.gov/` + `pdftotext -layout`.
- Small-Area-FMR mandatory? **Yes** — the `+` prefix on the area name (same convention as Houston and Seattle in this dataset). We use the metro-wide figure regardless. Metro covers Hernando, Hillsborough, Pasco, Pinellas (not Hillsborough-only).
- asOf: 2026-10-01 (standard FY2027 effective date; the PDF does not print an effective-date line).
- conf: **high**.

### B4. Hillsborough Clerk of the Circuit Court & Comptroller — recording fees

- Value: **$10.00 first page; $8.50 each additional page** (deed and mortgage alike; instruments up to 8 1/2 x 14 in). Indexing: **$1.00 per additional name beyond four** (first four names free). Plats / oversize condo exhibits: $35.00 first page, $19.50 each additional (not relevant).
- Quote (Fees and Fines page, "Recording Services"): "Recording Services and Fees are limited to recording, indexing, and filing any instrument not greater than 8 1/2 X 14 inches. First page or fraction thereof $10.00. Each additional page or fraction thereof $8.50. Indexing instruments recorded in the official records which contain more than four names, per additional name $1.00."
- Corroboration (same publisher): propertyrecords page, deed FAQ: "Recording fees are $10.00 for the first page and $8.50 for each additional page of the document. The first four names are free; any additional names are $1.00 per name."
- Publisher: Hillsborough County Clerk of Court & Comptroller.
- Documents: "Fees and Fines" (Recording Services table); "Property Records and Recording".
- URLs: https://hillsclerk.com/about-us/fees-and-fines ; https://hillsclerk.com/propertyrecords-and-recording
- Same page also lists state doc stamps (deeds $0.70 per $100; notes $0.35 per $100) and intangible tax (2 mills) — statewide scope, left to the other agent; reported here only as seen.
- Access method: plain curl (UA header); HTML to text.
- asOf: page undated; read 2026-10-25. conf: **high**.
- Caveat: no separate per-instrument deed/mortgage surcharge is listed on these pages other than names; the Clerk also offers an online Deed Calculator and Mortgage Calculator (https://hillsclerk.com/Additional-Services/Official-Records/Deed-Calculator, .../Mortgage-Calculator) not interrogated. Not checked: any e-recording vendor fee.

### B5. Hillsborough homeowners-insurance average premium (Citizens / OIR)

- **None found at a primary source.** Citizens' own site paths I tried (/rates, /about/rates, /rate-information) returned 404; searches surfaced only one aggregator (movewithmomentum.com) claiming a Citizens Hillsborough average of $2,425 (2026, -4.5% change) with 6,518 policies — **not adopted** (aggregator, unverifiable against Citizens/OIR; graded no better than assumption/medium and excluded by instruction).
- conf: none.

### B6. Just value and the costs of sale (§193.011(8)) — why the record taxes the full price

- Value: not a number — a statutory factor. Quote, Fla. Stat. §193.011: "In arriving at just
  valuation as required under s. 4, Art. VII of the State Constitution, the property appraiser shall
  take into consideration the following factors: (1) The present cash value of the property, which is
  the amount a willing purchaser would pay ... (8) The net proceeds of the sale of the property, as
  received by the seller, after deduction of all of the usual and reasonable fees and costs of the
  sale, including the costs and expenses of financing, and allowance for unconventional or atypical
  terms of financing arrangements."
- Publisher: Florida Legislature. Document: Fla. Stat. §193.011 "Factors to consider in deriving just
  valuation." URL:
  http://www.leg.state.fl.us/statutes/index.cfm?App_mode=Display_Statute&URL=0100-0199/0193/Sections/0193.011.html
- asOf: 2026 Florida Statutes. conf: high (text).
- Access: proxy (a plain curl with a browser UA returned an empty body on this pass).
- Consequence for the record: an appraiser's just value may sit below the sale price because factor
  (8) deducts the costs of sale. No publisher states how far below for Hillsborough, so the record
  does not model a ratio: it taxes the FULL price (`assessmentRatio: 1`, `basis: "market"`), which can
  only overstate the bill, never understate it.


## Open questions / re-verify — B
1. HCPA 2026 final millage sheet for TA (expected soon after Nov 1 bills): re-fetch https://www.hcpafl.org/Property-Info/Truth-In-Millage and update B1. Particularly County GR, Library, School local, HART, Children's Board, Port.
2. School Local 3.2480 split into discretionary / capital / voted not sourced (FLDOE or School Board TRIM notice).
3. Whether any listed levy is voted debt — sheet silent; check HCPA TRIM notice legends / Tax Collector.
4. B2: September 2026 Hillsborough STAR PDF (released Oct 16) not found; re-check pinellasrealtor.org / starstats.org. City-of-Tampa-only REALTOR figure not found.
5. B5: Citizens rate filing by county (citizensfla.com / floir.com) if the county table is wanted.
6. City resolution file name says 10/22/2026 meeting while signature date reads SEP 22 2026; confirm adoption date at tampa.gov.

## D. Modelling decisions for `tampa.ts`

| # | Field | Value in the record | Rests on | Grade carried |
|---|---|---|---|---|
| D1 | `propTax.effective` / `publishedRate` | 0.0198428 (19.8428 mills, City of Tampa district TA, **2025 final**) | B1, B6 | high (as the 2025 final rate) |
| D2 | `propTax.exemptions` | school slice 0.0063400 exempts $25,000; non-school slice 0.0135028 exempts $51,411 ($25,000 + the 2026 indexed $26,411) | A6, B1 | high |
| D3 | `transfer` | `li_docStampsDeed` $0 to the buyer (seller pays by contract default); `li_docStampsNote` $0.35 per $100 or fraction of the loan; `li_intangibleTax` 0.002 × the loan | A2, A3, A4, A5 | medium / high / high |
| D4 | `saleTax` | deed stamps 0.007 × the sale price, the SELLER's at the horizon | A2, A5 | high |
| D5 | `fees` | closing-services 550; title 270; inspect 450; appraisal 600; survey 500; recording 181.50; moving 1,500; setup 250 | A5, A9, A11, B4 | see below |
| D6 | `insurance` | 2,918 / year | A10 | medium |
| D7 | `bench`, `yoy` | house 419,900; condo 279,000; yoy −0.008 | B2 | high |
| D8 | `rent` | 1,917 (FY2027 2BR, metro-wide) | B3 | high |
| D9 | `marginal.FL` (rules/us.ts) | the federal single-filer 2026 table; Florida levies no personal income tax | A1 | high |

**D1.** Florida's millage is per $1,000 of taxable value: 19.8428 / 1,000 = 0.0198428, a FRACTION.
The 2025 final is used because the 2026 final sheet is not yet published (B1); the City of Tampa and
SWFWMD 2026 finals (6.2076, 0.1831) are unchanged, the other five authorities' 2026 finals are
unconfirmed. Re-verify when HCPA posts its 2026 sheet.

**D2.** `PropertyTax.exemptions` requires each entry's `appliesToRate` to be EXCLUSIVE of every
other's, but Florida's first $25,000 applies to all levies and the additional amount to non-school
levies only. The record therefore splits by slice, not by exemption: the school slice (6.3400 mills)
carries the $25,000 that applies to it, and the non-school slice (13.5028 mills) carries both amounts,
$25,000 + $26,411 = $51,411. Simplifications, all disclosed in the record's note:
- The additional exemption is a band (assessed value above $50,000, up to $76,411 in 2026). Modelled
  as flat, which overstates relief only for prices below $76,411 — far under any Tampa benchmark.
- The Jan-1 rule (A6): a buyer closing after January 1 pays the prior owner's bill that year and
  claims homestead the following January, after reassessment to just value. The record models the
  steady state with homestead claimed, as the Texas records do.
- Save Our Homes (A7) caps FUTURE assessment growth; it does not change the first assessed value.
- Amendment 3 (A8) is pending and not modelled.

**D3.** Who pays is a contract allocation, not statute (A5). The FR/BAR AS IS form (Rev. 7/24, read
as the publisher's 12/2024 redline; the Feb 2026 revision ASIS-7x was not readable) puts deed stamps
on the seller and "Taxes and recording fees on notes and mortgages" on the buyer. The $0 deed-stamp
line is graded **medium** because the current form revision was not read. Note stamps: `perValue`,
`per: 0.35`, `unit: 100`, `on: "loan"` — the engine rounds up per unit, matching "or fraction
thereof"; no cap applies to a recorded mortgage (A3; the cap reading is statutory structure). The
intangible tax: `perValue`, `per: 0.002`, `unit: 1`, `on: "loan"` — per dollar, no $100 rounding (A4).

**D4.** `saleTax` admits only `brackets` or `flat` lines, so deed stamps are `flat` 0.007. That drops
the round-up to the next $100 — at most $0.70 on any sale. Not widening the type in this run.

**D5.** Fees, each graded at its own weakest input:
- `lawyer` (the buyer's own closing-services fee — FR/BAR 9(c): "each party shall bear their own
  Closing Services fees"): $550, the midpoint of the $300–$800 range lender/realtor blogs cite (A9).
  Not promulgated. **assumption**.
- `titleIns` (the buyer's lender's-policy costs, since Hillsborough's seller pays the owner's policy,
  A5 medium): $25 simultaneous-issue lender's policy (69O-186.003(5)(a), high) + Florida Form 9 at 10%
  of the combined owner's and loan premiums (69O-186.005(9)(a)) + ALTA 8.1 at the $25 rule minimum.
  At the $419,900 benchmark the owner's premium is 100 × $5.75 + 319.9 × $5.00 = $575 + $1,599.50 =
  $2,174.50 (A9 schedule); Form 9 = 10% × ($2,174.50 + $25) = $219.95 → $220. Total $25 + $220 + $25 =
  **$270**. Which endorsements a lender requires is not published, and the rule is ambiguous on
  whether its $100 per-endorsement maximum bounds Form 9 (A9) — the 10% reading is the higher,
  unflattering one. **assumption**. A flat figure at the benchmark; it does not scale with price.
- `inspect` $450, `appraisal` $600: the defaults the other US records carry. **assumption**.
- `survey` $500: FR/BAR lists "Survey (and elevation certification, if required)" as a BUYER cost
  (A5); no Florida survey-fee schedule exists, so $500 is Houston's default. **assumption**.
- `recording` $181.50: Hillsborough Clerk $10.00 first page + $8.50 each additional page (B4, high;
  matches §28.24(13), A11), on a 3-page deed ($27.00) plus an 18-page mortgage ($154.50) — Seattle's
  page-count assumption, carried over. The buyer records both (A5). **assumption** (page counts).
- `moving` $1,500, `setup` $250: the shared US defaults. **assumption**.

**D6.** $2,918 is Citizens Property Insurance's current average multiperil HO-3 premium for
Hillsborough County (22,882 policies in force 2025-04-30, A10). It is county-specific but
Citizens-only (the insurer of last resort, not a market average), predates the July 2026 rate change,
INCLUDES wind and EXCLUDES flood — Citizens writes no flood cover, and a coastal Hillsborough parcel
can need a separate NFIP or private flood policy this record does not carry. For context, OIR's
statewide admitted-market average including wind is $3,736–$3,757 (two figure sets on one page).
**medium**.

**D7.** Hillsborough County MEDIANS (Stellar MLS, Hillsborough STAR, August 2026): single-family
$419,900 (−0.8% from $423,450), townhouse/condo $279,000. County, not City of Tampa — no city figure
is published by a REALTOR association (B2). `yoy` −0.008 is the single-family change, a FRACTION.

**D8.** HUD FY2027 (effective 2026-10-01) 2BR FMR, Tampa-St. Petersburg-Clearwater MSA: $1,917,
metro-wide (the area is Small-Area-FMR mandatory; the metro-wide figure is used, as for Houston and
Seattle). `rentBasis: "fmr2br"`.

**D9.** Florida has no personal income tax (A1), so `marginal.FL` is the same federal single-filer
table `marginal.TX` and `marginal.WA` carry.

**Not modelled, deliberately (follow-ups):** the Affordability page's Texas-gated notes on the
homestead appraisal cap and wind/hail insurance have Florida analogues (Save Our Homes; hurricane
exposure) that Tampa does not get in this run; flood insurance; condo/HOA special assessments; the
first-year reassessment; Amendment 3.
