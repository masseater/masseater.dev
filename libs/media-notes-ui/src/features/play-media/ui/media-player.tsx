import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { keyOf, openedAtom } from "#src/entities/media/index.ts";
import { stageAtom, usePlayer } from "#src/features/play-media/model/player.ts";

const FRAME =
  "size-full [&>iframe]:size-full [&>iframe]:border-0 [&>video]:size-full [&>video]:object-contain";

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

export const MediaPlayer = (): ReactNode =>
  Option.match(useAtomValue(openedAtom), {
    onNone: () => false,
    onSome: ({ media, location }) => (
      <div className="aspect-video w-full overflow-hidden rounded-md bg-black">
        <Stage key={`${keyOf(media.source)}:${location}`} />
      </div>
    ),
  });
