import { Option } from "effect";
import { FileMusic } from "lucide-react";
import type { ReactNode } from "react";

import type { Song } from "#/entities/library/index.ts";
import { hrefOf } from "#/shared/lib/index.ts";

export const AddedSong = ({ song }: Readonly<{ song: Song }>): ReactNode => (
  <li className="flex items-center gap-2 text-sm">
    <FileMusic className="text-muted-foreground size-4" aria-hidden />
    <a
      className="underline-offset-2 hover:underline"
      href={hrefOf({ page: "songs", style: song.style, song: Option.some(song.id) })}
    >
      {song.name}
    </a>
  </li>
);
