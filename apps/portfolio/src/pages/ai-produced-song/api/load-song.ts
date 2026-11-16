import { notFound } from "@tanstack/react-router";
import { Effect, pipe } from "effect";

import { songOf } from "#/entities/song/index.ts";
import type { Song } from "#/entities/song/index.ts";

export const loadSong = ({ slug }: Readonly<{ slug: string }>): Promise<Song> =>
  pipe(
    songOf(slug),
    Effect.fromOption,
    Effect.mapError(() => notFound()),
    Effect.runPromise,
  );
