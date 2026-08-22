import { describe, expect, it } from "vitest";
import type { AffordabilityResult } from "@/domain/engine";
import { approvalState, cashState, comfortState, verdictKey } from "./affordability-view";

/** Only the fields these functions read. Cast at one narrow seam, not per test. */
const make = (over: Partial<AffordabilityResult>) =>
  ({
    approvalPass: true,
    comfortPass: true,
    cashGap: null,
    cc: { net: 40000 },
    ...over,
  }) as AffordabilityResult;

describe("verdictKey", () => {
  // The reference's state machine, ported whole and evaluated in order.
  it("reports declined first, whatever else is wrong", () => {
    expect(verdictKey(make({ approvalPass: false, comfortPass: false, cashGap: -1 }))).toBe(
      "declined",
    );
  });
  it("reports shortCash before over", () => {
    expect(verdictKey(make({ comfortPass: false, cashGap: -1 }))).toBe("shortCash");
  });
  it("reports over when the cash is fine", () => {
    expect(verdictKey(make({ comfortPass: false, cashGap: 5000 }))).toBe("over");
  });
  it("reports comfortable when nothing binds", () => {
    expect(verdictKey(make({}))).toBe("comfortable");
  });
  it("never reports shortCash while funds are unknown", () => {
    // The divergence from the reference, which defaults funds to $50,000 and so
    // drives every new visitor's verdict from a savings balance they never gave.
    expect(verdictKey(make({ comfortPass: false, cashGap: null }))).toBe("over");
    expect(verdictKey(make({ cashGap: null }))).toBe("comfortable");
  });
});

describe("check states", () => {
  it("maps approval to pass or blocked", () => {
    expect(approvalState(make({ approvalPass: true }))).toBe("pass");
    expect(approvalState(make({ approvalPass: false }))).toBe("blocked");
  });
  it("maps comfort to pass or caution, never blocked", () => {
    // Over your own ceiling is a caution. Only a lender blocks.
    expect(comfortState(make({ comfortPass: true }))).toBe("pass");
    expect(comfortState(make({ comfortPass: false }))).toBe("caution");
  });
  it("reports cash as unanswered while funds are unknown", () => {
    expect(cashState(make({ cashGap: null }))).toBe("unanswered");
  });
  it("reports cash as blocked on a shortfall", () => {
    expect(cashState(make({ cashGap: -1 }))).toBe("blocked");
  });
  it("reports cash as caution on a thin margin", () => {
    // Under a tenth of the requirement is not comfortable, it is close.
    expect(cashState(make({ cashGap: 3000 }))).toBe("caution");
  });
  it("reports cash as pass on a real margin", () => {
    expect(cashState(make({ cashGap: 9000 }))).toBe("pass");
  });
});
