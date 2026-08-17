import { describe, expect, it, afterEach } from "vitest";
import { screen, waitFor, cleanup } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { ThemeProvider } from "./theme-provider";
import { ThemeToggle } from "./theme-toggle";

afterEach(() => cleanup());

function renderToggle() {
  return renderWithIntl(
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ThemeToggle />
    </ThemeProvider>,
  );
}

describe("ThemeToggle", () => {
  it("renders a labeled button", async () => {
    renderToggle();
    await waitFor(() => expect(screen.getByRole("button", { name: "Theme" })).toBeInTheDocument());
  });

  it("toggles the html element's dark class on click", async () => {
    const user = userEvent.setup();
    renderToggle();
    const button = await screen.findByRole("button", { name: "Theme" });
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    await user.click(button);
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(true));
    await user.click(button);
    await waitFor(() => expect(document.documentElement.classList.contains("dark")).toBe(false));
  });
});
