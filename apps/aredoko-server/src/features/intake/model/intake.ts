import { Array, Effect, FileSystem, Number, Path, pipe } from "effect";

import { isCompanion, isLoose, isPackage, isZip } from "#entities/package";

import { bundleCount, placedCount } from "./counts.ts";
import { libraryFolder } from "./library-folder.ts";
import { placeFile } from "./place-file.ts";
import { unzipPackages } from "./unzip-packages.ts";

const NONE = 0;

const isAsset = (name: string): boolean => isLoose(name) || isCompanion(name);

const copyInto = Effect.fn("copyInto")(function* copyFileInto(file: string, folder: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const { size } = yield* fileSystem.stat(file);
  return yield* placeFile({
    folder,
    name: path.basename(file),
    size: globalThis.Number(size),
    write: (partial) => fileSystem.copyFile(file, partial),
  });
});

const siblingsOf = Effect.fn("siblingsOf")(function* companionSiblings(file: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const folder = path.dirname(file);
  const stem = path.parse(file).name;
  const names = yield* fileSystem.readDirectory(folder);
  return pipe(
    names,
    Array.filter((name) => isCompanion(name) && path.parse(name).name === stem),
    Array.map((name) => path.join(folder, name)),
  );
});

const takeAsset = Effect.fn("takeAsset")(function* takeAsset(file: string, library: string) {
  const path = yield* Path.Path;
  const folder = path.join(library, path.parse(file).name);
  const siblings = yield* siblingsOf(file);
  const placed = yield* pipe(
    [file, ...siblings],
    Effect.forEach((member) => copyInto(member, folder)),
  );
  return bundleCount(placed);
});

const takeFile = Effect.fn("takeFile")(function* takeFile(file: string, library: string) {
  if (isZip(file)) {
    return yield* unzipPackages(file, library);
  }
  if (isPackage(file)) {
    const placed = yield* copyInto(file, library);
    return placedCount([placed]);
  }
  if (!isLoose(file)) {
    return NONE;
  }
  return yield* takeAsset(file, library);
});

const takeFolder = Effect.fn("takeFolder")(function* takeFolder(folder: string, library: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const names = yield* fileSystem.readDirectory(folder, { recursive: true });
  const archives = yield* pipe(
    names,
    Array.filter((name) => isPackage(name) || isZip(name)),
    Effect.forEach((name) => takeFile(path.join(folder, name), library)),
  );
  const target = path.join(library, path.basename(folder));
  const assets = yield* pipe(
    names,
    Array.filter(isAsset),
    Effect.forEach((name) =>
      copyInto(path.join(folder, name), path.join(target, path.dirname(name))),
    ),
  );
  return Number.sumAll([...archives, bundleCount(assets)]);
});

const takeIn = Effect.fn("takeIn")(function* takeIn(dropped: string, library: string) {
  const fileSystem = yield* FileSystem.FileSystem;
  const info = yield* fileSystem.stat(dropped);
  if (info.type === "Directory") {
    return yield* takeFolder(dropped, library);
  }
  return yield* takeFile(dropped, library);
});

/** @internal */
const intake = Effect.fn("intake")(function* intakeFiles(dropped: readonly string[]) {
  const library = yield* libraryFolder;
  const placed = yield* pipe(
    dropped,
    Effect.forEach((file) => takeIn(file, library)),
  );
  return Number.sumAll(placed);
});

export { intake };
