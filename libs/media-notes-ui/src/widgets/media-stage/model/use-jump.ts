import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import { useCallback } from "react";

import { usePlayer } from "#/features/play-media/index.ts";
import { rangeAtom } from "#/features/select-range/index.ts";
import type { Range } from "#/features/select-range/index.ts";

export const useJump = (): ((range: Range) => void) => {
  const player = usePlayer();
  const setRange = useAtomSet(rangeAtom);
  return useCallback(
    ({ from, to }: Range) => {
      setRange(Option.some({ from, to }));
      if (Option.isSome(player)) {
        player.value.seek(from);
      }
    },
    [player, setRange],
  );
};
