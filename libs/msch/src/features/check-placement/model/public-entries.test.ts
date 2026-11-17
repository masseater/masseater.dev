import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkPublicEntries } from "./public-entries.ts";

const WORKSPACE = "packages:\n  - libs/*\n";
const MODULE = "export const value = 1;\n";

const locationsIn = Effect.fn("locationsIn")(function* locationsIn(
  contents: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith({ "pnpm-workspace.yaml": WORKSPACE, ...contents });
  const files = yield* RepositoryFiles;
  const problems = yield* checkPublicEntries(root);
  const locations = pipe(
    problems,
    Arr.map(({ file, rule }) => `${rule} ${files.relative(root, file)}`),
  );
  return Arr.sort(locations, Str.Order);
});

const acceptsLayeredEntries = Effect.gen(function* acceptsLayeredEntries() {
  const found = yield* locationsIn({
    "libs/kit/package.json": `{ "name": "kit", "exports": { ".": "./src/app/index.ts", "./run": "./src/features/run-kit/index.ts" }, "bin": { "kit": "./bin/kit.ts" } }`,
    "libs/kit/bin/kit.ts": MODULE,
    "libs/kit/src/app/index.ts": MODULE,
    "libs/kit/src/features/run-kit/index.ts": MODULE,
  });
  expect(found).toStrictEqual([]);
});

const reportsEntriesInsideSlices = Effect.gen(function* reportsEntriesInsideSlices() {
  const found = yield* locationsIn({
    "libs/kit/package.json": `{ "name": "kit", "exports": { ".": "./src/features/run-kit/model/run.ts" } }`,
    "libs/kit/src/features/run-kit/model/run.ts": MODULE,
  });
  expect(found).toStrictEqual(["public-entry libs/kit/src/features/run-kit/model/run.ts"]);
});

layer(fixtureLayer)("public entries", (it) => {
  it.effect("accepts entries at bin/, src/app/ and slice indexes", () => acceptsLayeredEntries);
  it.effect("reports a package entry that points inside a slice", () => reportsEntriesInsideSlices);
});
