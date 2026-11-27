import { Effect, Option } from "effect";

import { changed, withoutSong } from "#/entities/library/index.ts";
import type { Song } from "#/entities/library/index.ts";
import { navigate, runtime } from "#/shared/lib/index.ts";

/** @internal */
export const removeAtom = runtime.fn((song: Song) =>
  changed(withoutSong(song.id)).pipe(
    Effect.tap(() =>
      Effect.sync(() => {
        navigate({ page: "songs", style: song.style, song: Option.none() });
      }),
    ),
  ),
);
