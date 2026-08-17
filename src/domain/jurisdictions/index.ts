import type { Jurisdiction } from "../types";
import { toronto } from "./toronto";
import { ottawa } from "./ottawa";
import { vancouver } from "./vancouver";
import { halifax } from "./halifax";
import { winnipeg } from "./winnipeg";
import { montreal } from "./montreal";
import { calgary } from "./calgary";
import { saskatoon } from "./saskatoon";
import { nb } from "./nb";
import { nl } from "./nl";
import { pe } from "./pe";
import { yt } from "./yt";
import { nt } from "./nt";
import { nu } from "./nu";

export const jurisdictions: readonly Jurisdiction[] = [
  toronto, ottawa, vancouver, halifax, winnipeg, montreal, calgary, saskatoon,
  nb, nl, pe, yt, nt, nu,
];

export function getJurisdiction(id: string): Jurisdiction | undefined {
  return jurisdictions.find((j) => j.id === id);
}
