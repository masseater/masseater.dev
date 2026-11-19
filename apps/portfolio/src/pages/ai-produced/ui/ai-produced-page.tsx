import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { songs } from "#/entities/song/index.ts";
import { sectionMeta } from "#/shared/config/index.ts";
import { imagePriority } from "#/shared/lib/index.ts";

import { SongItem } from "./song-item.tsx";

export const AiProducedPage = (): ReactNode => (
  <div className="flex flex-col" data-wide>
    <h1 className="sr-only">{sectionMeta["ai-produced"].title}</h1>
    <ul className="flex flex-col gap-12" role="list">
      {pipe(
        songs,
        Arr.map((song, index) => (
          <SongItem key={song.slug} priority={imagePriority(index)} song={song} />
        )),
      )}
    </ul>
  </div>
);
