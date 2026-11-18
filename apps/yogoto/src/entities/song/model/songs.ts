import { useAtomValue } from "@effect/atom-react";
import type { ModelInfo, Song } from "@masseater.dev/yogoto-protocol";
import { Array as Arr, Option, pipe } from "effect";
import { AsyncResult, Atom } from "effect/reactivity";

import { fetchModels, fetchSongs } from "#/shared/api/index.ts";
import { runtime } from "#/shared/lib/index.ts";

/** @internal */
export const songsAtom = runtime.atom(fetchSongs);

/** @internal */
export const modelsAtom = runtime.atom(fetchModels);

/** @internal */
export const selectedAtom = Atom.make(Option.none<string>());

export const useSongs = (): readonly Song[] =>
  AsyncResult.getOrElse(useAtomValue(songsAtom), Arr.empty);

export const useModels = (): readonly ModelInfo[] =>
  AsyncResult.getOrElse(useAtomValue(modelsAtom), Arr.empty);

export const useSelectedSong = (): Option.Option<Song> => {
  const songs = useSongs();
  const selected = useAtomValue(selectedAtom);
  return pipe(
    selected,
    Option.flatMap((id) => Arr.findFirst(songs, (song) => song.id === id)),
    Option.orElse(() => Arr.head(songs)),
  );
};
