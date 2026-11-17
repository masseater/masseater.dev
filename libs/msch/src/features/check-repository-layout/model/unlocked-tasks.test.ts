import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkUnlockedTasks } from "./unlocked-tasks.ts";

const WORKSPACE = "packages:\n  - libs/*\n";

const configWith = (tasks: string): string =>
  `const LOCKED = [];\nexport default { run: { tasks: { ${tasks} } } };\n`;

const workspace = (name: string, tasks: string): Readonly<Record<string, string>> => ({
  [`libs/${name}/package.json`]: `{ "name": "${name}" }`,
  [`libs/${name}/vite.config.ts`]: configWith(tasks),
});

const locationsIn = Effect.fn("locationsIn")(function* locationsIn(
  contents: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith({ "pnpm-workspace.yaml": WORKSPACE, ...contents });
  const files = yield* RepositoryFiles;
  const problems = yield* checkUnlockedTasks(root);
  const locations = pipe(
    problems,
    Arr.map(
      ({ file, line, column, rule }) => `${rule} ${files.relative(root, file)}:${line}:${column}`,
    ),
  );
  return Arr.sort(locations, Str.Order);
});

const reportsHandWrittenInputs = Effect.gen(function* reportsHandWrittenInputs() {
  const found = yield* locationsIn({
    ...workspace("plain", `test: "vp test run"`),
    ...workspace("object", `build: { command: "vp pack", dependsOn: ["native"] }`),
    ...workspace("chain", `build: "vp build && node bin/headers.ts"`),
    ...workspace(
      "literal",
      `test: { command: "vp test run", cache: { input: [{ auto: true }, "!dist/**"] } }`,
    ),
  });
  expect(found).toStrictEqual([
    "unlocked-task libs/chain/vite.config.ts:2:34",
    "unlocked-task libs/literal/vite.config.ts:2:34",
    "unlocked-task libs/object/vite.config.ts:2:34",
    "unlocked-task libs/plain/vite.config.ts:2:34",
  ]);
});

const acceptsLockedUncachedAndOtherTasks = Effect.gen(
  function* acceptsLockedUncachedAndOtherTasks() {
    const found = yield* locationsIn({
      ...workspace("locked", `test: { command: "vp test run", cache: { input: [...LOCKED] } }`),
      ...workspace("uncached", `live: { command: "vp test run live.test", cache: false }`),
      ...workspace("other", `native: "node bin/build-native.ts", verify: { command: [] }`),
      ...workspace("spread", `...tasks`),
    });
    expect(found).toStrictEqual([]);
  },
);

layer(fixtureLayer)("unlocked tasks", (it) => {
  it.effect(
    "reports a test or build task whose inputs are written by hand",
    () => reportsHandWrittenInputs,
  );
  it.effect(
    "accepts tasks with derived inputs, uncached tasks and tasks that load no dependencies",
    () => acceptsLockedUncachedAndOtherTasks,
  );
});
