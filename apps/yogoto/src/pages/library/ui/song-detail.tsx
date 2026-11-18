import { useAtomValue } from "@effect/atom-react";
import type { Song } from "@masseater.dev/yogoto-protocol";
import { AsyncResult } from "effect/reactivity";
import type { ReactNode } from "react";

import { useModels } from "#/entities/song/index.ts";
import { folderAtom } from "#/pages/library/model/folder.ts";

import { SongActions } from "./song-actions.tsx";
import { SongStems } from "./song-stems.tsx";
import { SongTitle } from "./song-title.tsx";

export const SongDetail = ({ song }: Readonly<{ song: Song }>): ReactNode => {
  const models = useModels();
  const folder = AsyncResult.getOrElse(useAtomValue(folderAtom(song.id)), () => "");
  return (
    <article className="grid content-start gap-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <SongTitle song={song} />
        <SongActions songId={song.id} models={models} />
      </header>
      <SongStems song={song} folder={folder} />
    </article>
  );
};
