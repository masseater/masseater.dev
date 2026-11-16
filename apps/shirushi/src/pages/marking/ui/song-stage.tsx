import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { SongMeta } from "#/entities/song/index.ts";
import { Timeline, useMarkKey } from "#/features/mark-range/index.ts";
import { SongPlayer, usePlayer, usePosition } from "#/features/play-song/index.ts";
import type { Song } from "#/shared/api/index.ts";

import { KeyHint } from "./key-hint.tsx";

export const SongStage = ({ song }: Readonly<{ song: Song }>): ReactNode => {
  const player = usePlayer();
  const position = usePosition();
  useMarkKey(player);
  const seek = useCallback(
    (seconds: number) => {
      if (Option.isSome(player)) {
        player.value.seek(seconds);
      }
    },
    [player],
  );
  return (
    <section className="grid content-start gap-3 lg:col-span-2">
      <SongMeta song={song} duration={position.duration} />
      <SongPlayer />
      <Timeline position={position} seek={seek} />
      <KeyHint />
    </section>
  );
};
