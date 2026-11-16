import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import { songs } from "#/pages/ai-produced/model/songs";
import { sectionMeta } from "#/shared/config";

import { SongItem } from "./song-item";

export const AiProducedPage = (): ReactNode => (
  <div className="flex flex-col" data-wide>
    <h1 className="sr-only">{sectionMeta["ai-produced"].title}</h1>
    <ul className="flex flex-col gap-12">
      {pipe(
        songs,
        Arr.map((song) => <SongItem key={song.slug} song={song} />),
      )}
    </ul>
  </div>
);
