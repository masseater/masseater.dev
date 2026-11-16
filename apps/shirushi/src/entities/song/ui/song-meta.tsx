import type { Site, Song } from "@masseater.dev/shirushi-protocol";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

import { clock, pageOf } from "#/shared/lib/source";

const SITE_NAMES: Readonly<Record<Site, string>> = {
  youtube: "YouTube",
  niconico: "ニコニコ",
  soundcloud: "SoundCloud",
};

export const SongMeta = ({
  song,
  duration,
}: Readonly<{ song: Song; duration: number }>): ReactNode => (
  <header className="flex min-w-0 items-baseline gap-3">
    <span className="text-muted-foreground text-xs">{SITE_NAMES[song.source.site]}</span>
    <h1 className="min-w-0 truncate text-base font-semibold">{song.title}</h1>
    <span className="text-muted-foreground truncate text-sm">{song.artist}</span>
    <span className="text-muted-foreground ml-auto font-mono text-xs tabular-nums">
      {clock(duration)}
    </span>
    <a
      href={pageOf(song.source)}
      target="_blank"
      rel="noreferrer"
      aria-label="元のページ"
      className="text-muted-foreground hover:text-foreground self-center"
    >
      <ExternalLink className="size-4" />
    </a>
  </header>
);
