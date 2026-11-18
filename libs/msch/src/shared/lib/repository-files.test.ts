import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Order } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "./repository-files.ts";
import { FixtureFiles, fixtureLayer, gitRepositoryWith } from "./repository.test.support.ts";

const skipsUntrackedDependencies = Effect.gen(function* skipsUntrackedDependencies() {
  const fixtures = yield* FixtureFiles;
  const files = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({ "package.json": "{}\n" });
  yield* fixtures.writeFile(files.join(root, "node_modules/dep/index.js"), "export {};\n");
  yield* fixtures.writeFile(
    files.join(root, "apps/site/node_modules/dep/index.js"),
    "export {};\n",
  );
  yield* fixtures.writeFile(files.join(root, "src/main.ts"), "export {};\n");
  const listed = yield* files.listedFiles(root);
  expect(Arr.sort(listed, Order.String)).toStrictEqual(["package.json", "src/main.ts"]);
});

const listsOnlyTheIndex = Effect.gen(function* listsOnlyTheIndex() {
  const fixtures = yield* FixtureFiles;
  const files = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith({ ".gitignore": "out/\n", "apps/site/.gitignore": "" });
  yield* fixtures.writeFile(files.join(root, "apps/draft/.gitignore"), "tmp/\n");
  const tracked = yield* files.trackedFiles(root, [":(glob)**/.gitignore"]);
  expect(Arr.sort(tracked, Order.String)).toStrictEqual([".gitignore", "apps/site/.gitignore"]);
});

layer(fixtureLayer)("listed files", (it) => {
  it.effect(
    "leaves out untracked node_modules when no .gitignore covers them",
    () => skipsUntrackedDependencies,
  );
});

layer(fixtureLayer)("tracked files", (it) => {
  it.effect(
    "lists the files of the index that match and leaves out a file the working tree alone holds",
    () => listsOnlyTheIndex,
  );
});
