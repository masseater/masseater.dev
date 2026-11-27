import { Button } from "@masseater.dev/ui/button";
import { Array as Arr, pipe } from "effect";
import type { ReactNode } from "react";

import type { Song } from "#/entities/library/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import { hrefOf } from "#/shared/lib/index.ts";

import { SongLink } from "./song-link.tsx";

export const SongLinks = ({
  current: style,
  songs,
}: Readonly<{ current: string; songs: readonly Song[] }>): ReactNode =>
  pipe(
    songs,
    Arr.match({
      onEmpty: () => (
        <Button asChild className="justify-self-start">
          <a href={hrefOf({ page: "import", style })}>{LABELS.importSongs}</a>
        </Button>
      ),
      onNonEmpty: (some) => (
        <ul>
          {pipe(
            some,
            Arr.map((song) => <SongLink key={song.id} song={song} />),
          )}
        </ul>
      ),
    }),
  );
