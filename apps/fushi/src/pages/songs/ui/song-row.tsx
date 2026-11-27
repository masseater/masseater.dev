import { Option, String as Str } from "effect";
import type { ReactNode } from "react";

import type { Song } from "#/entities/library/index.ts";
import { hrefOf } from "#/shared/lib/index.ts";

const START = 0;

const DAY = 10;

export const SongRow = ({ song }: Readonly<{ song: Song }>): ReactNode => (
  <li className="flex items-baseline justify-between gap-3 border-b p-2 text-sm">
    <a
      className="underline-offset-2 hover:underline"
      href={hrefOf({ page: "songs", style: song.style, song: Option.some(song.id) })}
    >
      {song.name}
    </a>
    <span className="text-muted-foreground text-xs tabular-nums">
      {Str.slice(START, DAY)(song.imported)}
    </span>
  </li>
);
