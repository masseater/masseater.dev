import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";

import { THUMBNAIL, summaryOf } from "#/entities/song/index.ts";
import type { Song } from "#/entities/song/index.ts";

export const SongItem = ({ song }: Readonly<{ song: Song }>): ReactNode => (
  <li>
    <Link
      className="group flex flex-wrap items-baseline gap-x-4 gap-y-3"
      params={song}
      to="/ai-produced/$slug"
    >
      <img
        alt=""
        className="h-auto w-full"
        decoding="async"
        height={THUMBNAIL.height}
        src={song.thumbnail}
        width={THUMBNAIL.width}
      />
      <span className="font-display group-hover:text-foreground/70 text-xl font-light transition-colors">
        {song.title}
      </span>
      <span className="text-foreground/70 text-sm">{summaryOf(song)}</span>
    </Link>
  </li>
);
