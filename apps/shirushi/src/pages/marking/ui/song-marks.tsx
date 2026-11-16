import { useAtomSet } from "@effect/atom-react";
import type { Media } from "@masseater.dev/media-notes-protocol";
import { rangeAtom, usePlayer } from "@masseater.dev/media-notes-ui";
import type { Mark } from "@masseater.dev/shirushi-protocol";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { MarkList, removeAtom, useMarks } from "#/entities/mark";

export const SongMarks = ({ media }: Readonly<{ media: Media }>): ReactNode => {
  const marks = useMarks(Option.some(media));
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
  return <MarkList marks={marks} showSong={false} onPick={pick} onRemove={remove} />;
};
