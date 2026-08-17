import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { JurisdictionProvider, useJurisdiction } from "./use-jurisdiction";

describe("useJurisdiction", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to winnipeg", () => {
    const { result } = renderHook(() => useJurisdiction(), { wrapper: JurisdictionProvider });
    expect(result.current[0].jurId).toBe("winnipeg");
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
    const { result } = renderHook(() => useTwoConsumers(), { wrapper: JurisdictionProvider });
    act(() => result.current.a[1]({ jurId: "toronto" }));
    await waitFor(() => expect(result.current.b[0].jurId).toBe("toronto"));
  });
});
