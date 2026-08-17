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

  it("does not transiently overwrite hydrated values with defaults on first mount", async () => {
    // Pre-seed localStorage with non-default values
    const stored = { price: 750000, jurId: "montreal" };
    window.localStorage.setItem("norma.inputs.v1", JSON.stringify(stored));

    // Spy on all setItem calls to record what gets written
    const writes: string[] = [];
    const originalSetItem = window.localStorage.setItem;
    window.localStorage.setItem = (key: string, value: string) => {
      if (key === "norma.inputs.v1") writes.push(value);
      originalSetItem.call(window.localStorage, key, value);
    };

    try {
      const { result } = renderHook(() => useSharedState(KEYS, DEFAULTS));

      // Wait for hydration to complete
      await waitFor(() => expect(result.current[0].price).toBe(750000));

      // Verify final state is hydrated values
      expect(result.current[0]).toEqual(stored);

      // Verify no write ever contained only the defaults
      // (would indicate stale write during mount)
      const defaultsJson = JSON.stringify(DEFAULTS);
      for (const write of writes) {
        const written = JSON.parse(write);
        // Check if this write contained the exact defaults (which would be the bug)
        const hasDefaultPrice = written.price === DEFAULTS.price;
        const hasDefaultJurId = written.jurId === DEFAULTS.jurId;
        expect(!(hasDefaultPrice && hasDefaultJurId)).toBe(true);
      }
    } finally {
      window.localStorage.setItem = originalSetItem;
    }
  });
});
