import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { JurisdictionProvider, useJurisdiction } from "./use-jurisdiction";

describe("useJurisdiction", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("defaults to winnipeg", () => {
    const { result } = renderHook(() => useJurisdiction(), { wrapper: JurisdictionProvider });
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
    const { result } = renderHook(() => useTwoConsumers(), { wrapper: JurisdictionProvider });
    act(() => result.current.a[1]("toronto"));
    await waitFor(() => expect(result.current.b[0].id).toBe("toronto"));
  });

  it("exposes the resolved Jurisdiction record, not just its id", async () => {
    const { result } = renderHook(() => useJurisdiction(), { wrapper: JurisdictionProvider });
    act(() => result.current[1]("toronto"));
    await waitFor(() => expect(result.current[0].prov).toBe("ON"));
  });

  it("resolves an unknown stored id to the default jurisdiction", async () => {
    window.localStorage.setItem("norma.inputs.v1", JSON.stringify({ jurId: "atlantis" }));
    const { result } = renderHook(() => useJurisdiction(), { wrapper: JurisdictionProvider });
    await waitFor(() => expect(result.current[0].id).toBe("winnipeg"));
  });
});
