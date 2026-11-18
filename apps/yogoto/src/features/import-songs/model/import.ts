import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { Atom, AtomRegistry } from "effect/reactivity";

import { jobsAtom } from "#/entities/job/index.ts";
import { chooseAudioFiles, importSong } from "#/shared/api/index.ts";
import { runtime } from "#/shared/lib/index.ts";

/** @internal */
export const linkTextAtom = Atom.make("");

export const linesOf = (text: string): readonly string[] =>
  pipe(Str.split(text, /\s+/u), Arr.map(Str.trim), Arr.filter(Str.isNonEmpty));

const imported = Effect.fnUntraced(function* imported(locations: readonly string[]) {
  yield* Effect.forEach(locations, importSong, { discard: true, concurrency: 1 });
  const registry = yield* AtomRegistry.AtomRegistry;
  registry.refresh(jobsAtom);
});

/** @internal */
export const importAtom = runtime.fn(imported);

/** @internal */
export const chooseAtom = runtime.fn(
  Effect.fnUntraced(function* choose() {
    const files = yield* chooseAudioFiles;
    yield* imported(files);
  }),
);
