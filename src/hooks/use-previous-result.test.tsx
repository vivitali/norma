import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { usePreviousResult } from "./use-previous-result";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe("usePreviousResult", () => {
  it("has nothing to compare against on first render", () => {
    const { result } = renderHook(() => usePreviousResult(1));
    expect(result.current).toBeNull();
  });

  it("holds the prior value after a change", () => {
    const { result, rerender } = renderHook(({ v }) => usePreviousResult(v), {
      initialProps: { v: 1 },
    });
    rerender({ v: 2 });
    expect(result.current).toBe(1);
  });

  it("lets it go once the hold expires", () => {
    const { result, rerender } = renderHook(({ v }) => usePreviousResult(v, 4000), {
      initialProps: { v: 1 },
    });
    rerender({ v: 2 });
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current).toBeNull();
  });

  it("stays quiet when a re-render changes nothing", () => {
    const { result, rerender } = renderHook(({ v }) => usePreviousResult(v), {
      initialProps: { v: 1 },
    });
    rerender({ v: 1 });
    expect(result.current).toBeNull();
  });
});
