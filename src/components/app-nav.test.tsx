import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { renderWithIntl } from "@/test/render-with-intl";
import { AppNav } from "./app-nav";
import { NAV, builtEntries } from "@/lib/routes";
import enMessages from "../../messages/en.json";
import frMessages from "../../messages/fr.json";

/**
 * The trigger label, from the catalogue rather than a literal — renaming that one
 * string broke fourteen tests that were not about the string. Locale-aware
 * because two of these render the French tree, where it is "Outils".
 */
const TRIGGER = enMessages.Nav.menu;
const TRIGGER_FR = frMessages.Nav.menu;

// Real `@/i18n/navigation` now runs unmocked: only `next/navigation` (its dependency) is
// replaced, with the RAW browser pathname next-intl expects — `/en/...` or `/fr/...`, always
// prefixed (routing.ts's default `localePrefix` mode is "always"). next-intl's own `usePathname`
// then reverse-maps that raw, possibly-localized pathname back to the canonical route key, and its
// `Link` resolves `href` forward into the localized slug from `routing.pathnames` — so both
// directions of the real localization logic are exercised, not a hand-written stand-in.
let mockPathname = "/en";

vi.mock("next/navigation", () => ({
  usePathname: () => mockPathname,
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
}));

const label = (key: string) => enMessages.Nav[key as keyof typeof enMessages.Nav];

/**
 * Every destination now sits behind the menu disclosure, so every assertion about a link has to
 * open it first. A closed panel carries `hidden`, which takes it out of the accessibility tree —
 * so `getByRole` genuinely cannot see the links until this runs, which is the point.
 */
async function openMenu() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: TRIGGER }));
  return user;
}

describe("AppNav", () => {
  beforeEach(() => {
    mockPathname = "/en";
  });

  afterEach(() => {
    cleanup();
  });

  it("links to every built page and to nothing else", async () => {
    // Derived from NAV in both directions rather than naming two routes. Naming
    // "Scenarios" as the unbuilt example made this fail the day Scenarios
    // shipped, which is not the same event as the behaviour breaking. Now that
    // every page is built the second half asserts nothing -- and correctly so.
    renderWithIntl(<AppNav />);
    await openMenu();
    for (const group of NAV) {
      for (const entry of group.entries) {
        const link = screen.queryAllByRole("link", { name: label(entry.label) });
        if (entry.built) expect(link.length, entry.route).toBeGreaterThan(0);
        else expect(link.length, entry.route).toBe(0);
      }
    }
  });

  it("points the link at the localized slug", async () => {
    mockPathname = "/fr";
    renderWithIntl(<AppNav />, { locale: "fr" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: TRIGGER_FR }));
    expect(screen.getByRole("link", { name: "Capacité d'achat" })).toHaveAttribute(
      "href",
      "/fr/abordabilite",
    );
  });

  it("omits a group heading when the group has no built pages", async () => {
    // Derived from NAV rather than naming a group: hardcoding "Buy" made this
    // test fail the day Closing Costs shipped, which is not the same event as
    // the behaviour breaking. Skips itself once every page is built -- at which
    // point there is nothing left for it to assert.
    const empty = NAV.filter((g) => builtEntries(g).length === 0);
    if (empty.length === 0) return;
    renderWithIntl(<AppNav />);
    await openMenu();
    for (const group of empty) {
      expect(screen.queryByText(label(group.heading))).not.toBeInTheDocument();
    }
  });

  it("marks the current route as the active page", async () => {
    mockPathname = "/en/affordability";
    renderWithIntl(<AppNav />);
    await openMenu();
    expect(screen.getByRole("link", { name: "Affordability" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("marks the current route as active from a localized pathname, proving next-intl reverse-maps the French slug to the canonical route key", async () => {
    mockPathname = "/fr/abordabilite";
    renderWithIntl(<AppNav />, { locale: "fr" });
    const user = userEvent.setup();
    await user.click(screen.getByRole("button", { name: TRIGGER_FR }));
    expect(screen.getByRole("link", { name: "Capacité d'achat" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("keeps every destination out of the accessibility tree until the menu is opened", async () => {
    // The overflow fix itself, stated as behaviour: nothing but the trigger occupies the header
    // row, so the header cannot be wider than the viewport no matter how many tools ship.
    renderWithIntl(<AppNav />);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
    await openMenu();
    expect(screen.queryAllByRole("link").length).toBeGreaterThan(0);
  });

  it("gives each group a labelled list of its own destinations", async () => {
    // The group label names a real list rather than sitting beside links -- which is what makes
    // the two Rent vs Buy listings legible as two listings rather than a duplication bug.
    // Derived from NAV so regrouping the IA does not falsify the test.
    renderWithIntl(<AppNav />);
    await openMenu();
    for (const group of NAV) {
      const entries = builtEntries(group);
      if (entries.length === 0) continue;
      const list = screen.getByRole("list", { name: label(group.heading) });
      const names = Array.from(list.querySelectorAll("a")).map((a) => a.textContent);
      expect(names).toEqual(entries.map((entry) => label(entry.label)));
    }
  });

  it("adds no heading of its own, so it cannot open a page's outline above its h1", async () => {
    // The nav renders before the page content, and every tool page's name is its <h1>. Four
    // group headings here would put four h2s above that h1 in document order -- a broken
    // outline, just a different break. The grouping is carried by labelled lists instead.
    renderWithIntl(<AppNav />);
    await openMenu();
    expect(screen.queryAllByRole("heading")).toHaveLength(0);
  });

  it("lists Rent vs Buy under both of the groups that claim it", () => {
    // Pins the registry fact the panel exists to communicate. Kept structural: it counts
    // occurrences in NAV rather than naming Afford and Own.
    const groupsClaiming = NAV.filter((g) =>
      builtEntries(g).some((e) => e.route === "/rent-vs-buy"),
    );
    expect(groupsClaiming.length).toBe(2);
  });

  it("reports its open state on the trigger and points it at the panel", async () => {
    renderWithIntl(<AppNav />);
    const trigger = screen.getByRole("button", { name: TRIGGER });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    const panelId = trigger.getAttribute("aria-controls");
    expect(panelId).toBeTruthy();
    expect(document.getElementById(panelId!)).toBeTruthy();
    await openMenu();
    expect(trigger).toHaveAttribute("aria-expanded", "true");
  });

  it("moves focus into the panel on open", async () => {
    renderWithIntl(<AppNav />);
    await openMenu();
    expect(document.activeElement).toBe(screen.getByRole("link", { name: "Affordability" }));
  });

  it("closes on Escape and restores focus to the trigger", async () => {
    renderWithIntl(<AppNav />);
    const user = await openMenu();
    await user.keyboard("{Escape}");
    const trigger = screen.getByRole("button", { name: TRIGGER });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(document.activeElement).toBe(trigger);
    expect(screen.queryAllByRole("link")).toHaveLength(0);
  });

  it("traps Tab between the trigger and the panel's destinations", async () => {
    renderWithIntl(<AppNav />);
    const user = await openMenu();
    const trigger = screen.getByRole("button", { name: TRIGGER });
    const links = screen.getAllByRole("link");
    const last = links[links.length - 1];

    last.focus();
    await user.tab();
    expect(document.activeElement).toBe(trigger);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(last);
  });

  it("closes when a destination is chosen", async () => {
    renderWithIntl(<AppNav />);
    const user = await openMenu();
    await user.click(screen.getByRole("link", { name: "Affordability" }));
    expect(screen.getByRole("button", { name: TRIGGER })).toHaveAttribute("aria-expanded", "false");
  });

  it("closes on a press outside the menu", async () => {
    renderWithIntl(
      <div>
        <AppNav />
        <button type="button">Elsewhere</button>
      </div>,
    );
    const user = await openMenu();
    await user.click(screen.getByRole("button", { name: "Elsewhere" }));
    expect(screen.getByRole("button", { name: TRIGGER })).toHaveAttribute("aria-expanded", "false");
  });
});
