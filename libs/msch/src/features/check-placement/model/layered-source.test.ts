import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkLayeredSource } from "./layered-source.ts";

const WORKSPACE = "packages:\n  - libs/*\n";
const MODULE = "export const value = 1;\n";

const locationsIn = Effect.fn("locationsIn")(function* locationsIn(
  contents: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith({ "pnpm-workspace.yaml": WORKSPACE, ...contents });
  const files = yield* RepositoryFiles;
  const problems = yield* checkLayeredSource(root);
  const locations = pipe(
    problems,
    Arr.map(({ file, rule }) => `${rule} ${files.relative(root, file)}`),
  );
  return Arr.sort(locations, Str.Order);
});

const reportsUnlayeredModules = Effect.gen(function* reportsUnlayeredModules() {
  const found = yield* locationsIn({
    "libs/kit/package.json": `{ "name": "kit" }`,
    "libs/kit/kit.ts": MODULE,
    "libs/kit/server/handler.ts": MODULE,
    "libs/kit/src/index.ts": MODULE,
    "libs/kit/src/utils/a.ts": MODULE,
    "libs/kit/src/utils/b.ts": MODULE,
  });
  expect(found).toStrictEqual([
    "layered-source libs/kit/kit.ts",
    "layered-source libs/kit/server/handler.ts",
    "layered-source libs/kit/src/index.ts",
    "layered-source libs/kit/src/utils",
  ]);
});

const acceptsLayeredWorkspaces = Effect.gen(function* acceptsLayeredWorkspaces() {
  const found = yield* locationsIn({
    "libs/kit/package.json": `{ "name": "kit", "exports": { ".": "./src/app/index.ts", "./run": "./src/features/run-kit/index.ts" }, "bin": { "kit": "./bin/kit.ts" } }`,
    "libs/kit/vite.config.ts": MODULE,
    "libs/kit/alchemy.run.ts": MODULE,
    "libs/kit/env.d.ts": MODULE,
    "libs/kit/bin/kit.ts": MODULE,
    "libs/kit/bin/lib/args.ts": MODULE,
    "libs/kit/src/app/index.ts": MODULE,
    "libs/kit/src/features/run-kit/index.ts": MODULE,
    "libs/kit/src/features/run-kit/model/run.ts": MODULE,
    "libs/kit/src/entities/job/model/job.ts": MODULE,
    "libs/kit/src/shared/lib/text.ts": MODULE,
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

layer(fixtureLayer)("layered source", (it) => {
  it.effect(
    "reports modules outside src/, loose in src/ and in folders that are not layers",
    () => reportsUnlayeredModules,
  );
  it.effect(
    "accepts bin/, root config files and modules in FSD layers",
    () => acceptsLayeredWorkspaces,
  );
  it.effect("reports a package entry that points inside a slice", () => reportsEntriesInsideSlices);
});
