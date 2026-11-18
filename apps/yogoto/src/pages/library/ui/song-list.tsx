import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { useSongs } from "#/entities/song/index.ts";

import { SongItem } from "./song-item.tsx";

export const SongList = (): ReactNode => {
  const songs = useSongs();
  return (
    <ul className="grid gap-2">
      {pipe(
        songs,
        Arr.map((song) => <SongItem key={song.id} song={song} />),
      )}
    </ul>
  );
};
