import { Array as Arr, Option, pipe } from "effect";
import type { ReactNode } from "react";

import { songsOf } from "#/entities/library/index.ts";
import type { Library, Style } from "#/entities/library/index.ts";
import { LABELS } from "#/shared/config/index.ts";
import { Title } from "#/shared/ui/index.ts";

import { SongDetail } from "./song-detail.tsx";
import { SongRow } from "./song-row.tsx";

export const SongsPage = ({
  library,
  current: style,
  song,
}: Readonly<{ library: Library; current: Style; song: Option.Option<string> }>): ReactNode => {
  const songs = songsOf(library)(style.id);
  return pipe(
    song,
    Option.flatMap((id) =>
      pipe(
        songs,
        Arr.findFirst((each) => each.id === id),
      ),
    ),
    Option.match({
      onSome: (found) => <SongDetail key={found.id} song={found} />,
      onNone: () => (
        <div className="grid gap-3">
          <Title>{LABELS.songs}</Title>
          <ul>
            {pipe(
              songs,
              Arr.map((each) => <SongRow key={each.id} song={each} />),
            )}
          </ul>
        </div>
      ),
    }),
  );
};
