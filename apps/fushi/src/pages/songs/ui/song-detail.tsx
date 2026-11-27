import type { ReactNode } from "react";

import type { Song } from "#/entities/library/index.ts";
import { RemoveSongButton } from "#/features/remove-song/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import { Subtitle, Title } from "#/shared/ui/index.ts";

import { SongBody } from "./song-body.tsx";

export const SongDetail = ({ song }: Readonly<{ song: Song }>): ReactNode => (
  <div className="grid gap-3">
    <p className="text-muted-foreground text-xs">{song.file}</p>
    <Title>{song.name}</Title>
    <SongBody fumx={song.fumx} />
    <Subtitle>{LABELS.import}</Subtitle>
    <RemoveSongButton song={song} />
  </div>
);
