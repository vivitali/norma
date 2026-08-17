import { describe, expect, it, beforeEach } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useSharedState } from "./use-shared-state";

const KEYS = ["price", "jurId"] as const;
const DEFAULTS = { price: 500000, jurId: "winnipeg" };

describe("useSharedState", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("starts from defaults when localStorage is empty", () => {
    const { result } = renderHook(() => useSharedState(KEYS, DEFAULTS));
    expect(result.current[0]).toEqual(DEFAULTS);
  });

  it("hydrates from localStorage after mount", async () => {
    window.localStorage.setItem("norma.inputs.v1", JSON.stringify({ price: 700000, jurId: "toronto" }));
    const { result } = renderHook(() => useSharedState(KEYS, DEFAULTS));
    await waitFor(() => expect(result.current[0].price).toBe(700000));
    expect(result.current[0].jurId).toBe("toronto");
  });

  it("persists a patch to localStorage", async () => {
    const { result } = renderHook(() => useSharedState(KEYS, DEFAULTS));
    act(() => result.current[1]({ price: 600000 }));
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("norma.inputs.v1") ?? "{}");
      expect(stored.price).toBe(600000);
    });
  });

  it("does not clobber keys owned by a different allowlist in the same storage blob", async () => {
    window.localStorage.setItem("norma.inputs.v1", JSON.stringify({ otherHookKey: "keep-me" }));
    const { result } = renderHook(() => useSharedState(KEYS, DEFAULTS));
    act(() => result.current[1]({ price: 600000 }));
    await waitFor(() => {
      const stored = JSON.parse(window.localStorage.getItem("norma.inputs.v1") ?? "{}");
      expect(stored.otherHookKey).toBe("keep-me");
      expect(stored.price).toBe(600000);
    });
  });

  it("merges a patch into existing state rather than replacing it", () => {
    const { result } = renderHook(() => useSharedState(KEYS, DEFAULTS));
    act(() => result.current[1]({ price: 600000 }));
    expect(result.current[0]).toEqual({ price: 600000, jurId: "winnipeg" });
  });
});
