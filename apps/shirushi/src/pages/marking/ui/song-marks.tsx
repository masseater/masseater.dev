import { useAtomSet } from "@effect/atom-react";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { MarkList, removeAtom, useMarks } from "#/entities/mark/index.ts";
import { useSongLink } from "#/entities/song/index.ts";
import { rangeAtom } from "#/features/mark-range/index.ts";
import { usePlayer } from "#/features/play-song/index.ts";
import type { Mark } from "#protocol";

export const SongMarks = (): ReactNode => {
  const link = useSongLink();
  const marks = useMarks(link);
  const player = usePlayer();
  const setRange = useAtomSet(rangeAtom);
  const remove = useAtomSet(removeAtom);
  const pick = useCallback(
    ({ from, to }: Mark) => {
      setRange(Option.some({ from, to }));
      if (Option.isSome(player)) {
        player.value.seek(from);
      }
    },
    [player, setRange],
  );
  const removeOne = useCallback(
    (id: string) => {
      remove({ id, link });
    },
    [remove, link],
  );
  return <MarkList marks={marks} showSong={false} onPick={pick} onRemove={removeOne} />;
};
