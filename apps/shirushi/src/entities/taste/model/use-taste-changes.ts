import { useAtomRefresh } from "@effect/atom-react";
import { useFollowing } from "@masseater.dev/media-notes-ui";
import { useCallback } from "react";

import { forecastsAtom, pairsAtom, statementsAtom } from "./taste.ts";

const CHANGED = "shirushi://taste-changed";

export const useTasteChanges = (): void => {
  const pairs = useAtomRefresh(pairsAtom);
  const statements = useAtomRefresh(statementsAtom);
  const forecasts = useAtomRefresh(forecastsAtom);
  const refresh = useCallback(() => {
    pairs();
    statements();
    forecasts();
  }, [pairs, statements, forecasts]);
  useFollowing({ event: CHANGED, refresh });
};
