import { beforeEach, describe, expect, it, vi } from "vitest";

const notFound = vi.fn();
vi.mock("next/navigation", () => ({ notFound }));

// Imported AFTER the mock so `assertRouteAvailable`'s own `import { notFound }
// from "next/navigation"` resolves to the spy above.
const { default: RrspHbpLayout } = await import("./layout");

beforeEach(() => notFound.mockClear());

describe("RrspHbpLayout", () => {
  it("404s for a US locale — RRSP-HBP has no US analogue", async () => {
    const result = await RrspHbpLayout({
      children: "child",
      params: Promise.resolve({ locale: "en-US" }),
    });
    expect(notFound).toHaveBeenCalledOnce();
    // notFound() is mocked, so — unlike a real request — the function still
    // returns; asserting the mock was called is what proves the guard fired.
    expect(result).toBe("child");
  });

  it("renders for a Canadian locale", async () => {
    const result = await RrspHbpLayout({
      children: "child",
      params: Promise.resolve({ locale: "en-CA" }),
    });
    expect(notFound).not.toHaveBeenCalled();
    expect(result).toBe("child");
  });
});
