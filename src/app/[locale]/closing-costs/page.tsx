"use client";

import { useMemo, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import {
  buildLines,
  closingTotal,
  credits,
  monthsToSave,
  type CreditLine,
  type LineItem,
} from "@/domain/engine";
import { CalcTrace } from "@/components/calc/calc-trace";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useRules } from "@/hooks/use-country";
import { useSections } from "@/hooks/use-sections";
import { useSharedState } from "@/hooks/use-shared-state";
import { TOOL_DEFAULTS, TOOL_KEYS } from "@/lib/shared-inputs";
import { anySourceGiven, isPersonalised, resolveInputs } from "@/lib/resolve-inputs";
import { CLOSING_SECTIONS } from "@/lib/sections";
import { cashState } from "@/lib/closing-view";
import type { Tone } from "@/lib/tone";
import { useMoney } from "@/lib/format";
import { PanelRow, SectionRow } from "@/components/affordability/section-row";
import { CrossLink } from "@/components/cross-link";
import { LineRows } from "@/components/closing-costs/line-rows";
import { NumberField } from "@/components/number-field";
import { Provenance } from "@/components/provenance";
import { PurchaseInputs } from "@/components/purchase-inputs";
import { AnswerHead, FigureFooter, NoteLine, PendingFigures, SectionsHeader, ToolMain } from "@/components/tool-page";
import { NOT_PRICED, NOT_PRICED_NEWBUILD } from "./omissions";

/** Group totals for the trace. Same reduction `closingTotal` uses, so they agree by construction. */
function sum(items: readonly { amount: number }[]) {
  return items.reduce((t, r) => t + r.amount, 0);
}

export default function ClosingCostsPage() {
  const t = useTranslations("ClosingCosts");
  // The ask that replaces the answer where nobody publishes a price.
  const tInputs = useTranslations("Inputs");
  const tJur = useTranslations("Jurisdictions");
  const [jurisdiction] = useJurisdiction();
  const rules = useRules();
  const [stored, update, hydrated] = useSharedState(TOOL_KEYS, TOOL_DEFAULTS);
  const fmt = useMoney();

  const resolved = useMemo(
    () => resolveInputs(stored, jurisdiction, rules),
    [stored, jurisdiction, rules],
  );
  const lines = useMemo(
    () => buildLines(jurisdiction, rules, resolved),
    [jurisdiction, rules, resolved],
  );
  const credit = useMemo(
    () => credits(jurisdiction, rules, resolved, lines.gov),
    [jurisdiction, rules, resolved, lines.gov],
  );
  const total = useMemo(
    () => closingTotal(jurisdiction, rules, resolved),
    [jurisdiction, rules, resolved],
  );

  const cash = cashState({ net: total.net, funds: resolved.funds });

  const { isOpen, toggle, expanded, toggleAll } = useSections(
    CLOSING_SECTIONS,
    // Taxes and government fees, always.
    //
    // Every other page opens the section that answers its own question, and this
    // page's question is what THIS jurisdiction charges. That group is the only
    // one whose contents change with location — Toronto stacks a municipal tax on
    // the provincial one, Alberta has no transfer tax and shows land titles
    // registration instead — so it is both the subject and the positioning claim
    // made concrete.
    //
    // "The largest group" was the obvious rule and is a bad proxy for it: in
    // Winnipeg, the default jurisdiction, adjustments and moving in is the
    // heaviest at $5,459, so the rule opened the one group that is the same
    // everywhere.
    "government",
  );
  const creditsAtClosing = total.creditsAtClosing;
  const later = credit.later.reduce((sum, c) => sum + c.amount, 0);

  const gap = resolved.funds === null ? null : resolved.funds - total.net;
  // One implementation, in the engine. This page used to compute it a third way
  // and return null where the engine returns 0, so a reader who could already
  // close and a reader who never gave a saving rate both saw the same em-dash.
  const months = monthsToSave(gap, resolved.save);

  const section = (
    id: string,
    labelKey: string,
    tone: Tone,
    line: string,
    figure: string,
    why: string,
    body: ReactNode,
  ) => (
    <SectionRow
      key={id}
      id={id}
      name={t(labelKey)}
      tone={tone}
      line={line}
      figure={figure}
      why={why}
      open={isOpen(id)}
      onToggle={() => toggle(id)}
    >
      {body}
    </SectionRow>
  );

  const def = (id: string) => CLOSING_SECTIONS.find((s) => s.id === id)!.labelKey;
  /**
   * Why this rebate row is worth what it is worth.
   *
   * An exhaustive switch, not a ternary chain. The chain's fall-through was
   * `rebNone` — "No rebate exists here" — so every status added to `CreditLine`
   * after it was written silently inherited the one sentence that is the exact
   * opposite of the truth for a buyer who qualified. `superseded` and
   * `overCeiling` both did. The `never` default makes the next one a typecheck
   * failure here instead.
   */
  const rebateWhy = (c: CreditLine): string => {
    switch (c.st) {
      case "applied":
        return t("rebApplied");
      case "capped":
        return `${t("rebCapped")} ${c.cap !== undefined ? fmt(c.cap) : t("rebPartial")}`;
      case "phasedOut":
        return t("rebPhaseWhy");
      case "overCeiling":
        return t("rebOverCeiling");
      case "superseded":
        return t("rebSuperseded");
      case "ftbOnly":
        return t("turnOnFtb");
      case "none":
        return t("rebNone");
      default: {
        const unhandled: never = c.st;
        return unhandled;
      }
    }
  };
  /**
   * A group's line: its heaviest item, with the figure, and how many there are.
   *
   * It used to be "{n} items" — a count, which tells the reader the COST of
   * opening rather than any reason to. The line is the one thing a closed
   * section always shows, and on the three biggest groups on the page it was
   * spent on inventory.
   */
  const groupLine = (group: readonly LineItem[]) => {
    const largest = group.reduce((a, b) => (b.amount > a.amount ? b : a));
    return t("groupLine", { name: t(largest.key), a: fmt(largest.amount), n: group.length });
  };

  /*
    What is NOT in the bill above, composed rather than written out, so the count
    in the sentence introducing it is read off the list it introduces.

    The new-build entries join only for a new build: an inventory that lists costs
    which cannot apply to this purchase teaches the reader to skim it, and skimming
    is the failure mode this list exists to avoid.
  */
  const notPriced = [
    ...NOT_PRICED,
    ...(resolved.ptype === "newbuild" ? NOT_PRICED_NEWBUILD : []),
  ];

  return (
    <ToolMain>
      {/*
        This page needs a price harder than most, and its failure was quieter. Where nobody
        publishes a benchmark the fixed professional fees still add up — Yukon printed $7,420 of
        lawyer, inspection and moving costs as "cash needed at closing" for a purchase that has no
        price. The all-jurisdictions sweep did not catch it precisely because the figure is not
        zero: a plausible wrong number survives a check for $0.
      */}
      {resolved.priceKnown ? (
        <>
      {/*
        One mechanism for "the stored inputs have not landed yet", shared by every
        tool page — see `PendingFigures` in tool-page.tsx for why it hides rather
        than omits, and what that trades.
      */}
      <PendingFigures pending={!hydrated}>
      <AnswerHead
        eyebrow={t("title")}
        // NET, not gross. `cash` is down payment + costs before the credits that
        // land on closing day; every one of the three stats beside it and the
        // cash-check section below it are measured against `net`, so the hero was
        // the only figure on the page disagreeing with the rest of the page. On a
        // Toronto benchmark the difference was $207,777 against $199,302.
        figure={fmt(total.net)}
        pulseKey={jurisdiction.id}
        head={t("cashTotal")}
        sub={t("separateNote")}
        tag={isPersonalised(stored) ? t("tagYours") : t("tagTypical")}
        stats={[
          { label: t("downPaymentRow"), value: fmt(total.fin.down) },
          { label: t("closingCosts"), value: fmt(total.total), mark: "rule" },
          ...(creditsAtClosing > 0
            ? [{ label: t("grpAtClosing"), value: `− ${fmt(creditsAtClosing)}`, mark: "rule" as const }]
            : []),
        ]}
      />
      </PendingFigures>

      <div className="pt-8 sm:pt-[34px]">
        <SectionsHeader
          label={t("breakdown")}
          expanded={expanded}
          onToggleAll={toggleAll}
          expandLabel={t("expandAll")}
          collapseLabel={t("collapseAll")}
        />

        {section(
          "government",
          def("government"),
          "none",
          groupLine(lines.gov),
          fmt(lines.gov.reduce((s, l) => s + l.amount, 0)),
          t("govWhy"),
          <>
            <LineRows items={lines.gov} namespace="ClosingCosts" />
            {lines.gov.some((l) => l.cashOnly) ? (
              <p className="mt-3 max-w-[620px] text-[12.5px] leading-[1.6] text-ink3 text-pretty">
                {t("premiumTaxWhy")}
              </p>
            ) : null}
          </>,
        )}

        {section(
          "professional",
          def("professional"),
          "none",
          groupLine(lines.pro),
          fmt(lines.pro.reduce((s, l) => s + l.amount, 0)),
          t("proWhy"),
          <LineRows items={lines.pro} namespace="ClosingCosts" />,
        )}

        {section(
          "adjustments",
          def("adjustments"),
          "none",
          groupLine(lines.adj),
          fmt(lines.adj.reduce((s, l) => s + l.amount, 0)),
          t("adjWhy"),
          <LineRows items={lines.adj} namespace="ClosingCosts" />,
        )}

        {section(
          "credits",
          def("credits"),
          creditsAtClosing > 0 ? "pass" : "none",
          creditsAtClosing > 0 ? t("creditsSub") : later > 0 ? t("noCreditLater") : t("noCreditAtAll"),
          // No closing-day credit is an absence, not a value. An em-dash read
          // as a figure that failed to compute, and "$0" would assert a credit
          // exists here and happens to be nil -- the same false claim this
          // page's line items refuse to make. The line beside it says which of
          // "arrives later" or "does not exist here" is true.
          creditsAtClosing > 0 ? `− ${fmt(creditsAtClosing)}` : "",
          t("creditsWhy"),
          <>
            {/* Timing is the point of this section, so the two groups are never merged. */}
            <p className="eyebrow pb-1 text-ink3">{t("grpAtClosingWhen")}</p>
            {credit.atClosing.map((c) => (
              <div key={c.key}>
                <PanelRow
                  label={t(c.key)}
                  value={c.amount > 0 ? `− ${fmt(c.amount)}` : "—"}
                  provenance={<Provenance kind="rule" />}
                />
                <p className="pt-1 text-[11.5px] text-ink3">{rebateWhy(c)}</p>
              </div>
            ))}
            {credit.later.length > 0 ? (
              <>
                <p className="eyebrow pt-4 pb-1 text-ink3">{t("grpLater")}</p>
                {credit.later.map((c) => (
                  <div key={c.key}>
                    <PanelRow
                      label={t(c.key)}
                      value={`− ${fmt(c.amount)}`}
                      provenance={<Provenance kind="rule" />}
                    />
                    {c.ex ? <p className="pt-1 text-[12px] text-ink3">{t(c.ex)}</p> : null}
                  </div>
                ))}
                <p className="mt-2 max-w-[620px] text-[12.5px] leading-[1.6] text-caution text-pretty">
                  {t("grpLaterWhen")}
                </p>
              </>
            ) : null}
            {/*
              A programme that applies here and that this app deliberately does not
              price. `credits()` used to push the first-time buyers' GST/HST rebate
              into `later` as MONEY, refunding up to $50,000 of a tax `buildLines`
              never charges — so a new build showed a resale's bill plus a
              five-figure credit. It now travels as a key with no amount attached,
              and this is the treatment that convention requires: a label and an
              explanation, never a figure and never a PanelRow, because a row with
              a value is the claim the omission exists to withdraw.
            */}
            {/*
              The two prices inside `ex_gstFthb` — full to $1M, nil at $1.5M — stay
              typed into the copy, and that is a considered exception rather than an
              oversight. `gstFthb.fullTo` and `.zeroAt` are both conf "high" with an
              `asOf`, so they MAY travel; what they cannot do is travel through
              `useMoney()`, which renders them "$1,000,000" and "$1,500,000". The
              sentence is a plain-language description of a programme's shape, and
              round compact figures are how the programme is described everywhere it
              is described. Binding them would make the copy worse to read in order
              to make it marginally easier to maintain, for two numbers a statute
              changes at the same time it changes the programme this paragraph is
              about. `Inputs.amortCapped` is the opposite case and was bound: a bare
              "20%" restating a rule its own sibling key already reads from federal.ts.
            */}
            {credit.omitted.length > 0 ? (
              <>
                <p className="eyebrow pt-4 pb-1 text-ink3">{t("grpOmitted")}</p>
                {credit.omitted.map((c) => (
                  <div key={c.key}>
                    <p className="text-[13.5px] font-medium">{t(c.key)}</p>
                    <p className="max-w-[620px] pt-1 text-[12.5px] leading-[1.6] text-ink3 text-pretty">
                      {t(c.ex)}
                    </p>
                  </div>
                ))}
              </>
            ) : null}
          </>,
        )}

        {section(
          "cash",
          def("cash"),
          cash === "pass" ? "pass" : cash === "caution" ? "caution" : cash === "blocked" ? "blocked" : "none",
          cash === "unanswered"
            ? t("cashCheckSub")
            : cash === "pass"
              ? t("passNote")
              : cash === "caution"
                ? t("tightNote")
                : t("shortNote"),
          cash === "unanswered"
            ? fmt(total.net)
            : `${fmt(Math.abs(gap!))} ${cash === "blocked" ? t("stShort") : cash === "caution" ? t("stTight") : t("stPass")}`,
          t("cashWhy"),
          <>
            <PanelRow label={t("downPaymentRow")} value={fmt(total.fin.down)} />
            <PanelRow label={t("closingCosts")} value={fmt(total.total)} />
            {creditsAtClosing > 0 ? (
              <PanelRow label={t("grpAtClosing")} value={`− ${fmt(creditsAtClosing)}`} />
            ) : null}
            <PanelRow label={t("netCash")} value={fmt(total.net)} strong />
            <PanelRow
              label={t("available")}
              value={resolved.funds === null ? "—" : fmt(resolved.funds)}
            />
            <PanelRow
              label={t("monthsToClose")}
              value={months === null ? "—" : String(months)}
              strong
            />
            {months === 0 ? <p className="pt-1 text-[12.5px] text-pass">{t("passNote")}</p> : null}
            {gap !== null && gap < 0 && months === null ? (
              <p className="mt-2 text-[12.5px] text-ink3">{t("noSaveRate")}</p>
            ) : null}
            {/*
              VERDICT. Only when the bill is not comfortably covered — a reader
              with a reserve has no funding question. Two forms: with balances
              given it states what the other page does; without them it names
              what it will ask for, rather than travelling a "$0 available"
              figure that would assert an empty bank account.
            */}
            {cash === "blocked" || cash === "caution" ? (
              <CrossLink
                namespace="ClosingCosts"
                id={anySourceGiven(stored) ? "xDownPayment" : "xDownPaymentAsk"}
                href="/down-payment"
              />
            ) : null}
            <div className="mt-4 flex max-w-[420px] flex-col gap-3 rounded-lg border border-acbr bg-acbg p-3">
              {cash === "unanswered" ? (
                <p className="text-[13px] leading-[1.5] text-ink2 text-pretty">{t("cashUnanswered")}</p>
              ) : null}
              <NumberField
                id="funds"
                label={t("available")}
                value={stored.funds}
                min={0}
                onCommit={(funds) => update({ funds })}
              />
              <NumberField
                id="save"
                label={t("monthlySavings")}
                value={stored.save}
                min={0}
                onCommit={(save) => update({ save })}
              />
            </div>
          </>,
        )}
        {/*
          "Show me how you got that."

          Every operand is a GROUP TOTAL, not a re-derivation: each line here is the
          sum of the section that lists it, so the trace can never disagree with the
          rows above it, and any figure in it can be followed back to the document
          its provenance names.
        */}
        {section(
          "calc",
          "secCalc",
          "none",
          t("calcLine"),
          "",
          t("calcWhy"),
          <CalcTrace
            caption={t("calcTraceCaption")}
            lines={[
              { label: t("downPaymentRow"), value: fmt(total.fin.down) },
              { label: t("calcGov"), value: fmt(sum(lines.gov)), op: "plus" },
              { label: t("calcPro"), value: fmt(sum(lines.pro)), op: "plus" },
              { label: t("calcAdj"), value: fmt(sum(lines.adj)), op: "plus" },
              { label: t("cashTotal"), value: fmt(total.cash), op: "equals", strong: true },
              // Absent when nothing applies that day — a repeat buyer, or a province
              // with no at-closing rebate — rather than a $0 row implying relief the
              // reader does not get.
              ...(total.creditsAtClosing > 0
                ? [{ label: t("calcCredits"), value: fmt(total.creditsAtClosing), op: "minus" as const }]
                : []),
              { label: t("netCash"), value: fmt(total.net), op: "equals", rule: true, strong: true },
            ]}
          />,
        )}
      </div>

      {/*
        MOVE 3 — the omissions inventory, the same mechanism Rent vs Buy already
        ships in `omissions.ts`: a module-level list whose LENGTH feeds the sentence
        introducing it, so the count cannot drift out of step with the list.

        This is what turns `conf: "none"` from a data-layer convention into
        something the reader can see. "Nobody publishes it and we will not invent
        one" currently renders as silence, and silence is indistinguishable from
        "this cost does not exist" to the one reader who most needs the difference.

        Deliberately NOT a section. Sections are the page's own computation and are
        registered in `src/lib/sections.ts`; this is a standing statement about the
        computation, it hides nothing, and DESIGN.md §8's ban is on a second way to
        REVEAL rather than on a paragraph.
      */}
      <section aria-labelledby="cc-omissions" className="mt-10 flex flex-col gap-2">
        <h2 id="cc-omissions" className="text-[13px] font-semibold">
          {t("notPricedTitle")}
        </h2>
        <p className="max-w-[620px] text-[12.5px] leading-[1.6] text-ink3 text-pretty">
          {t("notPricedLine", { n: notPriced.length })}
        </p>
        <ul className="m-0 flex list-none flex-col gap-2 p-0">
          {notPriced.map((key) => (
            <li key={key} className="max-w-[620px] text-[12.5px] leading-[1.6] text-ink2 text-pretty">
              {t(key)}
            </li>
          ))}
        </ul>
      </section>
        </>
      ) : (
        <AnswerHead
          eyebrow={t("title")}
          head={tInputs("noPriceHead", { place: tJur(`at.${jurisdiction.id}`) })}
          sub={tInputs("noPriceSub")}
        />
      )}

      <section aria-labelledby="cc-inputs" className="mt-8 flex flex-col gap-3">
        <h2 id="cc-inputs" className="text-[13px] font-semibold">
          {t("subtitle")}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <PurchaseInputs
            price={stored.price}
            pricePlaceholder={resolved.priceKnown ? resolved.price : null}
            dpPct={stored.dpPct}
            dpPctEffective={resolved.dpPct}
            belowMinimum={resolved.belowMinimum}
            amortYears={stored.amortYears}
            ptype={stored.ptype}
            ftb={stored.ftb}
            elsewhere={stored.elsewhere}
            ftbEffective={resolved.ftb}
            ptypeEffective={resolved.ptype}
            residency={stored.residency}
            jurisdiction={jurisdiction}
            onChange={update}
          />
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-card p-3">
            <p className="micro text-ink3">{t("mortgageAmount")}</p>
            <p className="text-[22px] font-semibold tracking-[-0.02em]">{fmt(total.fin.loan)}</p>
            <p className="text-[12.5px] leading-[1.55] text-ink3 text-pretty">
              {total.fin.insured ? t("insuredNote") : t("uninsuredNote")}
            </p>
            {total.fin.premium > 0 ? (
              <PanelRow
                label={`${t("cmhcPremium")} · ${t("addedToLoan")}`}
                value={fmt(total.fin.premium)}
                provenance={<Provenance kind="rule" />}
              />
            ) : null}
          </div>
        </div>
        {/*
          What `benchmarkPrice()` does for a new build, said out loud for the first
          time. It maps `newbuild` to the RESALE HOUSE benchmark — documented at
          resolve-inputs.ts:36-45 and surfaced nowhere — because no publisher
          produces a new-build price level in Canada, and `bench.newbuild` was
          deleted rather than corrected precisely because all fourteen of its values
          were invented.

          It PRICES NOTHING. A builder's warranty enrolment is published in at least
          one province; levies, hookups and grading deposits have no publisher
          anywhere, so quoting the one published item would understate the group
          while looking authoritative — which is the failure mode this whole file
          is written against.
        */}
        {resolved.ptype === "newbuild" ? (
          <NoteLine tone="caution">{t("newBuildPriceNote")}</NoteLine>
        ) : null}
      </section>

      <FigureFooter jurisdiction={jurisdiction} />
    </ToolMain>
  );
}
