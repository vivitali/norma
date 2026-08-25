import { afterEach, describe, expect, it, vi } from "vitest";
import { render } from "@testing-library/react";
import { Analytics } from "./analytics";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Analytics", () => {
  it("renders nothing without a token", () => {
    vi.stubEnv("NEXT_PUBLIC_CF_BEACON_TOKEN", "");
    const { container } = render(<Analytics />);
    expect(container.querySelector("script")).toBeNull();
  });

  it("renders a deferred beacon carrying the token", () => {
    vi.stubEnv("NEXT_PUBLIC_CF_BEACON_TOKEN", "test-token");
    const { container } = render(<Analytics />);
    const script = container.querySelector("script");
    expect(script).not.toBeNull();
    expect(script?.hasAttribute("defer")).toBe(true);
    expect(script?.getAttribute("data-cf-beacon")).toContain("test-token");
  });
});
