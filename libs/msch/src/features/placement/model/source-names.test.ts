import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkSourceNames } from "./source-names.ts";

const WORKSPACE = "packages:\n  - apps/*\n";
const MODULE = "export const value = 1;\n";

const locationsIn = Effect.fn("locationsIn")(function* locationsIn(
  contents: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith({ "pnpm-workspace.yaml": WORKSPACE, ...contents });
  const files = yield* RepositoryFiles;
  const problems = yield* checkSourceNames(root);
  const locations = pipe(
    problems,
    Arr.map(({ file, rule }) => `${rule} ${files.relative(root, file)}`),
  );
  return Arr.sort(locations, Str.Order);
});

const reportsRuntimeFolders = Effect.gen(function* reportsRuntimeFolders() {
  const found = yield* locationsIn({
    "apps/site/package.json": `{ "name": "site" }`,
    "apps/site/src/app/worker/site.worker.ts": MODULE,
    "apps/site/src/app/worker/headers.ts": MODULE,
    "apps/site/src/shared/lib/cloudflare/kv.ts": MODULE,
    "apps/site/src/features/edit-node/model/edit.ts": MODULE,
  });
  expect(found).toStrictEqual([
    "runtime-name apps/site/src/app/worker",
    "runtime-name apps/site/src/shared/lib/cloudflare",
  ]);
});

const reportsFolderAliases = Effect.gen(function* reportsFolderAliases() {
  const found = yield* locationsIn({
    "apps/site/package.json": `{ "name": "site", "imports": { "#/*": "./src/*", "#worker/*": "./src/app/entrypoint/*", "#names": { "types": "./src/shared/config/names.ts", "default": "./src/shared/config/names.ts" } } }`,
    "apps/site/src/app/entrypoint/site.worker.ts": MODULE,
  });
  expect(found).toStrictEqual([
    "source-alias apps/site/package.json",
    "source-alias apps/site/package.json",
  ]);
});

const acceptsRoleNamesAndOutsideAliases = Effect.gen(function* acceptsRoleNamesAndOutsideAliases() {
  const found = yield* locationsIn({
    "apps/site/package.json": `{ "name": "site", "imports": { "#/*": "./src/*", "#package.json": "./package.json", "#upstream/*": "./upstream/*" } }`,
    "apps/site/src/app/entrypoint/site.worker.ts": MODULE,
    "apps/site/src/shared/config/security-headers.ts": MODULE,
  });
  expect(found).toStrictEqual([]);
});

layer(fixtureLayer)("checkSourceNames", (it) => {
  it.effect("reports folders under src/ named after a runtime", () => reportsRuntimeFolders);
  it.effect(
    "reports import aliases that point into src/ under their own name",
    () => reportsFolderAliases,
  );
  it.effect(
    "accepts role names and aliases that point outside src/",
    () => acceptsRoleNamesAndOutsideAliases,
  );
});
