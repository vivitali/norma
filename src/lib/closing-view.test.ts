import { describe, expect, it } from "vitest";
import { cashState, RESERVE_FRACTION } from "./closing-view";

describe("cashState", () => {
  it("is unanswered, not blocked, when funds were never given", () => {
    // A reader who has not said what they have must never be shown a red verdict
    // computed from a number they did not supply.
    expect(cashState({ net: 40000, funds: null })).toBe("unanswered");
  });

  it("blocks when the funds do not cover the bill", () => {
    expect(cashState({ net: 40000, funds: 39999 })).toBe("blocked");
  });

  it("warns when closing leaves almost nothing behind", () => {
    // No lender's test fails this. It is still the thing most likely to go wrong
    // three weeks later, which is why the product says it and the bank does not.
    expect(cashState({ net: 40000, funds: 41000 })).toBe("caution");
  });

  it("passes when a reserve survives the closing", () => {
    expect(cashState({ net: 40000, funds: 60000 })).toBe("pass");
  });

  it("draws the reserve line at the stated fraction of the bill, not a flat amount", () => {
    // A $2,000 reserve is comfortable against a $20,000 bill and negligible
    // against a $200,000 one. Scaling is the whole reason this is a fraction.
    const net = 100000;
    const justUnder = net + net * RESERVE_FRACTION - 1;
    const justOver = net + net * RESERVE_FRACTION + 1;
    expect(cashState({ net, funds: justUnder })).toBe("caution");
    expect(cashState({ net, funds: justOver })).toBe("pass");
  });

  it("treats exactly covering the bill as tight, not as passing", () => {
    expect(cashState({ net: 40000, funds: 40000 })).toBe("caution");
  });
});
