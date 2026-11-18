import type { Song } from "@masseater.dev/yogoto-protocol";
import type { ReactNode } from "react";

import { SongFacts } from "#/entities/song/index.ts";

import { SongHeading } from "./song-heading.tsx";

export const SongTitle = ({ song }: Readonly<{ song: Song }>): ReactNode => (
  <div className="flex min-w-0 flex-wrap items-center gap-4">
    <SongHeading song={song} />
    <SongFacts song={song} />
  </div>
);
