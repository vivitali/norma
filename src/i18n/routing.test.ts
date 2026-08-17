import { describe, expect, it } from "vitest";
import { routing } from "./routing";

describe("routing", () => {
  it("supports English and French with English as default", () => {
    expect(routing.locales).toEqual(["en", "fr"]);
    expect(routing.defaultLocale).toBe("en");
  });
});
