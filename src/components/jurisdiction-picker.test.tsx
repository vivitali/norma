import { describe, expect, it, beforeEach } from "vitest";
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { JurisdictionPicker } from "./jurisdiction-picker";
import { STORE_KEY_V2 } from "@/lib/storage";

function renderPicker() {
  return renderWithIntl(
    <JurisdictionProvider>
      <JurisdictionPicker />
    </JurisdictionProvider>,
  );
}

describe("JurisdictionPicker", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("shows the default jurisdiction's label", async () => {
    renderPicker();
    expect(await screen.findByText("Winnipeg")).toBeInTheDocument();
  });

  it("lists every jurisdiction as an option", async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(await screen.findByRole("combobox"));
    expect(await screen.findByRole("option", { name: "Toronto" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Nunavut" })).toBeInTheDocument();
  });

  it("persists the selection to localStorage", async () => {
    const user = userEvent.setup();
    renderPicker();
    await user.click(await screen.findByRole("combobox"));
    await user.click(await screen.findByRole("option", { name: "Toronto" }));
    await screen.findByText("Toronto");
    const stored = JSON.parse(window.localStorage.getItem(STORE_KEY_V2) ?? "{}");
    expect(stored.jurId).toBe("toronto");
  });

  it("shows the default jurisdiction when the stored id is unknown, not a missing-message error", async () => {
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ jurId: "atlantis" }));
    renderPicker();
    expect(await screen.findByText("Winnipeg")).toBeInTheDocument();
  });
});
