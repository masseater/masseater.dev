import { Array, Effect, FileSystem, HashMap, Option, Path, String, pipe } from "effect";

import { normalizePng } from "#/shared/preview/index.ts";

import type { ImageSource } from "./blend-material.ts";
import type { Part } from "./blend-scene.ts";

const RELATIVE = "//";
const FOLDERS: readonly string[] = ["", "textures", "Textures", "texture", "tex"];

const candidatesOf = (path: Path.Path, blend: string, filepath: string): readonly string[] => {
  const normalized = pipe(filepath, String.replaceAll("\\", "/"));
  const folder = path.dirname(blend);
  const name = path.basename(normalized);
  const direct = Option.match(Option.liftPredicate(normalized, String.startsWith(RELATIVE)), {
    onNone: () => normalized,
    onSome: (relative) => path.join(folder, pipe(relative, String.slice(RELATIVE.length))),
  });
  return pipe(
    FOLDERS,
    Array.map((child) => path.join(folder, child, name)),
    Array.prepend(direct),
    Array.filter(String.isNonEmpty),
    Array.dedupe,
  );
};

const fromDisk = Effect.fn("fromDisk")(function* fromDisk(blend: string, filepath: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const candidates = candidatesOf(path, blend, filepath);
  const found = yield* pipe(
    candidates,
    Effect.filter((candidate) => Effect.orElseSucceed(fileSystem.exists(candidate), () => false)),
  );
  return yield* pipe(Array.head(found), Effect.fromOption, Effect.flatMap(fileSystem.readFile));
});

const pngOf = (
  blend: string,
  source: ImageSource,
): Effect.Effect<
  Option.Option<readonly [number, Uint8Array]>,
  never,
  FileSystem.FileSystem | Path.Path
> =>
  pipe(
    Option.match(source.packed, {
      onNone: () => fromDisk(blend, source.filepath),
      onSome: Effect.succeed,
    }),
    Effect.flatMap((bytes) => normalizePng(blend, bytes)),
    Effect.map((png) => [source.key, png] as const),
    Effect.option,
  );

/** @internal */
export const texturesOf = Effect.fn("texturesOf")(function* texturesOf(
  blend: string,
  parts: readonly Part[],
) {
  const sources = pipe(
    parts,
    Array.filter(({ uvs }) => Option.isSome(uvs)),
    Array.flatMap(({ groups }) => groups),
    Array.map(({ surface }) => surface.image),
    Array.getSomes,
    Array.dedupeWith((left, right) => left.key === right.key),
  );
  const loaded = yield* pipe(
    sources,
    Effect.forEach((source) => pngOf(blend, source)),
  );
  return HashMap.fromIterable(Array.getSomes(loaded));
});
