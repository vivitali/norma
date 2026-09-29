import { describe, expect, it, afterEach, beforeEach } from "vitest";
import { screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

beforeEach(() => window.localStorage.clear());
afterEach(() => {
  cleanup();
  document.documentElement.classList.remove("dark");
});

function renderToggle(defaultTheme = "system") {
  return renderWithIntl(
    <ThemeProvider attribute="class" defaultTheme={defaultTheme} enableSystem>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

const button = () => screen.getByRole("button", { name: /^Theme:/ });

describe("ThemeToggle", () => {
  it("names the current state and what the next press does", async () => {
    renderToggle();
    await waitFor(() =>
      expect(button()).toHaveAccessibleName("Theme: System. Switch to Light."),
    );
  });

  it("cycles System, Light, Dark and back to System", async () => {
    const user = userEvent.setup();
    renderToggle();
    await user.click(button());
    await waitFor(() => expect(button()).toHaveAccessibleName("Theme: Light. Switch to Dark."));
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    await user.click(button());
    await waitFor(() => expect(button()).toHaveAccessibleName("Theme: Dark. Switch to System."));
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    await user.click(button());
    await waitFor(() => expect(button()).toHaveAccessibleName("Theme: System. Switch to Light."));
  });

  it("is a 44px target on a phone", () => {
    renderToggle();
    expect(button()).toHaveClass("size-11", "sm:size-8");
  });
});
