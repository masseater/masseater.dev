import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkSharedUncachedTasks } from "./shared-uncached-tasks.ts";

const WORKSPACE = "packages:\n  - apps/*\n";
const DEPLOY = `deploy: { command: "alchemy deploy", cache: false }`;

const configWith = (tasks: string): string => `export default { run: { tasks: { ${tasks} } } };\n`;

const workspace = (name: string, tasks: string): Readonly<Record<string, string>> => ({
  [`apps/${name}/package.json`]: `{ "name": "${name}" }`,
  [`apps/${name}/vite.config.ts`]: configWith(tasks),
});

const locationsIn = Effect.fn("locationsIn")(function* locationsIn(
  contents: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith({ "pnpm-workspace.yaml": WORKSPACE, ...contents });
  const files = yield* RepositoryFiles;
  const problems = yield* checkSharedUncachedTasks(root);
  const locations = pipe(
    problems,
    Arr.map(
      ({ file, line, column, rule }) => `${rule} ${files.relative(root, file)}:${line}:${column}`,
    ),
  );
  return Arr.sort(locations, Str.Order);
});

const reportsCopies = Effect.gen(function* reportsCopies() {
  const found = yield* locationsIn({
    ...workspace("gateway", DEPLOY),
    ...workspace("web", `dev: { command: "alchemy dev", cache: false }, ${DEPLOY}`),
  });
  expect(found).toStrictEqual([
    "shared-uncached-task apps/gateway/vite.config.ts:1:34",
    "shared-uncached-task apps/web/vite.config.ts:1:81",
  ]);
});

const ignoresSpreadAndOwnPrograms = Effect.gen(function* ignoresSpreadAndOwnPrograms() {
  const found = yield* locationsIn({
    "apps/helper/package.json": `{ "name": "helper" }`,
    "apps/helper/tasks.ts": `export const tasks = { ${DEPLOY} };\n`,
    ...workspace("gateway", `...tasks`),
    ...workspace("web", `...tasks`),
    ...workspace("measure", `start: { command: "node src/main.ts", cache: false }`),
    ...workspace("render", `start: { command: "node src/main.ts", cache: false }`),
    ...workspace(
      "cached",
      `build: "alchemy deploy", ship: { command: "alchemy deploy", cache: false }`,
    ),
    ...workspace("plain", DEPLOY),
    ...workspace(
      "after-build",
      `deploy: { command: "alchemy deploy", dependsOn: ["build"], cache: false }`,
    ),
  });
  expect(found).toStrictEqual([]);
});

layer(fixtureLayer)("shared uncached tasks", (it) => {
  it.effect(
    "reports an uncached task written the same way in more than one workspace",
    () => reportsCopies,
  );
  it.effect(
    "ignores tasks spread from a helper, tasks that differ, and tasks that run the workspace's own program",
    () => ignoresSpreadAndOwnPrograms,
  );
});
