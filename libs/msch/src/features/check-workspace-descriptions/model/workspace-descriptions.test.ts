import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkWorkspaceDescriptions } from "./workspace-descriptions.ts";

const flagsWorkspacesWithoutDescriptions = Effect.gen(
  function* flagsWorkspacesWithoutDescriptions() {
    const files = yield* RepositoryFiles;
    const root = yield* gitRepositoryWith({
      "pnpm-workspace.yaml": "packages:\n  - libs/*\n",
      "package.json": '{ "name": "root", "private": true }\n',
      "libs/described/package.json": '{ "name": "described", "description": "Does one thing." }\n',
      "libs/missing/package.json": '{ "name": "missing" }\n',
      "libs/blank/package.json": '{ "name": "blank", "description": "" }\n',
    });
    const problems = yield* checkWorkspaceDescriptions(root);
    expect(
      pipe(
        problems,
        Arr.map(({ file, rule }) => `${files.relative(root, file)} ${rule}`),
        Arr.sort(Str.Order),
      ),
    ).toStrictEqual([
      "libs/blank/package.json workspace-description",
      "libs/missing/package.json workspace-description",
    ]);
  },
);

layer(fixtureLayer)("every workspace says what it is for", (it) => {
  it.effect("flags workspaces without a description", () => flagsWorkspacesWithoutDescriptions);
});
