import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { SITE_NAME } from "@/lib/seo";
import { JsonLd, webApplicationSchema } from "./json-ld";

describe("webApplicationSchema", () => {
  const schema = webApplicationSchema("en-CA", "Two ceilings, side by side.");

  it("declares a WebApplication in the finance category", () => {
    expect(schema["@type"]).toBe("WebApplication");
    expect(schema.applicationCategory).toBe("FinanceApplication");
    expect(schema.name).toBe(SITE_NAME);
  });

  it("does not claim a rating, review count or price", () => {
    // PRODUCT.md: no users, no traffic, no testimonials. Rating markup here
    // would be fabricated, and fabricated markup is what earns a manual action.
    expect(schema).not.toHaveProperty("aggregateRating");
    expect(schema).not.toHaveProperty("review");
    expect(schema).not.toHaveProperty("offers");
  });
});

describe("JsonLd", () => {
  it("emits parseable ld+json", () => {
    const { container } = render(<JsonLd data={{ "@type": "Thing" }} />);
    const script = container.querySelector('script[type="application/ld+json"]');
    expect(script).not.toBeNull();
    expect(JSON.parse(script?.textContent ?? "")).toMatchObject({
      "@context": "https://schema.org",
      "@type": "Thing",
    });
  });
});
