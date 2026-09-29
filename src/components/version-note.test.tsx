import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen, waitFor } from "@testing-library/react";
import { renderWithIntl } from "@/test/render-with-intl";
import { JurisdictionProvider } from "@/hooks/use-jurisdiction";
import { STORE_KEY_V2 } from "@/lib/storage";
import { ChangelogLink, VersionNote, type NoteRelease } from "./version-note";

vi.mock("next/navigation", async () => (await import("@/test/navigation-mock")).nextNavigation);

let pathname = "/affordability";
vi.mock("@/i18n/navigation", async () => {
  const mock = (await import("@/test/navigation-mock")).intlNavigation;
  return { ...mock, usePathname: () => pathname };
});

const GENERAL: NoteRelease = {
  dateKey: 20260928,
  updated: "Updated 28 Sep 2026",
  summary: "Clearer closing costs",
};
const WINNIPEG: NoteRelease = {
  dateKey: 20260930,
  updated: "Updated 30 Sep 2026",
  summary: "Winnipeg fees",
  jurisdictions: ["winnipeg"],
};
const OLDER: NoteRelease = { dateKey: 20260901, updated: "Updated 1 Sep 2026", summary: "Older" };

function stored(): Record<string, unknown> {
  return JSON.parse(window.localStorage.getItem(STORE_KEY_V2) ?? "{}");
}

function renderNote(releases: readonly NoteRelease[] = [GENERAL, OLDER]) {
  return renderWithIntl(
    <JurisdictionProvider>
      <VersionNote releases={releases} />
      <ChangelogLink releases={releases} label="What changed" newLabel="new" />
    </JurisdictionProvider>,
  );
}

beforeEach(() => {
  window.localStorage.clear();
  pathname = "/affordability";
});
afterEach(() => cleanup());

const dot = () => screen.getByTestId("version-dot");

describe("VersionNote", () => {
  it("shows the newest release's date and summary as plain text, with ONE link to the changelog", () => {
    renderNote();
    const note = screen.getByText(/Updated 28 Sep 2026 — Clearer closing costs/);
    expect(note.querySelector("a")).toBeNull();
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/changelog");
    expect(links[0]).toHaveAccessibleName("What changed");
  });

  it("puts the news dot inside that one link, and names it for screen readers", async () => {
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ seenUpdate: 20260901 }));
    renderNote();
    await waitFor(() => expect(dot()).not.toHaveClass("invisible"));
    const link = screen.getByRole("link");
    expect(link).toContainElement(dot());
    expect(link).toHaveAccessibleName("What changed new");
  });

  it("shows no dot on a first visit, and records the current latest as seen", async () => {
    renderNote();
    await waitFor(() => expect(stored().seenUpdate).toBe(20260928));
    expect(dot()).toHaveClass("invisible");
    expect(screen.queryByText("new")).toBeNull();
  });

  it("shows no dot when the reader has already seen the latest release", async () => {
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ seenUpdate: 20260928 }));
    renderNote();
    await waitFor(() => expect(stored().seenUpdate).toBe(20260928));
    expect(dot()).toHaveClass("invisible");
  });

  it("shows the dot, with a text equivalent, when the latest release is newer than the last seen", async () => {
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ seenUpdate: 20260901 }));
    renderNote();
    await waitFor(() => expect(dot()).not.toHaveClass("invisible"));
    expect(screen.getByText("new")).toHaveClass("sr-only");
    // Seeing the dot is not seeing the changelog: it stays until the reader opens it.
    expect(stored().seenUpdate).toBe(20260901);
  });

  it("always renders the dot's box, hidden while not new, so nothing shifts when it appears", () => {
    renderNote();
    expect(dot()).toHaveClass("invisible", "size-1.5", "inline-block");
    expect(dot()).toHaveAttribute("aria-hidden", "true");
  });

  it("records the latest as seen, and drops the dot, on the changelog page itself", async () => {
    pathname = "/changelog";
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ seenUpdate: 20260901 }));
    renderNote();
    await waitFor(() => expect(stored().seenUpdate).toBe(20260928));
    expect(dot()).toHaveClass("invisible");
  });

  it("ignores a release tagged to another jurisdiction", async () => {
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ seenUpdate: 20260928, jurId: "toronto" }));
    renderNote([WINNIPEG, GENERAL, OLDER]);
    await waitFor(() => expect(stored().seenUpdate).toBe(20260928));
    expect(screen.getByText(/Clearer closing costs/)).toBeInTheDocument();
    expect(screen.queryByText(/Winnipeg fees/)).toBeNull();
    expect(dot()).toHaveClass("invisible");
  });

  it("uses a release tagged to the reader's jurisdiction, and flags it when it is newer than seen", async () => {
    window.localStorage.setItem(STORE_KEY_V2, JSON.stringify({ seenUpdate: 20260928, jurId: "winnipeg" }));
    renderNote([WINNIPEG, GENERAL, OLDER]);
    expect(await screen.findByText(/Updated 30 Sep 2026 — Winnipeg fees/)).toBeInTheDocument();
    await waitFor(() => expect(dot()).not.toHaveClass("invisible"));
  });

  it("renders no note when no release applies", () => {
    renderNote([]);
    expect(screen.queryByText(/Updated/)).toBeNull();
  });
});
