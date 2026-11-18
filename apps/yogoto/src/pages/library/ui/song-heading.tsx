import type { Song } from "@masseater.dev/yogoto-protocol";
import type { ReactNode } from "react";

export const SongHeading = ({ song }: Readonly<{ song: Song }>): ReactNode => (
  <hgroup className="grid min-w-0">
    <h1 className="truncate text-xl font-semibold">{song.title}</h1>
    <p className="text-muted-foreground truncate text-sm">{song.artist}</p>
  </hgroup>
);
