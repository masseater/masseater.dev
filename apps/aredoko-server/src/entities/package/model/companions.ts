import { Array, Effect, FileSystem, Option, Path, String, pipe } from "effect";

import { hasExtension } from "./file-name.ts";
import { kindOf } from "./kind.ts";
import { isCompanion } from "./loose.ts";

const MATERIAL_EXTENSION = ".mtl";
const TEXT_CHUNK = 33_554_432;
const NAME_OVERLAP = 4096;
const PARENT = "..";

interface Folder {
  readonly path: string;
  readonly recursive: boolean;
}

interface Companion {
  readonly name: string;
  readonly data: Uint8Array;
}

const latin1 = new TextDecoder("latin1");

const isMaterialName = hasExtension(MATERIAL_EXTENSION);

const isNeeded = (name: string): boolean => kindOf(name) === "texture" || isCompanion(name);

/** @internal */
const bundleFolder = Effect.fn("bundleFolder")(function* bundleFolderOf(packagePath: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const info = yield* fileSystem.stat(packagePath);
  if (info.type === "Directory") {
    return { path: packagePath, recursive: true } satisfies Folder;
  }
  return { path: path.dirname(packagePath), recursive: false } satisfies Folder;
});

const FIRST_CHUNK = 0;
const NEXT = 1;
const SAME_FOLDER = ".";

const chunkText =
  (bytes: Uint8Array) =>
  (index: number): string => {
    const start = index * TEXT_CHUNK;
    const end = start + TEXT_CHUNK + NAME_OVERLAP;
    return pipe(latin1.decode(bytes.subarray(start, end)), String.toLowerCase);
  };

const textsOf = (bytes: Uint8Array): readonly string[] => {
  const last = Math.max(Math.ceil(bytes.length / TEXT_CHUNK) - NEXT, FIRST_CHUNK);
  return pipe(Array.range(FIRST_CHUNK, last), Array.map(chunkText(bytes)));
};

const referenced =
  (texts: readonly string[], path: Path.Path) =>
  (name: string): boolean => {
    const base = pipe(path.basename(name), String.toLowerCase);
    return pipe(texts, Array.some(String.includes(base)));
  };

const namesIn = Effect.fn("namesIn")(function* namesIn(folder: Folder, texts: readonly string[]) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fileSystem.readDirectory(folder.path, { recursive: folder.recursive });
  return pipe(names, Array.filter(isNeeded), Array.filter(referenced(texts, path)));
});

const readCompanion = Effect.fn("readCompanion")(function* readCompanionFile(
  folder: Folder,
  name: string,
) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const data = yield* fileSystem.readFile(path.join(folder.path, name));
  return { name, data } satisfies Companion;
});

/** @internal */
const companionNamesOf = Effect.fn("companionNamesOf")(function* companionNamesOfModel(
  folder: Folder,
  model: Uint8Array,
) {
  const direct = yield* namesIn(folder, textsOf(model));
  const materials = yield* pipe(
    direct,
    Array.filter(isMaterialName),
    Effect.forEach((name) => readCompanion(folder, name)),
  );
  const fromMaterials = yield* namesIn(
    folder,
    pipe(
      materials,
      Array.flatMap(({ data }) => textsOf(data)),
    ),
  );
  return Array.dedupe([...direct, ...fromMaterials]);
});

/** @internal */
const companionsOf = Effect.fn("companionsOf")(function* companionsOfModel(
  folder: Folder,
  model: Uint8Array,
) {
  const names = yield* companionNamesOf(folder, model);
  return yield* pipe(
    names,
    Effect.forEach((name) => readCompanion(folder, name)),
  );
});

/** @internal */
const companionPath = Effect.fn("companionPath")(function* companionPathIn(
  folder: Folder,
  name: string,
) {
  const path = yield* Path.Path;
  const resolved = path.resolve(folder.path, name);
  const relative = path.relative(folder.path, resolved);
  const inside =
    isNeeded(name) &&
    !path.isAbsolute(relative) &&
    !pipe(relative, String.split(path.sep), Array.contains(PARENT)) &&
    (folder.recursive || path.dirname(relative) === SAME_FOLDER);
  return Option.liftPredicate(resolved, () => inside);
});

export { bundleFolder, companionNamesOf, companionPath, companionsOf };
export type { Folder };
