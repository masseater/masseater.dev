import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { FixtureFiles, directoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { implementationFingerprint, implementationOf } from "./implementation.ts";

const SLICE_FILE = "src/features/owners/model/cache.ts";
const OTHER_SLICE_FILE = "src/features/other/index.ts";

const PACKAGE = {
  "package.json": '{"name":"checker"}',
  "src/app/cli.ts": "",
  [SLICE_FILE]: "",
  "src/features/owners/index.ts": "",
  [OTHER_SLICE_FILE]: "",
  "src/entities/project/index.ts": "",
  "src/shared/lib/files.ts": "",
  "dist/cli.mjs": "",
};

const SLICE = ["src", "features", "owners", "model"] as const;

const fingerprintedFrom = Effect.fn("fingerprintedFrom")(function* fingerprintedFrom(
  ...moduleDirectory: readonly string[]
) {
  const files = yield* RepositoryFiles;
  const root = yield* directoryWith(PACKAGE);
  const implementation = yield* implementationOf(files.join(root, ...moduleDirectory));
  return pipe(
    implementation.files,
    Arr.map(([name]) => name),
    Arr.filter(Str.includes(".")),
  );
});

const fingerprintsOnlyItsSliceAndLowerLayersFromSource = Effect.gen(
  function* fingerprintsOnlyItsSliceAndLowerLayersFromSource() {
    const names = yield* fingerprintedFrom(...SLICE);
    expect(names).toStrictEqual([
      "src/entities/project/index.ts",
      "src/features/owners/index.ts",
      SLICE_FILE,
      "src/shared/lib/files.ts",
    ]);
  },
);

const fingerprintsTheBundleWhenPublished = Effect.gen(
  function* fingerprintsTheBundleWhenPublished() {
    const names = yield* fingerprintedFrom("dist");
    expect(names).toStrictEqual(["dist/cli.mjs", "package.json"]);
  },
);

const fingerprintAfterEditing = Effect.fn("fingerprintAfterEditing")(
  function* fingerprintAfterEditing(edited: string) {
    const files = yield* RepositoryFiles;
    const fixtures = yield* FixtureFiles;
    const root = yield* directoryWith(PACKAGE);
    const slice = files.join(root, ...SLICE);
    const before = yield* implementationFingerprint(slice);
    yield* fixtures.writeFile(files.join(root, edited), "export {};\n");
    const after = yield* implementationFingerprint(slice);
    return { before, after };
  },
);

const changesWhenTheSliceChanges = Effect.gen(function* changesWhenTheSliceChanges() {
  const { before, after } = yield* fingerprintAfterEditing(SLICE_FILE);
  expect(after).not.toBe(before);
});

const staysWhenAnotherSliceChanges = Effect.gen(function* staysWhenAnotherSliceChanges() {
  const { before, after } = yield* fingerprintAfterEditing(OTHER_SLICE_FILE);
  expect(after).toBe(before);
});

layer(fixtureLayer)("implementation fingerprint", (it) => {
  it.effect(
    "lists only its slice and the lower layers when it runs from source",
    () => fingerprintsOnlyItsSliceAndLowerLayersFromSource,
  );
  it.effect(
    "lists the bundle when it runs from a published package",
    () => fingerprintsTheBundleWhenPublished,
  );
  it.effect("changes when a file of the slice changes", () => changesWhenTheSliceChanges);
  it.effect("stays the same when another slice changes", () => staysWhenAnotherSliceChanges);
});
