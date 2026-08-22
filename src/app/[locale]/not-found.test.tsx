import { describe, expect, it, vi } from "vitest";
import { screen } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import messages from "../../../messages/en.json";
import NotFound from "./not-found";

// @/i18n/navigation is next-intl's react-client navigation factory, which does
// not resolve under Vitest. Every component test in this repo that renders a
// Link stubs it the same way.
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("NotFound", () => {
  it("explains that the page does not exist", () => {
    renderWithIntl(<NotFound />);
    expect(screen.getByText(messages.Metadata.notFound.body)).toBeInTheDocument();
  });

  it("offers a route back into the app", () => {
    renderWithIntl(<NotFound />);
    const link = screen.getByRole("link", { name: messages.Metadata.notFound.cta });
    expect(link).toHaveAttribute("href", expect.stringContaining("affordability"));
  });

  it("uses a level-one heading", () => {
    renderWithIntl(<NotFound />);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
  });
});
