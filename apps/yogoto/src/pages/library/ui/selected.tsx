import type { Song } from "@masseater.dev/yogoto-protocol";
import { Option } from "effect";
import type { ReactNode } from "react";

import { useSelectedSong } from "#/entities/song/index.ts";
import { LABELS } from "#/shared/config/index.ts";

import { EmptyNote } from "./empty-note.tsx";
import { SongDetail } from "./song-detail.tsx";

const empty = (): ReactNode => <EmptyNote text={LABELS.empty} />;

const detail = (song: Song): ReactNode => <SongDetail song={song} />;

export const Selected = (): ReactNode => {
  const selected = useSelectedSong();
  return (
    <section className="flex-1 overflow-y-auto p-5">
      {Option.match(selected, { onNone: empty, onSome: detail })}
    </section>
  );
};
