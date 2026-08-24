import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useHashTarget } from "./use-hash-target";

afterEach(() => {
  window.location.hash = "";
});

describe("useHashTarget", () => {
  it("returns null when there is no hash", () => {
    const { result } = renderHook(() => useHashTarget());
    expect(result.current).toBeNull();
  });

  it("reads the hash present on mount", () => {
    window.location.hash = "#check-comfort";
    const { result } = renderHook(() => useHashTarget());
    expect(result.current).toBe("check-comfort");
  });

  it("follows a hashchange", () => {
    const { result } = renderHook(() => useHashTarget());
    act(() => {
      window.location.hash = "#gap";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });
    expect(result.current).toBe("gap");
  });

  it("decodes a percent-encoded hash", () => {
    window.location.hash = "#check%2Dcash";
    const { result } = renderHook(() => useHashTarget());
    expect(result.current).toBe("check-cash");
  });
});
