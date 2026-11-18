import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkSourceAliases } from "./source-aliases.ts";

const WORKSPACE = "packages:\n  - apps/*\n  - libs/*\n";
const IMPORTS = `{ "name": "web", "imports": { "#/*": "./src/*" } }`;

const shadcnConfig = (ui: string): string => `{ "aliases": { "ui": "${ui}" } }`;

const rulesIn = Effect.fn("rulesIn")(function* rulesIn(contents: Readonly<Record<string, string>>) {
  const root = yield* gitRepositoryWith({ "pnpm-workspace.yaml": WORKSPACE, ...contents });
  const files = yield* RepositoryFiles;
  const problems = yield* checkSourceAliases(root);
  return pipe(
    problems,
    Arr.filter(({ rule }) => rule === "shadcn-ui-alias"),
    Arr.map(({ file, rule }) => `${rule} ${files.relative(root, file)}`),
  );
});

const reportsUnresolvedAliases = Effect.gen(function* reportsUnresolvedAliases() {
  const found = yield* rulesIn({
    "apps/resolved/package.json": IMPORTS,
    "apps/resolved/components.json": shadcnConfig("#/shared/ui"),
    "apps/resolved/src/shared/ui/button.tsx": "export const Button = 1;\n",
    "apps/missing/package.json": IMPORTS,
    "apps/missing/components.json": shadcnConfig("#/shared/ui"),
    "apps/missing/src/app/index.ts": "export const app = 1;\n",
    "libs/package-alias/package.json": `{ "name": "@workspace/ui" }`,
    "libs/package-alias/components.json": shadcnConfig("@workspace/ui/components"),
    "libs/package-alias/src/shared/ui/button.tsx": "export const Button = 1;\n",
    "libs/plain/package.json": `{ "name": "plain" }`,
  });
  expect(found).toStrictEqual([
    "shadcn-ui-alias apps/missing/components.json",
    "shadcn-ui-alias libs/package-alias/components.json",
  ]);
});

layer(fixtureLayer)("shadcn ui alias", (it) => {
  it.effect(
    "reports a components.json whose ui alias does not resolve to a directory of the workspace",
    () => reportsUnresolvedAliases,
  );
});
