import { describe, expect, it, vi, afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { getJurisdiction } from "@/domain/jurisdictions";
import { ca } from "@/domain/rules/ca";
import type { Jurisdiction } from "@/domain/types";
import { CATALOGUES } from "@/test/catalogues";
import { PurchaseInputs } from "./purchase-inputs";
import en from "../../messages/en.json";

const toronto = getJurisdiction("toronto") as Jurisdiction;
const halifax = getJurisdiction("halifax") as Jurisdiction;

/**
 * The props every case shares; each test overrides only what it is about.
 *
 * `ftbEffective` and `ptypeEffective` are the app's state, not the page's controls,
 * so they are here rather than in the cases that render a control — which is the whole
 * point of the split. They default to the shipped defaults (`ftb: true`, a resale
 * house), so a case about eligibility has to say so.
 */
function base(jurisdiction: Jurisdiction) {
  return {
    price: null,
    pricePlaceholder: 600000,
    dpPct: 10,
    dpPctEffective: 10,
    belowMinimum: false,
    ftbEffective: true,
    ptypeEffective: "house" as const,
    jurisdiction,
  } as const;
}

describe("the Toronto toggle", () => {
  afterEach(() => cleanup());

  it("names the province the toggle moves you to, rather than ending mid-sentence", () => {
    // `Inputs.elsewhereIn` is the fragment "Somewhere else in" in all four
    // catalogues. input-groups.tsx always appended the province; this component
    // rendered the fragment alone, so /closing-costs, /down-payment and
    // /scenarios each shipped a switch labelled with half a sentence.
    const { container } = renderWithIntl(
      <PurchaseInputs {...base(toronto)} elsewhere={false} onChange={() => {}} />,
    );
    const label = container.querySelector('label[for="elsewhere"]');
    expect(label?.textContent).toBe(`${en.Inputs.elsewhereIn} ${en.Provinces.ON}`);
  });

  it("is absent where no municipal land transfer tax stacks", () => {
    const { container } = renderWithIntl(
      <PurchaseInputs {...base(halifax)} elsewhere={false} onChange={() => {}} />,
    );
    expect(container.querySelector("#elsewhere")).toBeNull();
  });
});

describe("the residency control", () => {
  afterEach(() => cleanup());

  it("appears where a transfer line is gated on residency", () => {
    // Halifax's li_deedProvNonRes is 10% — the largest single charge in the
    // dataset — and no component anywhere wrote `residency`, so it could never
    // fire. The gate reads the jurisdiction's own data rather than naming Nova
    // Scotia, so a jurisdiction that grows such a line gets the control free.
    expect(halifax.transfer.some((line) => line.when?.residency)).toBe(true);
    const { container } = renderWithIntl(
      <PurchaseInputs {...base(halifax)} residency="resident" onChange={() => {}} />,
    );
    expect(container.querySelector("#residency")).not.toBeNull();
  });

  it("is absent where residency changes no charge", () => {
    // Not because Toronto has no foreign-buyer tax — Ontario's NRST is real and
    // unmodelled — but because asking a question nothing consumes is how the
    // reader learns the app's answers do not depend on its questions.
    expect(toronto.transfer.some((line) => line.when?.residency)).toBe(false);
    const { container } = renderWithIntl(
      <PurchaseInputs {...base(toronto)} residency="resident" onChange={() => {}} />,
    );
    expect(container.querySelector("#residency")).toBeNull();
  });

  it("is absent when the page does not bind it, rather than showing a switch that lies", () => {
    // Optionality is the CONTRACT — /amortization prices no closing bill and binds
    // nothing — and it is deliberately NOT evidence that the product asks the
    // question. This test supplies the prop the product was missing, so it cannot
    // see whether any page passes it. `closing-costs/page.test.tsx` is what does.
    const { container } = renderWithIntl(
      <PurchaseInputs {...base(halifax)} onChange={() => {}} />,
    );
    expect(container.querySelector("#residency")).toBeNull();
  });

  it("writes nonResident when switched off, and back again", async () => {
    const onChange = vi.fn();
    const { container } = renderWithIntl(
      <PurchaseInputs {...base(halifax)} residency="resident" onChange={onChange} />,
    );
    const control = container.querySelector("#residency") as HTMLElement;
    // ON means the reader asserts residency, the same direction as `ftb`.
    expect(control.getAttribute("data-state")).toBe("checked");
    await userEvent.click(control);
    expect(onChange).toHaveBeenCalledWith({ residency: "nonResident" });

    cleanup();
    const second = renderWithIntl(
      <PurchaseInputs {...base(halifax)} residency="nonResident" onChange={onChange} />,
    );
    const off = second.container.querySelector("#residency") as HTMLElement;
    expect(off.getAttribute("data-state")).toBe("unchecked");
    await userEvent.click(off);
    expect(onChange).toHaveBeenLastCalledWith({ residency: "resident" });
  });

  it("says what a reader must check before any of the numbers matter", () => {
    // Purchase eligibility sits before every figure this app computes, and the
    // federal Act restricting purchases by non-Canadians appeared nowhere in the
    // product. It must stay qualitative: the Act is time-limited and extended by
    // regulation, so a date would be an unsourced figure with a silent expiry.
    for (const [locale, messages] of Object.entries(CATALOGUES)) {
      const copy = (messages as unknown as { Inputs: Record<string, string> }).Inputs
        .buyerEligibility;
      expect(copy, `${locale} Inputs.buyerEligibility`).toBeTruthy();
      expect(copy, `${locale} carries a date or a figure`).not.toMatch(/\d/);
    }
  });
});

describe("the 30-year amortization", () => {
  afterEach(() => cleanup());

  /**
   * Counting caution notes rather than matching their words: the copy is one key
   * away in four catalogues, and `belowMinimum` is the only other caution this
   * component can emit — held false by every case here, so a caution present is
   * this caution.
   */
  function cautions(container: HTMLElement) {
    return container.querySelectorAll('[data-slot="note"].text-caution');
  }

  it("cautions when the reader has established no ground for it", () => {
    const { container } = renderWithIntl(
      <PurchaseInputs
        {...base(toronto)}
        amortYears={30}
        ptype="house"
        ftb={false}
        ftbEffective={false}
        onChange={() => {}}
      />,
    );
    expect(cautions(container)).toHaveLength(1);
  });

  it("stays quiet for a first-time buyer", () => {
    const { container } = renderWithIntl(
      <PurchaseInputs
        {...base(toronto)}
        amortYears={30}
        ptype="house"
        ftb={true}
        onChange={() => {}}
      />,
    );
    expect(cautions(container)).toHaveLength(0);
  });

  it("stays quiet on a new build, whoever is buying it", () => {
    // CMHC Home Start is first-time buyer OR new build. Dropping the second half
    // denies a 30-year amortization to a repeat buyer who is entitled to one.
    const { container } = renderWithIntl(
      <PurchaseInputs
        {...base(toronto)}
        amortYears={30}
        ptype="newbuild"
        ptypeEffective="newbuild"
        ftb={false}
        ftbEffective={false}
        onChange={() => {}}
      />,
    );
    expect(cautions(container)).toHaveLength(0);
  });

  it("stays quiet on an uninsured loan, where no insured maximum binds", () => {
    const { container } = renderWithIntl(
      <PurchaseInputs
        {...base(toronto)}
        dpPct={20}
        dpPctEffective={20}
        amortYears={30}
        ptype="house"
        ftb={false}
        ftbEffective={false}
        onChange={() => {}}
      />,
    );
    expect(cautions(container)).toHaveLength(0);
  });

  it("stays quiet above the insured cap, where insurance is unavailable at all", () => {
    const { container } = renderWithIntl(
      <PurchaseInputs
        {...base(toronto)}
        pricePlaceholder={ca.cmhc.insuredCap}
        amortYears={30}
        ptype="house"
        ftb={false}
        ftbEffective={false}
        onChange={() => {}}
      />,
    );
    expect(cautions(container)).toHaveLength(0);
  });

  it("still cautions at 25 years, because the 30-year option is struck out beside it", () => {
    // The note explains the UNAVAILABLE OPTION, not the reader's current selection.
    // Firing it only on `amortYears > cap` left the struck-through 30 with nothing
    // saying why — the dead end `SegmentedOption.disabled` explicitly leaves to the
    // caller — and it disagreed with /affordability, which has always fired here.
    const { container } = renderWithIntl(
      <PurchaseInputs
        {...base(toronto)}
        amortYears={25}
        ptype="house"
        ftb={false}
        ftbEffective={false}
        onChange={() => {}}
      />,
    );
    expect(cautions(container)).toHaveLength(1);
    const options = container.querySelectorAll('[role="radio"][aria-disabled="true"]');
    expect(options).toHaveLength(1);
    expect(options[0].textContent).toBe(en.Inputs.years.replace("{n}", "30"));
  });

  it("reads eligibility off app state, not off which controls the page happens to render", () => {
    // /amortization and /rent-vs-buy bind neither `ftb` nor `ptype`, and reading the
    // cap off those props fell to `ftb: false` — so the DEFAULT reader, a first-time
    // buyer, was cautioned on two pages and not on the other four, in one stored
    // state. Whether a page renders a switch is a fact about the page.
    const { container } = renderWithIntl(
      <PurchaseInputs {...base(toronto)} amortYears={30} onChange={() => {}} />,
    );
    expect(container.querySelector("#ftb")).toBeNull();
    expect(cautions(container)).toHaveLength(0);
  });

  it("names the condition without typing a single rule figure into the copy", () => {
    // `maxAmortOther` is conf "medium" and its own note scopes it to INSURED loans —
    // 30- and even 35-year uninsured amortizations exist at lender discretion — so
    // "25 years" may not travel as a rule at all.
    //
    // The other two figures MAY travel, and so they must travel from `src/domain`:
    // `maxAmortFtbInsured` and `minDown.uninsuredRate` are both conf "high" with an
    // `asOf`. All four catalogues typed the second as literal "20%" — four copies of
    // one federal rule that nothing could keep in step with `federal.ts`, in the same
    // branch that deleted `MIN_DOWN_TIER` from a page for exactly that reason.
    for (const [locale, messages] of Object.entries(CATALOGUES)) {
      const copy = (messages as unknown as { Inputs: Record<string, string> }).Inputs.amortCapped;
      expect(copy, `${locale} Inputs.amortCapped`).toBeTruthy();
      expect(copy, locale).toContain("{n}");
      expect(copy, locale).toContain("{p}");
      const body = copy.replace(/\{[np]\}/g, "");
      expect(body, `${locale} states 25 as the law`).not.toMatch(/\b25\b/);
      expect(body, `${locale} types the uninsured threshold`).not.toMatch(/\b20\b/);
      expect(body, `${locale} types the long amortization`).not.toMatch(/\b30\b/);
    }
  });
});
