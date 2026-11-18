import type { Song } from "@masseater.dev/yogoto-protocol";
import type { ReactNode } from "react";

export const SongName = ({ song }: Readonly<{ song: Song }>): ReactNode => (
  <span className="grid min-w-0">
    <span className="truncate text-sm font-medium">{song.title}</span>
    <span className="text-muted-foreground truncate text-xs">{song.artist}</span>
  </span>
);
