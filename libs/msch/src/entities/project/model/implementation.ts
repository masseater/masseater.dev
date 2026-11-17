import { Array as Arr, Boolean as Bool, Effect, String as Str, pipe } from "effect";

import { contentKey } from "#/shared/lib/pass-records.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { installedPackages, nearestManifestDirectory } from "./inputs.ts";

const MANIFEST_ENTRY = "package.json";
const SOURCE_ENTRY = "src";
const LOWER_LAYERS = ["entities", "shared"] as const;
const PATH_SEPARATOR = "/";
const NOT_INSTALLED: readonly string[] = [];

const walked = (directory: string): Effect.Effect<readonly string[], never, RepositoryFiles> =>
  Effect.gen(function* walkFrom() {
    const files = yield* RepositoryFiles;
    const found = yield* files.walkDirectory(directory);
    return pipe(
      found,
      Arr.map((file) => files.join(directory, file)),
    );
  });

const sourceFiles = Effect.fn("sourceFiles")(function* sourceFiles(
  root: string,
  moduleDirectory: string,
) {
  const files = yield* RepositoryFiles;
  const source = files.join(root, SOURCE_ENTRY);
  const layers = pipe(
    LOWER_LAYERS,
    Arr.map((layer) => files.join(source, layer)),
  );
  const nested = yield* Effect.forEach([files.dirname(moduleDirectory), ...layers], walked, {
    concurrency: 1,
  });
  return Arr.flatten(nested);
});

const bundleParts = Effect.fn("bundleParts")(function* bundleParts(
  root: string,
  moduleDirectory: string,
) {
  const files = yield* RepositoryFiles;
  const bundled = yield* walked(moduleDirectory);
  return { listed: [files.join(root, MANIFEST_ENTRY), ...bundled], installed: NOT_INSTALLED };
});

const sourceParts = Effect.fn("sourceParts")(function* sourceParts(
  root: string,
  moduleDirectory: string,
) {
  const listed = yield* sourceFiles(root, moduleDirectory);
  const installed = yield* installedPackages(root, root);
  return { listed, installed };
});

/** @internal */
export const implementationOf = Effect.fn("implementationOf")(function* implementationOf(
  moduleDirectory: string,
) {
  const files = yield* RepositoryFiles;
  const root = yield* nearestManifestDirectory(moduleDirectory);
  const fromSource = Str.startsWith(`${files.join(root, SOURCE_ENTRY)}${PATH_SEPARATOR}`)(
    moduleDirectory,
  );
  const parts = yield* Bool.match(fromSource, {
    onFalse: () => bundleParts(root, moduleDirectory),
    onTrue: () => sourceParts(root, moduleDirectory),
  });
  return {
    files: pipe(
      Arr.sort(parts.listed, Str.Order),
      Arr.map((file) => [files.relative(root, file), file] as const),
    ),
    installed: parts.installed,
  };
});

export const implementationFingerprint = Effect.fn("implementationFingerprint")(
  function* implementationFingerprint(moduleDirectory: string) {
    const implementation = yield* implementationOf(moduleDirectory);
    return yield* contentKey(implementation.installed, implementation.files);
  },
);
