import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import type { ReactNode } from "react";
import { JurisdictionProvider, useJurisdiction, pickJurisdiction } from "./use-jurisdiction";
import { STORE_KEY_V2 } from "@/lib/storage";
import { getJurisdiction, defaultJurisdictionOf } from "@/domain/jurisdictions";
import { regionOf } from "@/domain/types";
import { CATALOGUES } from "@/test/catalogues";

/**
 * `JurisdictionProvider` reads the current country off the URL via `useCountry()`
 * (`useLocale()` underneath), so it needs an intl context exactly as any other client
 * component that resolves rules does — see `src/test/render-with-intl.tsx`, which
 * `renderHook`'s `wrapper` option cannot reuse directly because it wraps ELEMENTS, not hook
 * calls.
 */
function wrapper({ children }: { children: ReactNode }) {
  return (
    <NextIntlClientProvider locale="en-CA" messages={CATALOGUES.en}>
      <JurisdictionProvider>{children}</JurisdictionProvider>
    </NextIntlClientProvider>
  );
}

describe("useJurisdiction", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to winnipeg", () => {
    const { result } = renderHook(() => useJurisdiction(), { wrapper });
    expect(result.current[0].id).toBe("winnipeg");
  });

  it("throws when used outside a JurisdictionProvider", () => {
    expect(() => renderHook(() => useJurisdiction())).toThrow(
      "useJurisdiction must be used within a JurisdictionProvider",
    );
  });

  it("shares one live value between two consumers under the same provider", async () => {
    function useTwoConsumers() {
      const a = useJurisdiction();
      const b = useJurisdiction();
      return { a, b };
    }
    const { result } = renderHook(() => useTwoConsumers(), { wrapper });
    act(() => result.current.a[1]("toronto"));
    await waitFor(() => expect(result.current.b[0].id).toBe("toronto"));
  });

  it("exposes the resolved Jurisdiction record, not just its id", async () => {
    const { result } = renderHook(() => useJurisdiction(), { wrapper });
    act(() => result.current[1]("toronto"));
    await waitFor(() => expect(regionOf(result.current[0])).toBe("ON"));
  });

  it("resolves an unknown stored id to the default jurisdiction", async () => {
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ jurId: "atlantis" }));
    const { result } = renderHook(() => useJurisdiction(), { wrapper });
    await waitFor(() => expect(result.current[0].id).toBe("winnipeg"));
  });
});

/**
 * The cross-country half of the fallback rule, tested against `pickJurisdiction` directly
 * rather than through the provider. `houston` is a genuine second-country record now (the
 * country seam's step 4) — no more fabricated record needed to exercise the "wrong country"
 * branch.
 */
describe("pickJurisdiction — the cross-country fallback", () => {
  it("keeps a stored jurisdiction that belongs to the current country", () => {
    const toronto = getJurisdiction("toronto")!;
    expect(pickJurisdiction(toronto, "ca")).toBe(toronto);
  });

  it("falls back to the country's default when the stored jurisdiction belongs to another country", () => {
    const houston = getJurisdiction("houston")!;
    expect(pickJurisdiction(houston, "ca")).toBe(defaultJurisdictionOf("ca"));
  });

  it("falls back to the country's default when nothing resolved at all", () => {
    expect(pickJurisdiction(undefined, "ca")).toBe(defaultJurisdictionOf("ca"));
  });
});
