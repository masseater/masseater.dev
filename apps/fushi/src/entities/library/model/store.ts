import { useAtomSet, useAtomValue } from "@effect/atom-react";
import { Effect, Option, Schema } from "effect";
import { AsyncResult, AtomRegistry } from "effect/reactivity";

import { fetchBaselines, fetchLibraryText, saveLibraryText } from "#/shared/api/index.ts";
import { loadedOf, runtime } from "#/shared/lib/index.ts";
import type { Loaded } from "#/shared/lib/index.ts";

import { EMPTY_LIBRARY, LibrarySchema } from "./library.ts";
import type { Change, Library } from "./library.ts";

const LibraryJson = Schema.fromJsonString(LibrarySchema);

const decode = Schema.decodeEffect(LibraryJson);

const encode = Schema.encodeEffect(LibraryJson);

const fetchLibrary = fetchLibraryText.pipe(
  Effect.flatMap(
    Option.match({
      onNone: () => Effect.succeed(EMPTY_LIBRARY),
      onSome: (text) => decode(text),
    }),
  ),
);

/** @internal */
export const libraryAtom = runtime.atom(fetchLibrary);

const baselinesAtom = runtime.atom(fetchBaselines);

/** @internal */
export const changed = Effect.fnUntraced(function* changed(change: Change) {
  const library = yield* fetchLibrary;
  yield* encode(change(library)).pipe(Effect.flatMap(saveLibraryText));
  const registry = yield* AtomRegistry.AtomRegistry;
  registry.refresh(libraryAtom);
});

const changeAtom = runtime.fn(changed);

export const useLibrary = (): Loaded<Library> => {
  const result = useAtomValue(libraryAtom);
  return loadedOf(result);
};

export const useBaselines = (): readonly string[] =>
  AsyncResult.getOrElse(useAtomValue(baselinesAtom), () => []);

export const useChange = (): ((change: Change) => void) => useAtomSet(changeAtom);
