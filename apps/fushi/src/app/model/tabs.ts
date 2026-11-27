import { Match, Option } from "effect";

import { LABELS } from "#/shared/config/index.ts";
import type { Route } from "#/shared/lib/index.ts";

export type Tab = "habits" | "judge" | "songs" | "import";

export const TABS: readonly (readonly [Tab, string])[] = [
  ["habits", LABELS.habits],
  ["judge", LABELS.judge],
  ["songs", LABELS.songs],
  ["import", LABELS.import],
];

export const tabOf = (route: Route): Tab =>
  Match.value(route).pipe(
    Match.discriminatorsExhaustive("page")({
      styles: (): Tab => "habits",
      overview: (): Tab => "habits",
      category: (): Tab => "habits",
      judge: (): Tab => "judge",
      songs: (): Tab => "songs",
      import: (): Tab => "import",
    }),
  );

const TAB_ROUTES: Readonly<Record<Tab, (style: string) => Route>> = {
  habits: (style) => ({ page: "overview", style }),
  judge: (style) => ({ page: "judge", style, habit: Option.none() }),
  songs: (style) => ({ page: "songs", style, song: Option.none() }),
  import: (style) => ({ page: "import", style }),
};

export const tabRoute = (tab: Tab): ((style: string) => Route) => TAB_ROUTES[tab];
