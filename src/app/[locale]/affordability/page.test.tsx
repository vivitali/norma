import { afterEach, describe, expect, it, beforeEach } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import AffordabilityPage from "./page";

function renderPage() {
  return renderWithIntl(
    <JurisdictionProvider>
      <AffordabilityPage />
    </JurisdictionProvider>,
  );
}

describe("Affordability page — input form", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

  it("renders the heading and every input with its default value", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "What can you actually afford?" })).toBeInTheDocument();
    expect(screen.getByLabelText("Your annual income")).toHaveValue(70000);
    expect(screen.getByLabelText("Purchase price you're considering")).toHaveValue(450000);
  });

  it("updates a numeric field's value on change", async () => {
    const user = userEvent.setup();
    renderPage();
    const priceInput = screen.getByLabelText("Purchase price you're considering");
    await user.clear(priceInput);
    await user.type(priceInput, "600000");
    expect(priceInput).toHaveValue(600000);
  });

  it("toggles first-time buyer status", async () => {
    const user = userEvent.setup();
    renderPage();
    const ftbSwitch = screen.getByRole("switch", { name: "First-time buyer" });
    expect(ftbSwitch).toBeChecked();
    await user.click(ftbSwitch);
    expect(ftbSwitch).not.toBeChecked();
  });

  it("persists a field change to localStorage", async () => {
    const user = userEvent.setup();
    renderPage();
    const priceInput = screen.getByLabelText("Purchase price you're considering");
    await user.clear(priceInput);
    await user.type(priceInput, "600000");
    await screen.findByDisplayValue("600000");
    const stored = JSON.parse(window.localStorage.getItem("norma.inputs.v1") ?? "{}");
    expect(stored.price).toBe(600000);
  });
});
