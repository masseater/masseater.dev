import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkHiddenVerify } from "./hidden-verify.ts";

const WORKSPACE = "packages:\n  - apps/*\n";
const VERIFY = `{ verify: { command: [], dependsOn: ["cargo"] }, cargo: "cargo test" }`;

const rulesIn = Effect.fn("rulesIn")(function* rulesIn(contents: Readonly<Record<string, string>>) {
  const root = yield* gitRepositoryWith({ "pnpm-workspace.yaml": WORKSPACE, ...contents });
  const files = yield* RepositoryFiles;
  const problems = yield* checkHiddenVerify(root);
  return pipe(
    problems,
    Arr.map(({ file, rule }) => `${rule} ${files.relative(root, file)}`),
  );
});

const reportsVerifyFromAHelper = Effect.gen(function* reportsVerifyFromAHelper() {
  const found = yield* rulesIn({
    "apps/helper/package.json": `{ "name": "helper" }`,
    "apps/helper/tasks.ts": `export const tasks = ${VERIFY};\n`,
    "apps/helper/vite.config.ts": `import { tasks } from "./tasks.ts";\n\nexport default { run: { tasks } };\n`,
    "apps/literal/package.json": `{ "name": "literal" }`,
    "apps/literal/vite.config.ts": `export default { run: { tasks: ${VERIFY} } };\n`,
    "apps/none/package.json": `{ "name": "none" }`,
    "apps/none/vite.config.ts": `export default { run: { tasks: { cargo: "cargo test" } } };\n`,
  });
  expect(found).toStrictEqual(["hidden-verify apps/helper/vite.config.ts"]);
});

layer(fixtureLayer)("hidden verify", (it) => {
  it.effect(
    "reports a workspace whose verify task the root cannot read without running its vite.config.ts",
    () => reportsVerifyFromAHelper,
  );
});
