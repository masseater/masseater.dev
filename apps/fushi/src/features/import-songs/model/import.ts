import { Array as Arr, DateTime, Effect } from "effect";
import { SecureRandom } from "effect/crypto";
import { Atom, AtomRegistry } from "effect/reactivity";

import { changed, withSongs } from "#/entities/library/index.ts";
import type { Song } from "#/entities/library/index.ts";
import { runtime } from "#/shared/lib/index.ts";

import { songOf } from "./convert.ts";
import type { UnreadableFile } from "./convert.ts";

export type Outcome =
  | Readonly<{ status: "idle" }>
  | Readonly<{ status: "reading"; files: number }>
  | Readonly<{ status: "done"; added: readonly Song[]; failed: readonly UnreadableFile[] }>;

const IDLE: Outcome = { status: "idle" };

/** @internal */
export const outcomeAtom = Atom.family((_style: string) =>
  Atom.make<Outcome>(IDLE).pipe(Atom.keepAlive),
);

/** @internal */
export const hoveringAtom = Atom.make(false);

const read = Effect.fnUntraced(function* read(style: string, file: File) {
  const random = yield* SecureRandom.SecureRandom;
  const id = yield* random.uuidV4();
  const now = yield* DateTime.now;
  const buffer = yield* Effect.promise(() => file.arrayBuffer());
  return yield* songOf({ id, style, imported: DateTime.formatIso(now) })({
    name: file.name,
    bytes: new Uint8Array(buffer),
  });
});

export type Dropped = Readonly<{ style: string; files: readonly File[] }>;

const imported = Effect.fnUntraced(function* imported({ style, files }: Dropped) {
  const registry = yield* AtomRegistry.AtomRegistry;
  registry.set(outcomeAtom(style), { status: "reading", files: files.length });
  const results = yield* Effect.forEach(files, (file) => Effect.result(read(style, file)), {
    concurrency: 1,
  });
  const added = Arr.getSuccesses(results);
  yield* changed(withSongs(added));
  registry.set(outcomeAtom(style), { status: "done", added, failed: Arr.getFailures(results) });
});

/** @internal */
export const importAtom = runtime.fn(imported);
