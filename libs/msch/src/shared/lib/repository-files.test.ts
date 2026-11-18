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

layer(fixtureLayer)("listed files", (it) => {
  it.effect(
    "leaves out untracked node_modules when no .gitignore covers them",
    () => skipsUntrackedDependencies,
  );
});
