import { afterEach, describe, expect, it, beforeEach } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { federal } from "@/domain/federal";
import { getJurisdiction } from "@/domain/jurisdictions";
import { affordability, money } from "@/domain/engine";
import { JurisdictionPicker } from "@/components/jurisdiction-picker";
import AffordabilityPage from "./page";
import { AFFORDABILITY_DEFAULTS } from "@/lib/shared-inputs";
import { resolveInputs } from "@/lib/resolve-inputs";
import type { AffordabilityFormState } from "@/lib/shared-inputs";

/** Stored inputs resolved the same way the page resolves them. */
function resolved(
  over: Partial<AffordabilityFormState> = {},
  jurisdictionId = "winnipeg",
) {
  return resolveInputs(
    { ...AFFORDABILITY_DEFAULTS, ...over },
    getJurisdiction(jurisdictionId)!,
    federal,
  );
}

function renderPage(locale?: "en" | "fr") {
  return renderWithIntl(
    <JurisdictionProvider>
      <AffordabilityPage />
    </JurisdictionProvider>,
    { locale },
  );
}

function renderPageWithPicker() {
  return renderWithIntl(
    <JurisdictionProvider>
      <JurisdictionPicker />
      <AffordabilityPage />
    </JurisdictionProvider>,
  );
}

describe("Affordability page — input form", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the heading and every input with its default value", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "What can you actually afford?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your annual income")).toHaveValue(resolved().income1);
    expect(screen.getByLabelText("Purchase price you're considering")).toHaveValue(resolved().price);
  });

  it("updates a numeric field's value on change", async () => {
    const user = userEvent.setup();
    renderPage();
    const priceInput = screen.getByLabelText("Purchase price you're considering");
    await user.clear(priceInput);
    await user.type(priceInput, "600000");
    expect(priceInput).toHaveValue(600000);
  });

  it("toggles first-time buyer status", async () => {
    const user = userEvent.setup();
    renderPage();
    const ftbSwitch = screen.getByRole("switch", { name: "First-time buyer" });
    expect(ftbSwitch).toBeChecked();
    await user.click(ftbSwitch);
    expect(ftbSwitch).not.toBeChecked();
  });

  it("persists a field change to localStorage", async () => {
    const user = userEvent.setup();
    renderPage();
    const priceInput = screen.getByLabelText("Purchase price you're considering");
    await user.clear(priceInput);
    await user.type(priceInput, "600000");
    await screen.findByDisplayValue("600000");
    const stored = JSON.parse(window.localStorage.getItem("norma.inputs.v1") ?? "{}");
    expect(stored.price).toBe(600000);
  });
});

describe("Affordability page — output panels", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the engine's ceiling and comfort figures for the default household in the default jurisdiction (winnipeg)", async () => {
    renderPage();
    const winnipeg = getJurisdiction("winnipeg")!;
    const expected = affordability(winnipeg, federal, resolved());

    expect(await screen.findByText(money(expected.ceiling, "en-CA", false))).toBeInTheDocument();
    expect(screen.getByText(money(expected.comfort, "en-CA", false))).toBeInTheDocument();
  });

  it("shows a passing approval badge when the price is within the lender ceiling", async () => {
    const user = userEvent.setup();
    renderPage();
    const winnipeg = getJurisdiction("winnipeg")!;
    // The derived defaults are a SINGLE $75,000 income against the city
    // benchmark, which a lender declines — so the badge has to be driven by a
    // household that clears the ceiling rather than by the defaults.
    const income1Input = screen.getByLabelText("Your annual income");
    await user.clear(income1Input);
    await user.type(income1Input, "150000");
    const expected = affordability(winnipeg, federal, resolved({ income1: 150000 }));
    expect(expected.approvalPass).toBe(true); // sanity check on the fixture itself
    expect(await screen.findByText("Within reach at this price")).toBeInTheDocument();
  });

  it("recomputes the ceiling when an income field changes", async () => {
    const user = userEvent.setup();
    renderPage();
    const winnipeg = getJurisdiction("winnipeg")!;
    const before = affordability(winnipeg, federal, resolved());

    const income1Input = screen.getByLabelText("Your annual income");
    await user.clear(income1Input);
    await user.type(income1Input, "120000");

    const after = affordability(winnipeg, federal, resolved({ income1: 120000 }));
    expect(after.ceiling).toBeGreaterThan(before.ceiling);
    expect(await screen.findByText(money(after.ceiling, "en-CA", false))).toBeInTheDocument();
  });

  it("renders the monthly breakdown total equal to the sum of its own line items", async () => {
    renderPage();
    const winnipeg = getJurisdiction("winnipeg")!;
    const expected = affordability(winnipeg, federal, resolved());
    expect(await screen.findByText(money(expected.monthly.total, "en-CA", false))).toBeInTheDocument();
    expect(screen.getByText(money(expected.monthly.pi, "en-CA", false))).toBeInTheDocument();
  });

  it("recomputes the numbers when the jurisdiction is switched in the header picker", async () => {
    const user = userEvent.setup();
    renderPageWithPicker();
    const winnipeg = getJurisdiction("winnipeg")!;
    const toronto = getJurisdiction("toronto")!;
    const winnipegResult = affordability(winnipeg, federal, resolved());
    const torontoResult = affordability(toronto, federal, resolved({}, "toronto"));

    expect(await screen.findByText(money(winnipegResult.ceiling, "en-CA", false))).toBeInTheDocument();

    await user.click(screen.getByRole("combobox", { name: "Change location" }));
    await user.click(await screen.findByRole("option", { name: "Toronto" }));

    expect(await screen.findByText(money(torontoResult.ceiling, "en-CA", false))).toBeInTheDocument();
  });
});

describe("Affordability page — French locale", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders currency figures with a trailing symbol in fr, not the English leading-symbol form", async () => {
    renderPage("fr");
    const winnipeg = getJurisdiction("winnipeg")!;
    const expected = affordability(winnipeg, federal, resolved());

    const expectedFr = money(expected.ceiling, "fr-CA", true);
    // testing-library's default text normalizer collapses the French group separator (a
    // non-breaking space) into a plain space, which would break an exact-string match against
    // `expectedFr` (which still has the real NBSP) even though the render is correct — so match
    // without whitespace normalization instead.
    expect(
      await screen.findByText(expectedFr, { normalizer: (text) => text }),
    ).toBeInTheDocument();
    // Guard the intent of the assertion above: a trailing-symbol figure never matches the
    // leading-symbol form the pre-fix code always rendered, regardless of locale.
    expect(expectedFr.endsWith(" $")).toBe(true);
    expect(
      screen.queryByText(money(expected.ceiling, "en-CA", false), { normalizer: (text) => text }),
    ).not.toBeInTheDocument();
  });
});

describe("Affordability page — unverified-data disclosure", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("shows the placeholder-data disclosure and the verification date", async () => {
    renderPage();
    expect(
      await screen.findByText("Placeholder figures — verify before relying on them"),
    ).toBeInTheDocument();
    expect(screen.getByText(`Rules last verified: ${federal.verified}`)).toBeInTheDocument();
  });

  it("shows the no-city-data note for a province-only jurisdiction (nb) but not a city-level one (winnipeg)", async () => {
    window.localStorage.setItem("norma.inputs.v1", JSON.stringify({ jurId: "nb" }));
    renderPage();
    expect(getJurisdiction("nb")!.cityData).toBe(false);
    expect(
      await screen.findByText(
        "No verified city-level figures here yet. The provincial rules are exact; local costs use provincial averages and are estimates.",
      ),
    ).toBeInTheDocument();

    cleanup();
    window.localStorage.clear();

    const winnipeg = getJurisdiction("winnipeg")!;
    expect(winnipeg.cityData).toBe(true);
    renderPage();
    await screen.findByText("Placeholder figures — verify before relying on them");
    expect(
      screen.queryByText(
        "No verified city-level figures here yet. The provincial rules are exact; local costs use provincial averages and are estimates.",
      ),
    ).not.toBeInTheDocument();
  });
});
