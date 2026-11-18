import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Order } from "effect";
import { expect } from "vite-plus/test";

import {
  FixtureFiles,
  fixtureLayer,
  gitRepositoryWith,
} from "#/shared/lib/repository.test.support.ts";

import { RepositoryFiles } from "./repository-files.ts";

const skipsUntrackedNodeModules = Effect.gen(function* skipsUntrackedNodeModules() {
  const fixtures = yield* FixtureFiles;
  const repositoryFiles = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({ "src/index.ts": "", "README.md": "" });
  yield* fixtures.writeFile(`${root}/node_modules/pkg/index.js`, "");
  yield* fixtures.writeFile(`${root}/apps/web/node_modules/pkg/index.js`, "");
  yield* fixtures.writeFile(`${root}/notes.md`, "");
  const listed = yield* repositoryFiles.listedFiles(root);
  expect(Arr.sort(listed, Order.String)).toStrictEqual(["README.md", "notes.md", "src/index.ts"]);
});

layer(fixtureLayer)("repository files", (it) => {
  it.effect(
    "leaves untracked node_modules out of the listed files even when .gitignore does not name it",
    () => skipsUntrackedNodeModules,
  );
});
