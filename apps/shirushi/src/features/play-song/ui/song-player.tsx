import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { songAtom } from "#/entities/song";
import { stageAtom, usePlayer } from "#/features/play-song/model/player";

const FRAME = "size-full [&>iframe]:size-full [&>iframe]:border-0";

const Stage = (): ReactNode => {
  const setStage = useAtomSet(stageAtom);
  usePlayer();
  const attach = useCallback(
    (stage: HTMLElement | null): (() => void) => {
      setStage(Option.fromNullishOr(stage));
      return () => {
        setStage(Option.none());
      };
    },
    [setStage],
  );
  return (
    <div className="size-full">
      <div ref={attach} className={FRAME} />
    </div>
  );
};

export const SongPlayer = (): ReactNode =>
  Option.match(useAtomValue(songAtom), {
    onNone: () => false,
    onSome: (song) => (
      <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
        <Stage key={`${song.source.site}:${song.source.id}`} />
      </div>
    ),
  });
