import { describe, expect, it, beforeEach } from "vitest";
import { render, renderHook, act, waitFor } from "@testing-library/react";
import { StrictMode } from "react";
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

  it("never transiently writes default values to localStorage when hydrating pre-existing data, even under React StrictMode", async () => {
    const calls: Array<[string, string]> = [];
    const store = new Map<string, string>();
    const trackedStorage: Storage = {
      getItem: (key) => (store.has(key) ? store.get(key)! : null),
      setItem: (key, value) => {
        calls.push([key, value]);
        store.set(key, value);
      },
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
      key: () => null,
      get length() {
        return store.size;
      },
    };
    trackedStorage.setItem("norma.inputs.v1", JSON.stringify({ price: 700000, jurId: "toronto" }));
    calls.length = 0; // don't count our own seed write above

    const originalLocalStorage = window.localStorage;
    Object.defineProperty(window, "localStorage", { value: trackedStorage, configurable: true });

    try {
      const { result } = renderHook(() => useSharedState(KEYS, DEFAULTS), { wrapper: StrictMode });
      await waitFor(() => expect(result.current[0].price).toBe(700000));

      const wroteDefaults = calls.some(([key, value]) => {
        if (key !== "norma.inputs.v1") return false;
        const parsed = JSON.parse(value);
        return parsed.price === DEFAULTS.price && parsed.jurId === DEFAULTS.jurId;
      });
      expect(wroteDefaults).toBe(false);
    } finally {
      Object.defineProperty(window, "localStorage", { value: originalLocalStorage, configurable: true });
    }
  });

  it("reports hydrated false on first render and true once storage has been read", async () => {
    window.localStorage.setItem("norma.inputs.v1", JSON.stringify({ price: 999000 }));
    const seen: boolean[] = [];
    const PROBE_KEYS = ["price"] as const;
    function Probe() {
      const [, , hydrated] = useSharedState(PROBE_KEYS, { price: 450000 });
      seen.push(hydrated);
      return null;
    }
    render(<Probe />);
    await waitFor(() => expect(seen.at(-1)).toBe(true));
    expect(seen[0]).toBe(false);
  });
});
