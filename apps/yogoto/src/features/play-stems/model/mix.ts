import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Array as Arr, pipe } from "effect";
import { useCallback } from "react";

import { mixAtom, usePlayback } from "./playback.ts";
import type { Mix } from "./playback.ts";

export type Switch = "muted" | "soloed";

const flipped =
  (stem: string) =>
  (stems: readonly string[]): readonly string[] => {
    if (Arr.contains(stems, stem)) {
      return pipe(
        stems,
        Arr.filter((other) => other !== stem),
      );
    }
    return Arr.append(stems, stem);
  };

export const useMix = (): Mix => useAtomValue(mixAtom);

export const useSwitch = (which: Switch): ((stem: string) => void) => {
  const mix = useAtomValue(mixAtom);
  const set = useAtomSet(mixAtom);
  const playback = usePlayback();
  return useCallback(
    (stem: string) => {
      const next: Mix = { ...mix, [which]: flipped(stem)(mix[which]) };
      set(next);
      if (playback.status === "playing") {
        playback.running.remix(next);
      }
    },
    [mix, set, which, playback],
  );
};
