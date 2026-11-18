import { useAtomSet } from "@effect/atom-react";
import type { Song } from "@masseater.dev/yogoto-protocol";
import { Option } from "effect";
import { useCallback } from "react";
import type { ReactNode } from "react";

import { SongRow, selectedAtom, useSelectedSong } from "#/entities/song/index.ts";

import { SongStatus } from "./song-status.tsx";

export const SongItem = ({ song }: Readonly<{ song: Song }>): ReactNode => {
  const select = useAtomSet(selectedAtom);
  const current = useSelectedSong();
  const selected = Option.exists(current, ({ id }) => id === song.id);
  const handleSelect = useCallback(() => {
    select(Option.some(song.id));
  }, [select, song.id]);
  return (
    <li>
      <SongRow song={song} selected={selected} onSelect={handleSelect}>
        <SongStatus song={song} />
      </SongRow>
    </li>
  );
};
