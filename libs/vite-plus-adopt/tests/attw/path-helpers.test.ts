import { layer } from "@effect/vitest";
import { deepStrictEqual } from "@effect/vitest/utils";
import { Effect, Layer } from "effect";

import {
  getTypesPackageName,
  mangleScopedPackageName,
  unmangleScopedPackageName,
} from "#src/attw/package-names.ts";
import { getRootLength } from "#src/attw/path-roots.ts";
import {
  combinePaths,
  getDirectoryPath,
  getNormalizedAbsolutePath,
  getPathComponents,
  normalizePath,
} from "#src/attw/paths.ts";

import { expected, inputs } from "./differential-data.ts";
import type { ExpectedPackageNameData, ExpectedPathData } from "./differential-data.ts";

const matchesPath = (entry: ExpectedPathData): Effect.Effect<void> =>
  Effect.sync(() => {
    deepStrictEqual(
      {
        path: entry.path,
        rootLength: getRootLength(entry.path),
        normalized: normalizePath(entry.path),
        absolute: getNormalizedAbsolutePath(entry.path, "/base/dir"),
        directory: getDirectoryPath(entry.path),
        combined: combinePaths("/base", entry.path),
        components: getPathComponents(entry.path),
      },
      entry,
    );
  });

const matchesPackageName = (entry: ExpectedPackageNameData): Effect.Effect<void> =>
  Effect.sync(() => {
    deepStrictEqual(
      {
        name: entry.name,
        mangled: mangleScopedPackageName(entry.name),
        unmangled: unmangleScopedPackageName(entry.name),
        typesPackage: getTypesPackageName(entry.name),
      },
      entry,
    );
  });

const coversEveryInput = Effect.sync(() => {
  deepStrictEqual(
    [expected.paths.map(({ path }) => path), expected.packageNames.map(({ name }) => name)],
    [inputs.paths, inputs.packageNames],
  );
});

layer(Layer.empty)("path helpers match TypeScript 5.6", (it) => {
  for (const entry of expected.paths) {
    it.effect(entry.path, () => matchesPath(entry));
  }
});

layer(Layer.empty)("package name mangling matches TypeScript 5.6", (it) => {
  for (const entry of expected.packageNames) {
    it.effect(entry.name, () => matchesPackageName(entry));
  }
  it.effect("covers every path and name in the fixtures", () => coversEveryInput);
});
