import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkSourceAliases } from "./source-aliases.ts";

const WORKSPACE = "packages:\n  - apps/*\n";
const MODULE = "export const value = 1;\n";

const locationsIn = Effect.fn("locationsIn")(function* locationsIn(
  contents: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith({ "pnpm-workspace.yaml": WORKSPACE, ...contents });
  const files = yield* RepositoryFiles;
  const problems = yield* checkSourceAliases(root);
  const locations = pipe(
    problems,
    Arr.map(({ file, rule }) => `${rule} ${files.relative(root, file)}`),
  );
  return Arr.sort(locations, Str.Order);
});

const reportsFolderAliases = Effect.gen(function* reportsFolderAliases() {
  const found = yield* locationsIn({
    "apps/site/package.json": `{ "name": "site", "imports": { "#/*": "./src/*", "#site/*": "./src/app/site/*", "#names": { "types": "./src/shared/config/names.ts", "default": "./src/shared/config/names.ts" } } }`,
    "apps/site/src/app/site.ts": MODULE,
  });
  expect(found).toStrictEqual([
    "source-alias apps/site/package.json",
    "source-alias apps/site/package.json",
  ]);
});

const acceptsOutsideAliases = Effect.gen(function* acceptsOutsideAliases() {
  const found = yield* locationsIn({
    "apps/site/package.json": `{ "name": "site", "imports": { "#/*": "./src/*", "#package.json": "./package.json", "#upstream/*": "./upstream/*" } }`,
    "apps/site/src/app/site.ts": MODULE,
    "apps/site/src/shared/config/security-headers.ts": MODULE,
  });
  expect(found).toStrictEqual([]);
});

layer(fixtureLayer)("checkSourceAliases", (it) => {
  it.effect(
    "reports import aliases that point into src/ under their own name",
    () => reportsFolderAliases,
  );
  it.effect(
    "accepts the source alias and aliases that point outside src/",
    () => acceptsOutsideAliases,
  );
});
