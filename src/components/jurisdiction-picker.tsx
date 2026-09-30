"use client";

import { useTranslations } from "next-intl";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { jurisdictionsOf } from "@/domain/jurisdictions";
import { useJurisdiction } from "@/hooks/use-jurisdiction";
import { useCountry } from "@/hooks/use-country";
import type { Jurisdiction } from "@/domain/types";

/**
 * A Canadian record whose id is its own province code (`pe`, `nu`, `yt`…) stands for the whole
 * province or territory; the rest (`toronto`, `winnipeg`…) are city markets. Derived from the
 * record rather than listed, so a new city or province lands in the right group unaided.
 */
function isRegion(j: Jurisdiction): boolean {
  return j.country === "ca" && j.id.toLowerCase() === j.prov.toLowerCase();
}

export function JurisdictionPicker() {
  const t = useTranslations("AppHeader");
  const tJur = useTranslations("Jurisdictions");
  const [jurisdiction, setJurId] = useJurisdiction();
  const country = useCountry();
  const options = jurisdictionsOf(country);
  const item = (j: Jurisdiction) => (
    <SelectItem key={j.id} value={j.id}>
      {tJur(j.id)}
    </SelectItem>
  );

  return (
    <Select value={jurisdiction.id} onValueChange={setJurId}>
      {/*
        Below sm the trigger fills its `min-w-0 flex-1` wrapper instead of sizing to its label, so a
        long name ("Terre-Neuve-et-Labrador") truncates with an ellipsis INSIDE the trigger rather
        than overflowing under the country switcher. The full name stays in the dropdown.
      */}
      {/*
        The accessible name carries the current value, not just the action: below sm the
        visible name may be truncated, and a voice-control user says what they SEE
        (WCAG 2.5.3, label in name). A combobox takes no name from its content.
      */}
      <SelectTrigger
        aria-label={t("changeLocation", { name: tJur(jurisdiction.id) })}
        className="w-full min-w-0 sm:w-auto"
      >
        <SelectValue className="min-w-0">
          <span className="block truncate">{tJur(jurisdiction.id)}</span>
        </SelectValue>
      </SelectTrigger>
      {/*
        `popper`, not the default `item-aligned`: aligned to the selected item, a list opens
        mid-scroll and hides the entries above it (Toronto and Vancouver when Winnipeg is picked).
        Popper opens under the trigger, from the top.
      */}
      <SelectContent position="popper" className="min-w-64">
        {country === "ca" ? (
          <>
            <SelectGroup>
              <SelectLabel>{t("groupCities")}</SelectLabel>
              {options.filter((j) => !isRegion(j)).map(item)}
            </SelectGroup>
            <SelectGroup>
              <SelectLabel>{t("groupRegions")}</SelectLabel>
              {options.filter(isRegion).map(item)}
            </SelectGroup>
            <p className="px-1.5 pt-1 pb-2 text-[11.5px] leading-[1.5] text-muted-foreground text-pretty">
              {t("notListed")}
            </p>
          </>
        ) : (
          <SelectGroup>
            <SelectLabel>{t("groupUs")}</SelectLabel>
            {options.map(item)}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
