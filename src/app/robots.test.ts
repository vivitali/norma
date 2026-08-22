import { describe, expect, it } from "vitest";
import { SITE_URL } from "@/lib/seo";
import robots from "./robots";

describe("robots", () => {
  const result = robots();

  it("allows all crawlers", () => {
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    expect(rules[0]?.userAgent).toBe("*");
    expect(rules[0]?.allow).toBe("/");
    expect(rules[0]?.disallow).toBeUndefined();
  });

  it("points at the absolute sitemap url", () => {
    expect(result.sitemap).toBe(`${SITE_URL}/sitemap.xml`);
  });
});
