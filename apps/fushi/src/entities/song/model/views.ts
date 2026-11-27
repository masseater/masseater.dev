import { useAtomValue } from "@effect/atom-react";
import { Effect, Option } from "effect";
import { Atom } from "effect/reactivity";

import { loadedOf, runtime } from "#/shared/lib/index.ts";
import type { Loaded } from "#/shared/lib/index.ts";

import { parsedSongOf, viewOf } from "./song-view.ts";
import type { SongView } from "./song-view.ts";

const NAME = "song";

const viewIn = (fumx: string): Effect.Effect<Option.Option<SongView>> =>
  parsedSongOf({ name: NAME, fumx }).pipe(Effect.map(Option.map(viewOf)));

const viewAtom = Atom.family((fumx: string) => runtime.atom(viewIn(fumx)));

export const useSongView = (fumx: string): Loaded<Option.Option<SongView>> => {
  const result = useAtomValue(viewAtom(fumx));
  return loadedOf(result);
};
