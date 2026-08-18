import { afterEach, describe, expect, it, beforeEach, vi } from "vitest";
import { cleanup, screen, act } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { federal } from "@/domain/federal";
import { getJurisdiction } from "@/domain/jurisdictions";
import { affordability, money } from "@/domain/engine";
import { JurisdictionPicker } from "@/components/jurisdiction-picker";
import AffordabilityPage from "./page";
import { AFFORDABILITY_DEFAULTS } from "@/lib/shared-inputs";

/**
 * The hydration effect in `useSharedState` reads localStorage synchronously and calls its state
 * setters in the same tick, with no `await` boundary — so in this test stack (React 19 + RTL 16 +
 * jsdom), the busy-to-settled transition completes before `render()` (or even a raw
 * `createRoot().render()` outside `act()`, confirmed by spiking it) ever returns control to the
 * test. There is no tick at which the DOM can be observed mid-hydration by any means that leaves
 * `useSharedState` itself untouched — including mocking `readBlob` to return a controlled Promise,
 * also confirmed by spiking it: `readStore` never awaits its return value, so a Promise there is
 * just inert data, not a deferral point.
 *
 * So this mocks the HOOK, not the storage module: it always calls the real `useSharedState` (so
 * every call site — including JurisdictionProvider's own `useSharedState(JURISDICTION_KEYS, ...)`
 * — keeps its real state and persistence behavior unchanged), then unconditionally runs a second
 * hook that OVERRIDES only the exposed `hydrated` boolean, and only for the specific
 * `AFFORDABILITY_KEYS` call (by reference), holding it false until the test explicitly releases a
 * controlled Promise. Both hooks are called on every render regardless of branch, so which code
 * path runs is a plain value inside the hook body — not a conditional hook call — satisfying
 * react-hooks/rules-of-hooks. This reintroduces a genuine, controllable async boundary for the
 * exposed flag, so the test can assert on `AffordabilityPage`'s own rendered DOM — not a decoupled
 * probe — both while genuinely suspended and after release.
 */
const hydrationGate: { armed: boolean; release: (() => void) | null } = {
  armed: false,
  release: null,
};

vi.mock("@/hooks/use-shared-state", async (importOriginal) => {
  const React = await import("react");
  const actual = await importOriginal<typeof import("@/hooks/use-shared-state")>();
  const { AFFORDABILITY_KEYS } = await import("@/lib/shared-inputs");

  function useHydrationGateOverride(allowlist: readonly string[], realHydrated: boolean): boolean {
    const [gatedHydrated, setGatedHydrated] = React.useState(false);
    const isGated = hydrationGate.armed && allowlist === AFFORDABILITY_KEYS;

    React.useEffect(() => {
      if (!isGated) return;
      let cancelled = false;
      const gate = new Promise<void>((resolve) => {
        hydrationGate.release = resolve;
      });
      gate.then(() => {
        if (!cancelled) setGatedHydrated(true);
      });
      return () => {
        cancelled = true;
      };
    }, [allowlist, isGated]);

    return isGated ? gatedHydrated : realHydrated;
  }

  return {
    ...actual,
    useSharedState: (allowlist: readonly string[], defaults: Record<string, unknown>) => {
      const [state, update, realHydrated] = actual.useSharedState(allowlist, defaults);
      const hydrated = useHydrationGateOverride(allowlist, realHydrated);
      return [state, update, hydrated];
    },
  };
});

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
    expect(screen.getByLabelText("Your annual income")).toHaveValue(70000);
    expect(screen.getByLabelText("Purchase price you're considering")).toHaveValue(450000);
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
    const expected = affordability(winnipeg, federal, AFFORDABILITY_DEFAULTS);

    expect(await screen.findByText(money(expected.ceiling, "en-CA", false))).toBeInTheDocument();
    expect(screen.getByText(money(expected.comfort, "en-CA", false))).toBeInTheDocument();
  });

  it("shows a passing approval badge when the price is within the lender ceiling", async () => {
    renderPage();
    const winnipeg = getJurisdiction("winnipeg")!;
    const expected = affordability(winnipeg, federal, AFFORDABILITY_DEFAULTS);
    expect(expected.approvalPass).toBe(true); // sanity check on the fixture itself
    expect(await screen.findByText("Within reach at this price")).toBeInTheDocument();
  });

  it("recomputes the ceiling when an income field changes", async () => {
    const user = userEvent.setup();
    renderPage();
    const winnipeg = getJurisdiction("winnipeg")!;
    const before = affordability(winnipeg, federal, AFFORDABILITY_DEFAULTS);

    const income1Input = screen.getByLabelText("Your annual income");
    await user.clear(income1Input);
    await user.type(income1Input, "120000");

    const after = affordability(winnipeg, federal, { ...AFFORDABILITY_DEFAULTS, income1: 120000 });
    expect(after.ceiling).toBeGreaterThan(before.ceiling);
    expect(await screen.findByText(money(after.ceiling, "en-CA", false))).toBeInTheDocument();
  });

  it("renders the monthly breakdown total equal to the sum of its own line items", async () => {
    renderPage();
    const winnipeg = getJurisdiction("winnipeg")!;
    const expected = affordability(winnipeg, federal, AFFORDABILITY_DEFAULTS);
    expect(await screen.findByText(money(expected.monthly.total, "en-CA", false))).toBeInTheDocument();
    expect(screen.getByText(money(expected.monthly.pi, "en-CA", false))).toBeInTheDocument();
  });

  it("recomputes the numbers when the jurisdiction is switched in the header picker", async () => {
    const user = userEvent.setup();
    renderPageWithPicker();
    const winnipeg = getJurisdiction("winnipeg")!;
    const toronto = getJurisdiction("toronto")!;
    const winnipegResult = affordability(winnipeg, federal, AFFORDABILITY_DEFAULTS);
    const torontoResult = affordability(toronto, federal, AFFORDABILITY_DEFAULTS);

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
    const expected = affordability(winnipeg, federal, AFFORDABILITY_DEFAULTS);

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

describe("Affordability page — HTML validity during hydration", () => {
  afterEach(() => {
    hydrationGate.release?.();
    hydrationGate.armed = false;
    hydrationGate.release = null;
    cleanup();
  });

  // jsdom does not enforce content-model rules, so 129 passing tests still shipped a <div>
  // (shadcn's Skeleton) inside <p> and <span>. A real browser's parser hoists that div out of the
  // paragraph, so the server tree and the client tree disagree and React logs a hydration error on
  // every single page load. This asserts the rule jsdom will not.
  it("never nests a block element inside phrasing content while busy", () => {
    // MUST arm the gate: without it hydration settles inside act() before any query runs, no
    // skeleton is ever in the DOM, and this test passes against the very markup it exists to
    // reject. Verified by running it against the pre-fix page — armed it fails, unarmed it does not.
    hydrationGate.armed = true;
    renderPage();
    for (const parent of Array.from(document.querySelectorAll("p, span"))) {
      const block = parent.querySelector("div, p");
      expect(
        block,
        `<${block?.tagName.toLowerCase()}> inside <${parent.tagName.toLowerCase()}> is invalid HTML `
          + `and causes a hydration error in a real browser`,
      ).toBeNull();
    }
  });
});

describe("Affordability page — hydration", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
    hydrationGate.armed = false;
    hydrationGate.release = null;
  });

  it("holds the computed panels behind a visible skeleton until stored inputs have loaded, then shows the real figures", async () => {
    window.localStorage.setItem("norma.inputs.v1", JSON.stringify({ price: 999000 }));
    hydrationGate.armed = true;

    renderPage();

    const winnipeg = getJurisdiction("winnipeg")!;
    // The mock only delays the exposed `hydrated` flag — the real hook underneath still merges
    // the stored price into `form` on its own normal (synchronous) schedule. So the engine result
    // the page computes is already `settled` throughout; what must differ before/after release is
    // purely whether that result is showing (via `figure()`/aria-busy) or held behind a Skeleton.
    const settled = affordability(winnipeg, federal, { ...AFFORDABILITY_DEFAULTS, price: 999000 });

    const ceilingPanel = screen.getByTestId("ceiling-panel");
    const comfortPanel = screen.getByTestId("comfort-panel");
    const monthlyPanel = screen.getByTestId("monthly-panel");

    // Genuinely busy — the gate is unreleased, so this reads AffordabilityPage's own aria-busy
    // and Skeleton wiring, not a decoupled probe's.
    for (const panel of [ceilingPanel, comfortPanel, monthlyPanel]) {
      expect(panel).toHaveAttribute("aria-busy", "true");
      expect(panel.querySelector('[data-slot="skeleton"]')).toBeInTheDocument();
    }
    // Catches a dropped figure() wrap: no settled figure may appear anywhere while busy,
    // including a single un-gated monthly row.
    expect(screen.queryByText(money(settled.ceiling, "en-CA", false))).not.toBeInTheDocument();
    expect(screen.queryByText(money(settled.comfort, "en-CA", false))).not.toBeInTheDocument();
    // Loops over every monthly row, not just pi/total: if figure() were dropped from a single row
    // (e.g. propTax), the other rows would still render skeletons and a two-row check would miss it.
    for (const row of [
      "pi",
      "propTax",
      "insurance",
      "utilities",
      "condoFee",
      "maintenance",
      "total",
    ] as const) {
      expect(screen.queryByText(money(settled.monthly[row], "en-CA", false))).not.toBeInTheDocument();
    }
    // Catches an inverted pass/fail ternary: neither the ceiling nor the comfort verdict line may
    // render its text while busy — it must be a Skeleton in that slot too.
    expect(screen.queryByText("Within reach at this price")).not.toBeInTheDocument();
    expect(screen.queryByText("Above what a lender would approve")).not.toBeInTheDocument();
    expect(screen.queryByText("Fits your monthly budget")).not.toBeInTheDocument();
    expect(screen.queryByText("Over your monthly budget")).not.toBeInTheDocument();

    await act(async () => {
      hydrationGate.release?.();
      await Promise.resolve();
    });

    for (const panel of [ceilingPanel, comfortPanel, monthlyPanel]) {
      expect(panel).toHaveAttribute("aria-busy", "false");
      expect(panel.querySelector('[data-slot="skeleton"]')).not.toBeInTheDocument();
    }
    expect(screen.getByText(money(settled.ceiling, "en-CA", false))).toBeInTheDocument();
    expect(screen.getByText(money(settled.comfort, "en-CA", false))).toBeInTheDocument();
    expect(screen.getByText(money(settled.monthly.total, "en-CA", false))).toBeInTheDocument();
    expect(
      screen.getByText(settled.approvalPass ? "Within reach at this price" : "Above what a lender would approve"),
    ).toBeInTheDocument();
  });

  it("renders input controls immediately, without waiting for hydration", () => {
    renderPage();
    // The price field is usable on first paint; only derived figures wait.
    expect(screen.getByLabelText("Purchase price you're considering")).toBeInTheDocument();
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
