import { Array, Effect, FileSystem, Path, String, pipe } from "effect";

import { hasExtension } from "./file-name.ts";
import { kindOf } from "./kind.ts";
import { isCompanion } from "./loose.ts";

const MATERIAL_EXTENSION = ".mtl";
const LINE = "\n";

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

const referenced =
  (text: string, path: Path.Path) =>
  (name: string): boolean => {
    const base = pipe(path.basename(name), String.toLowerCase);
    return pipe(text, String.toLowerCase, String.includes(base));
  };

const namesIn = Effect.fn("namesIn")(function* namesIn(folder: Folder, text: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fileSystem.readDirectory(folder.path, { recursive: folder.recursive });
  return pipe(names, Array.filter(isNeeded), Array.filter(referenced(text, path)));
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

const textOf = (files: readonly Companion[]): string =>
  pipe(
    files,
    Array.map(({ data }) => latin1.decode(data)),
    Array.join(LINE),
  );

/** @internal */
const companionsOf = Effect.fn("companionsOf")(function* companionsOfModel(
  folder: Folder,
  model: Uint8Array,
) {
  const direct = yield* namesIn(folder, latin1.decode(model));
  const materials = yield* pipe(
    direct,
    Array.filter(isMaterialName),
    Effect.forEach((name) => readCompanion(folder, name)),
  );
  const fromMaterials = yield* namesIn(folder, textOf(materials));
  return yield* pipe(
    Array.dedupe([...direct, ...fromMaterials]),
    Effect.forEach((name) => readCompanion(folder, name)),
  );
});

export { bundleFolder, companionsOf };
export type { Folder };
