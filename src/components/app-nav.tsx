"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { Menu, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NAV, builtEntries } from "@/lib/routes";
import { cn } from "@/lib/utils";

/**
 * Every destination behind ONE disclosure, at every width.
 *
 * The flat row this replaces put nine links and four group headings side by side in a single
 * `flex` with no wrapping: 779px of content that could not shrink, which made the whole app scroll
 * horizontally at 570px and below. Making it wrap would have fixed the overflow and none of the
 * rest — on the flat row a heading was a link-shaped thing standing beside links (so AFFORD read
 * as a destination), and Rent vs Buy, which legitimately belongs to two groups, read as a
 * duplication bug because nothing on the row said which group either copy was in.
 *
 * A panel fixes all three at once, and it is the gesture DESIGN.md §1 already commits to: one
 * disclosure, learned once. Inside it each group is a labelled list — structure the bar could not
 * express — so the second Rent vs Buy is visibly a second listing, not a second page. Deliberately
 * a labelled list and NOT a heading; see the comment on the group markup below for why.
 *
 * Kept at every width rather than swapped for a desktop row above `lg`. NOT on the strength of
 * DESIGN.md §8, which forbids a second *disclosure* mechanism — a row of links discloses nothing,
 * and read that broadly the rule would also forbid the home page's tool directory, which is a
 * second visible route to these same nine destinations and is correct. The reasons that hold:
 *
 *   1. Arrival is search-first (PRODUCT.md), onto one tool that stands alone. A header row is
 *      furniture for that visitor; the home directory is the browse surface, and it carries what
 *      each tool answers rather than nine bare labels.
 *   2. The flat row was illegible, not merely too wide — at 1440px it physically fitted. Group
 *      headings on a bar read as destinations, and Rent vs Buy in two groups read as a bug. A
 *      labelled list is the only shape in which that duplication is honest, and the duplication
 *      is a PRODUCT.md commitment: buyers and renters are co-equal.
 *   3. A partial row ("3-4 primary tools, then More") would force a primacy ranking PRODUCT.md
 *      explicitly refuses, and would give the app two vocabularies for one set of tools.
 *
 * The real discoverability gap this leaves is that no tool page links to any other. That belongs
 * in the sections themselves — the row computing land transfer tax should link the words to
 * Closing Costs — not in header chrome. A second
 * disclosure mechanism for wide viewports would be two navigations competing to mean "the tools",
 * and the row was the worse of the two even where it fit.
 *
 * Grouping still lives in src/lib/routes.ts, not here, so the IA can be regrouped without touching
 * a component.
 *
 * `usePathname` from @/i18n/navigation returns the CANONICAL route key, not the localized slug, so
 * the active-state comparison below works under /en, /fr and every future locale with no
 * per-locale logic.
 */
export function AppNav() {
  const t = useTranslations("Nav");
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const rootRef = useRef<HTMLElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const groups = NAV.map((group) => ({ group, entries: builtEntries(group) })).filter(
    ({ entries }) => entries.length > 0,
  );

  const close = useCallback((restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }, []);

  // Opening moves focus into the panel, so a keyboard or screen-reader user lands on the first
  // destination rather than being told a region exists somewhere below them.
  useEffect(() => {
    if (!open) return;
    focusables(panelRef.current)[0]?.focus();
  }, [open]);

  // A press anywhere outside dismisses. No focus restore: the pointer has already moved on, and
  // yanking focus back to the trigger would fight whatever the user just pressed.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  /**
   * Escape closes and returns focus to the trigger; Tab cycles within trigger + panel.
   *
   * The trigger is deliberately part of the cycle rather than outside it — it is the control that
   * closes the panel, so tabbing past the last destination should reach it, not the jurisdiction
   * picker behind an open overlay.
   */
  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!open) return;
    if (event.key === "Escape") {
      event.preventDefault();
      close(true);
      return;
    }
    if (event.key !== "Tab") return;
    const items = [triggerRef.current, ...focusables(panelRef.current)].filter(
      (element): element is HTMLElement => element !== null,
    );
    if (items.length === 0) return;
    const first = items[0];
    const last = items[items.length - 1];
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    /*
      The landmark lives HERE, on the always-present wrapper, not on the panel.
      Putting it on the panel meant the app's only <nav> carried `hidden`, so
      navigating by landmark on page load found nothing at all — a regression the
      flat bar did not have, and one no test caught because the suite asserts the
      panel is empty when closed and reads that as success.
    */
    <nav ref={rootRef} aria-label={t("menu")} onKeyDown={onKeyDown}>
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => (open ? close(true) : setOpen(true))}
        className={cn(
          // 44px below `sm` per DESIGN.md §7; the desktop header row is 62px tall and cannot
          // carry a 44px control with its own padding, so it steps down to 32px there.
          "inline-flex min-h-11 items-center gap-2 rounded-full border px-3.5 text-[13.5px] font-medium transition-colors sm:min-h-8",
          open
            ? "border-acbr bg-acbg text-ac"
            : "border-border text-ink2 hover:bg-sunk hover:text-ink",
        )}
      >
        {open ? <X className="size-4" aria-hidden /> : <Menu className="size-4" aria-hidden />}
        {t("menu")}
      </button>

      {/*
        `hidden` rather than conditional rendering: a closed panel leaves the accessibility tree
        while `aria-controls` still resolves to a real element — the convention DESIGN.md §7 sets
        for every disclosure in this app.

        Positioned against the header (the nearest positioned ancestor), not against this div, so
        the panel spans the full width at every viewport instead of hanging off the trigger.

        7rem in the height cap is the two-row header's height, so on a phone the panel reaches
        exactly the bottom of the viewport and scrolls the rest. Nine destinations at a 44px touch
        target do not fit a small phone screen and never will; the cap's job is to stop the panel
        running PAST the fold, not to make it fit.
      */}
      <div
        ref={panelRef}
        id={panelId}
        hidden={!open}
        className="absolute inset-x-0 top-full z-50 max-h-[calc(100dvh-7rem)] overflow-y-auto border-b border-border bg-panel py-5"
      >
        {/*
          Nested lists, not headings.

          The grouping has to be structural — a sighted user sees four columns and a screen-reader
          user must get the same four groups — but this nav renders BEFORE the page's own <h1> in
          document order, so four <h2>s here would open every page's heading outline four levels
          into a document that has not started yet. The WAI nested-list pattern carries the same
          information with no heading levels at all: each group is one <li> holding a labelled
          <ul>, announced as "Afford, list, 2 items".

          The group label stays a <span> for exactly that reason. It is `aria-labelledby` on the
          inner list that makes it a label rather than a floating word.

          The outer <ul> is also what makes the second Rent vs Buy legible: it is the second item
          of a different list, not a repeated link on one bar.

          Same box as ToolMain, so the panel's columns start on the page's content edge.
        */}
        <ul role="list" className="mx-auto grid w-full max-w-[1100px] gap-x-8 gap-y-6 px-4 sm:grid-cols-2 sm:px-10 lg:grid-cols-4">
          {groups.map(({ group, entries }) => (
            <li key={group.heading}>
              <span id={`${panelId}-${group.heading}`} className="eyebrow mb-2 block text-ink3">
                {t(group.heading)}
              </span>
              {/* The pill's own padding hangs into the gutter so its LABEL, not its edge, lands
                  on the same left edge as the group label above it. */}
              <ul
                role="list"
                aria-labelledby={`${panelId}-${group.heading}`}
                className="-mx-3 flex flex-col gap-0.5"
              >
                {entries.map((entry) => {
                  const active = pathname === entry.route;
                  return (
                    <li key={`${group.heading}:${entry.route}`}>
                      <Link
                        href={entry.route}
                        aria-current={active ? "page" : undefined}
                        // `event.detail === 0` marks a keyboard-activated click. Only then is
                        // focus worth returning to the trigger: a pointer user has no focus ring
                        // to lose, and the panel is about to be replaced by a new page anyway.
                        onClick={(event) => close(event.detail === 0)}
                        className={cn(
                          // `w-fit`: the pill hugs its label instead of stretching the column,
                          // which is what keeps it reading as this system's pill rather than as a
                          // full-width list row.
                          "flex min-h-11 w-fit items-center rounded-full px-3 text-[13.5px] transition-colors sm:min-h-9",
                          active
                            ? "bg-acbg font-medium text-ac"
                            : "text-ink2 hover:bg-sunk hover:text-ink",
                        )}
                      >
                        {t(entry.label)}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </nav>
  );
}

function focusables(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return Array.from(root.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
}
