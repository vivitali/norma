import { beforeEach, describe, expect, it, vi } from "vitest";

const notFound = vi.fn();
vi.mock("next/navigation", () => ({ notFound }));

// Imported AFTER the mock so route-guard.ts's own `import { notFound } from
// "next/navigation"` resolves to the spy above.
const { assertRouteAvailable } = await import("./route-guard");

beforeEach(() => notFound.mockClear());

describe("assertRouteAvailable", () => {
  it("does nothing for a route that lists the locale's country", () => {
    assertRouteAvailable("en-CA", "/affordability");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("does nothing for RRSP-HBP in a Canadian locale", () => {
    assertRouteAvailable("en-CA", "/rrsp-hbp");
    assertRouteAvailable("fr-CA", "/rrsp-hbp");
    expect(notFound).not.toHaveBeenCalled();
  });

  it("404s RRSP-HBP for a US locale — no US analogue exists", () => {
    assertRouteAvailable("en-US", "/rrsp-hbp");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("404s RRSP-HBP for the other US locale too", () => {
    assertRouteAvailable("es-US", "/rrsp-hbp");
    expect(notFound).toHaveBeenCalledOnce();
  });

  it("does nothing for a route every registered country lists", () => {
    assertRouteAvailable("en-US", "/affordability");
    assertRouteAvailable("es-US", "/scenarios");
    expect(notFound).not.toHaveBeenCalled();
  });
});
