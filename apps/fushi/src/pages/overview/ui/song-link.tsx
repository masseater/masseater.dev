import { Option } from "effect";
import type { ReactNode } from "react";

import type { Song } from "#/entities/library/index.ts";
import { hrefOf } from "#/shared/lib/index.ts";

export const SongLink = ({ song }: Readonly<{ song: Song }>): ReactNode => (
  <li className="grid border-b p-2 text-sm">
    <a
      className="underline-offset-2 hover:underline"
      href={hrefOf({ page: "songs", style: song.style, song: Option.some(song.id) })}
    >
      {song.name}
    </a>
    <span className="text-muted-foreground text-xs">{song.file}</span>
  </li>
);
