"use client";

import { useTranslations } from "next-intl";
import type { Jurisdiction } from "@/domain/types";
import type { PropertyType, Residency } from "@/domain/types";
import { maxAmortYears } from "@/domain/engine";
import { useRules } from "@/hooks/use-country";
import { useMoney, usePercent } from "@/lib/format";
import { NumberField } from "@/components/number-field";
import { NoteLine } from "@/components/tool-page";
import { SegmentedGroup } from "@/components/affordability/segmented-group";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/**
 * The purchase itself: price, down payment, amortization, property type, buyer
 * status. Four tool pages ask for exactly this set, so it is one component
 * reading one `Inputs` namespace rather than four near-copies that drift.
 *
 * Every field is optional to the caller: a page passes only what it actually
 * uses, and a field with no handler does not render. Closing Costs has no use
 * for amortization beyond the CMHC surcharge; Amortization has no use for
 * first-time-buyer status.
 *
 * Two things here are NOT fields, and they are the reason this component earns
 * its place over four near-copies: a caution when the chosen amortization needs
 * an eligibility the reader has not established, and the residency question,
 * asked only where the jurisdiction's own data says it changes the bill. Both
 * are knowledge the app already held and never handed over.
 */
export interface PurchaseInputsProps {
  price: number | null;
  /**
   * What price resolves to when the reader has not set one — shown as placeholder,
   * never as value.
   *
   * `null` where nobody publishes a benchmark for this jurisdiction and property
   * type. The field then suggests NOTHING and asks in place: a placeholder of
   * "0" is a suggestion, and the one it makes is a house that costs nothing.
   */
  pricePlaceholder: number | null;
  /** What the reader picked. The control binds to this, so a chip is always selected. */
  dpPct: number;
  /**
   * What the app actually models, with the legal minimum applied. When it differs
   * from `dpPct` the component says so — otherwise the chip asserts one deposit
   * while the mortgage above it is built on another.
   */
  dpPctEffective: number;
  belowMinimum: boolean;
  amortYears?: number;
  ptype?: PropertyType;
  ftb?: boolean;
  elsewhere?: boolean;
  /**
   * The buyer status and property type the APP is modelling, as against the two
   * optional props above, which are the controls this page happens to offer.
   *
   * The split is the same one `dpPct` / `dpPctEffective` already makes, and it exists
   * for a defect the optional props caused on their own. Both are persisted, shared,
   * app-wide state; a page that does not render a control for one still models it, and
   * `resolveInputs()` hands it back. Reading eligibility off the CONTROLS meant `ftb`
   * fell to `false` on the two pages that ask for neither, so the same reader in the
   * same stored state — `ftb: true`, the default — was told on /amortization and
   * /rent-vs-buy that a 30-year amortization needs an exemption they might not have,
   * and told nothing on /closing-costs, /down-payment and /scenarios. One rule, one
   * state, six pages, two answers. On /amortization the caution was also unremovable,
   * because that page has no first-time-buyer control to correct it with.
   *
   * Required, not optional, so a new page cannot reintroduce the same silence.
   */
  ftbEffective: boolean;
  ptypeEffective: PropertyType;
  /**
   * Whether the buyer lives in the province they are buying in.
   *
   * Optional like every other field here, and for the same reason — but the
   * omission is louder than the rest, because this key already existed,
   * persisted, schema-checked and read by `applies()`, with no control anywhere
   * writing it. Halifax's non-resident Provincial Deed Transfer Tax (10%, the
   * single largest charge in the dataset — $70,721 resident against $126,451
   * non-resident on the city benchmark) could therefore never fire, and its copy
   * shipped translated into four languages and dead.
   *
   * A page that shows a closing bill MUST bind this, and the four that do —
   * /closing-costs, /down-payment, /scenarios, /rent-vs-buy — each pass
   * `residency={stored.residency}`. /amortization does not, because nothing it
   * computes reads the key: a switch there would move no figure on the screen.
   *
   * Optional is what makes that distinction expressible, and it is also the hole:
   * a page can bind nothing and say nothing, which is the state the control shipped
   * in. `purchase-inputs.test.tsx` proves the control WORKS; only a page-level test
   * proves it is REACHED, so `closing-costs/page.test.tsx` asserts the switch is in
   * the Halifax document. A component test cannot close this, because it supplies
   * the prop the product was missing.
   */
  residency?: Residency;
  jurisdiction: Jurisdiction;
  onChange: (patch: {
    price?: number | null;
    dpPct?: number;
    amortYears?: number;
    ptype?: PropertyType;
    ftb?: boolean;
    elsewhere?: boolean;
    residency?: Residency;
  }) => void;
}

const DP_CHOICES = [5, 10, 20, 25] as const;
const AMORT_CHOICES = [25, 30] as const;

export function PurchaseInputs({
  price,
  pricePlaceholder,
  dpPct,
  dpPctEffective,
  belowMinimum,
  amortYears,
  ptype,
  ftb,
  elsewhere,
  ftbEffective,
  ptypeEffective,
  residency,
  jurisdiction,
  onChange,
}: PurchaseInputsProps) {
  const t = useTranslations("Inputs");
  const tJur = useTranslations("Jurisdictions");
  const tProv = useTranslations("Provinces");
  const fmt = useMoney();
  const pct = usePercent();
  const rules = useRules();
  /**
   * null when there is no price to model at all — see `pricePlaceholder`.
   *
   * A ZERO placeholder is folded into that null rather than shown. Resolving a
   * jurisdiction with no published benchmark yields `price: 0`, so a caller that
   * hands its resolved price straight through — as one still does — would offer
   * "0" in the field as this city's suggested purchase price. Nothing is a
   * suggestion worth making at zero dollars, and a component that can tell has no
   * business waiting to be told.
   *
   * The reader's OWN zero is folded into it too, for the same reason and to keep this
   * in step with `resolveInputs`: `price` is nullable with `min: 0`, so 0 is typable,
   * and it is not a price there either. Without the fold the deposit line under the
   * field read "Down payment · $0" while the page above it modelled the benchmark.
   */
  const effectivePrice = (price || null) ?? (pricePlaceholder || null);

  /**
   * The longest amortization this borrower can actually get, from the domain
   * predicate rather than from a rule restated here.
   *
   * Read off the EFFECTIVE eligibility, never off the optional control props — see
   * `ftbEffective` above for the six-pages-two-answers defect that caused. Whether a
   * page renders a first-time-buyer switch is a fact about the page; whether this
   * reader is a first-time buyer is a fact about the reader, and only the second one
   * belongs in a rule.
   *
   * It gates, it does not clamp. `maxAmortYears`' own doc comment records why:
   * recomputing someone's input behind their back is how a screen comes to disagree
   * with the figure the reader is looking at. The amortization they chose is the one
   * the payment above is built on; the control marks the option they cannot have and
   * the note says what it would take to get it — the same gesture, in the same words,
   * as the Affordability screen's own amortization control.
   */
  const amortCap = maxAmortYears(rules, {
    dpPct: dpPctEffective,
    price: effectivePrice ?? 0,
    ftb: ftbEffective,
    ptype: ptypeEffective,
  });

  /**
   * Data-driven, not a province check: the control exists wherever a transfer
   * line is gated on residency, so a jurisdiction that grows one gets its
   * control for free and one that loses it stops asking a question nothing
   * consumes. Today that is Halifax alone — Ontario's NRST and BC's additional
   * property transfer tax are real and are NOT in the dataset, because neither
   * has had its primary source read. The note below says so rather than letting
   * the silence read as "no such tax here".
   */
  const residencyMatters = jurisdiction.transfer.some((line) => line.when?.residency);

  return (
    <fieldset className="flex flex-col gap-3 rounded-lg border border-border bg-card p-3">
      <legend className="micro px-1 text-ink3">{t("purchase")}</legend>

      <NumberField
        id="price"
        label={t("price")}
        value={price}
        placeholder={effectivePrice === null ? undefined : (pricePlaceholder ?? undefined)}
        min={0}
        onCommit={(next) => onChange({ price: next })}
      />
      {/*
        The ask, in place, on the field that answers it. Not a new disclosure
        gesture and not a banner: the app has exactly one gesture (DESIGN.md §1)
        and this is the same quiet note the benchmark hint always was, saying the
        one honest thing left to say when nobody publishes a price here.
      */}
      {effectivePrice === null ? (
        <NoteLine tight>{t("noPrice", { place: tJur(`at.${jurisdiction.id}`) })}</NoteLine>
      ) : null}

      <SegmentedGroup
        label={
          effectivePrice === null
            ? t("downPayment")
            : `${t("downPayment")} · ${fmt((effectivePrice * dpPctEffective) / 100)}`
        }
        value={dpPct}
        onChange={(next) => onChange({ dpPct: next })}
        options={DP_CHOICES.map((v) => ({ value: v, label: pct(v) }))}
      />
      {/* `belowMinimum` is false without a price — resolveInputs cannot raise a
          floor it has no price to compute — so this reads a real figure. */}
      {belowMinimum && effectivePrice !== null ? (
        <NoteLine tone="caution" tight>
          {t("belowMinimum", {
            p: pct(dpPctEffective, 1),
            a: fmt((effectivePrice * dpPctEffective) / 100),
          })}
        </NoteLine>
      ) : null}

      {amortYears !== undefined ? (
        <SegmentedGroup
          label={t("amortization")}
          value={amortYears}
          onChange={(next) => onChange({ amortYears: next })}
          options={AMORT_CHOICES.map((v) => ({
            value: v,
            label: t("years", { n: v }),
            disabled: v > amortCap,
          }))}
        />
      ) : null}
      {/*
        The eligibility rule the app has always held and never told anyone.
        `financing()` charges the CMHC long-amortization surcharge for a 30-year
        loan without asking whether the borrower may have one, and both federal
        maximums were read by no screen.

        It fires whenever an option is unavailable, not only when the reader is
        SITTING on one — the option above is struck through either way, and a struck
        option with nothing saying why is the dead end `SegmentedOption.disabled`
        explicitly leaves to the caller.

        Both arguments are federal rules, and both are `conf: "high"` with an `asOf`,
        which is what lets them travel: `maxAmortFtbInsured` is the amortization Home
        Start unlocks and `minDown.uninsuredRate` is the deposit above which no insured
        maximum binds at all. `maxAmortOther` — the 25 — is `conf: "medium"` and stays
        out of the sentence; the condition is stated qualitatively instead, and every
        term in it is one the reader can check.
      */}
      {amortYears !== undefined && amortCap < rules.maxAmortFtbInsured ? (
        <NoteLine tone="caution" tight>
          {t("amortCapped", {
            n: rules.maxAmortFtbInsured,
            p: pct(rules.minDown.uninsuredRate * 100),
          })}
        </NoteLine>
      ) : null}

      {ptype !== undefined ? (
        <SegmentedGroup
          label={t("propertyType")}
          value={ptype}
          onChange={(next) => onChange({ ptype: next })}
          options={[
            { value: "house" as const, label: t("house") },
            { value: "condo" as const, label: t("condo") },
            { value: "newbuild" as const, label: t("newbuild") },
          ]}
        />
      ) : null}

      {ftb !== undefined ? (
        <div className="flex items-center justify-between gap-3">
          <Label htmlFor="ftb" className="text-[13px]">
            {t("ftb")}
          </Label>
          <Switch id="ftb" checked={ftb} onCheckedChange={(next) => onChange({ ftb: next })} />
        </div>
      ) : null}

      {/* Only Ontario stacks a municipal land transfer tax, and only in Toronto. */}
      {elsewhere !== undefined && jurisdiction.prov === "ON" ? (
        <div className="flex flex-col gap-1 border-t border-hairline pt-3">
          <div className="flex items-center justify-between gap-3">
            {/*
              `elsewhereIn` is a sentence FRAGMENT — "Somewhere else in" — and it
              rendered here with nothing after it while input-groups.tsx rendered
              the same key correctly with the province appended. All four locales
              carry the fragment, so the fix is the concatenation, not the copy.

              The bare concatenation is safe only while this is gated to Ontario:
              «Онтаріо» is indeclinable in Ukrainian and the locative it would
              otherwise need never surfaces. A SECOND qualifying province forces
              `t("elsewhereIn", { prov })` with a per-locale locative form —
              exactly the split `Jurisdictions.at.<id>` already exists to carry.
            */}
            <Label htmlFor="elsewhere" className="text-[13px]">
              {t("elsewhereIn")} {tProv(jurisdiction.prov)}
            </Label>
            <Switch
              id="elsewhere"
              checked={elsewhere}
              onCheckedChange={(next) => onChange({ elsewhere: next })}
            />
          </div>
          <NoteLine>{t("elsewhereWhy")}</NoteLine>
        </div>
      ) : null}

      {residency !== undefined && residencyMatters ? (
        <div className="flex flex-col gap-1 border-t border-hairline pt-3">
          <div className="flex items-center justify-between gap-3">
            {/*
              The switch asserts residency, so ON is "resident" — the same
              direction as `ftb`, where on means the reader qualifies. The label
              carries no province name on purpose: what Nova Scotia's tax tests
              is whether you live in THIS province, and interpolating the name
              would need a locative in Ukrainian for a string that says nothing
              extra in any language.

              The label is a self-description, so it must not be gendered, and
              two catalogues were: fr "Résident" and uk «Мешканець» are masculine
              forms of a noun the reader applies to themselves. Both moved to the
              verb — "Je réside dans cette province", «Проживаю в цій провінції» —
              which carries no gender in either language. en and es keep the noun
              phrase because "Resident" and "Residente" are already epicene; a
              shape shared across four locales is worth less than four idiomatic
              labels, and this is the same reason `Jurisdictions.at.<id>` is a
              table rather than a rule.

              `provResidentWhy` names a COUNT of provinces ("two other provinces
              charge a tax on non-resident or foreign buyers") and a review read
              that as a figure typed into copy. It is not one: the sourcing rule
              governs quantities out of `src/domain`, and this is the qualitative,
              checkable class the home page's FAQ rule explicitly permits — which
              rules exist and who levies them. There is nothing in `src/domain` to
              bind it to, precisely because neither tax is modelled; saying so is
              the whole point of the sentence.
            */}
            <Label htmlFor="residency" className="text-[13px]">
              {t("provResident")}
            </Label>
            <Switch
              id="residency"
              checked={residency === "resident"}
              onCheckedChange={(next) => onChange({ residency: next ? "resident" : "nonResident" })}
            />
          </div>
          <NoteLine>{t("provResidentWhy")}</NoteLine>
          {/*
            Purchase eligibility sits BEFORE every number this app computes, and
            until now the product had no word for it: "permanent", "foreign",
            "work permit", "immigrat" and "abroad" appeared nowhere in any
            catalogue. Deliberately carries no date and no figure — the federal
            Act is time-limited and extended by regulation, so a date here would
            be both a maintenance liability and a number with no provenance
            entry. The same answer is on the home page's FAQ, where it reaches
            every reader rather than only the ones in a jurisdiction whose
            dataset happens to carry a residency-gated line.
          */}
          <NoteLine>{t("buyerEligibility")}</NoteLine>
        </div>
      ) : null}
    </fieldset>
  );
}
