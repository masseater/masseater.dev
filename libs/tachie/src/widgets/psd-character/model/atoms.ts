import { useAtomValue } from "@effect/atom-react";
import type { MediaUtilsAudioData } from "@remotion/media-utils";
import { Array as Arr, String as Str, pipe } from "effect";
import type { Option } from "effect";
import { FetchHttpClient } from "effect/http";
import { AsyncResult, Atom } from "effect/reactivity";

import { holdRender } from "#/shared/lib/hold-render.ts";

import { loadCharacter, loadRecordings } from "./load.ts";
import type { Character, Source } from "./load.ts";

const runtime = Atom.runtime(FetchHttpClient.layer);
const SEPARATOR = "\n";

const sourceOf = (key: string): Source => {
  const [psd, favorites = ""] = Str.split(SEPARATOR)(key);
  if (favorites === "") {
    return { psd };
  }
  return { psd, favorites };
};

const characterAtom = Atom.family((key: string) => {
  const load = loadCharacter(sourceOf(key));
  return runtime.atom(load.pipe(holdRender(`Loading ${key}`)));
});

const recordingsAtom = Atom.family((key: string) => {
  const sources = pipe(Str.split(SEPARATOR)(key), Arr.filter(Str.isNonEmpty));
  const load = loadRecordings(sources);
  return runtime.atom(load.pipe(holdRender("Loading voice recordings")));
});

export const useCharacter = (source: Source): Option.Option<Character> => {
  const key = Arr.join([source.psd, source.favorites ?? ""], SEPARATOR);
  const result = useAtomValue(characterAtom(key));
  return AsyncResult.value(result);
};

export const useRecordings = (
  sources: readonly string[],
): Option.Option<ReadonlyMap<string, MediaUtilsAudioData>> => {
  const atom = recordingsAtom(Arr.join(sources, SEPARATOR));
  const result = useAtomValue(atom);
  return AsyncResult.value(result);
};
