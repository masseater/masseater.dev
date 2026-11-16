import type { ReactNode } from "react";

import { THUMBNAIL, factsOf, songPath, thumbnailPath } from "#/pages/ai-produced/model/songs.ts";
import type { Song } from "#/pages/ai-produced/model/songs.ts";

export const SongItem = ({ song }: Readonly<{ song: Song }>): ReactNode => (
  <li>
    <a className="group flex flex-wrap items-baseline gap-x-4 gap-y-3" href={songPath(song)}>
      <img
        alt=""
        className="h-auto w-full"
        decoding="async"
        height={THUMBNAIL.height}
        src={thumbnailPath(song)}
        width={THUMBNAIL.width}
      />
      <span className="font-display group-hover:text-foreground/70 text-xl font-light transition-colors">
        {song.title}
      </span>
      <span className="text-foreground/70 text-sm">{factsOf(song)}</span>
    </a>
  </li>
);
