import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkCommandEntries } from "./command-entries.ts";

const WORKSPACE = "packages:\n  - tools/*\n";
const COMMAND = "export {};\n";

const configWith = (tasks: string): string => `export default { run: { tasks: { ${tasks} } } };\n`;

const locationsIn = Effect.fn("locationsIn")(function* locationsIn(
  contents: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith({ "pnpm-workspace.yaml": WORKSPACE, ...contents });
  const files = yield* RepositoryFiles;
  const problems = yield* checkCommandEntries(root);
  const locations = pipe(
    problems,
    Arr.map(
      ({ file, line, column, rule }) => `${rule} ${files.relative(root, file)}:${line}:${column}`,
    ),
  );
  return Arr.sort(locations, Str.Order);
});

const reportsCommandsOutsideBin = Effect.gen(function* reportsCommandsOutsideBin() {
  const found = yield* locationsIn({
    "tools/measure/package.json": `{ "name": "measure" }`,
    "tools/measure/src/measure.ts": COMMAND,
    "tools/measure/scripts/render.ts": COMMAND,
    "tools/measure/vite.config.ts": configWith(
      `measure: { command: "node src/measure.ts", cache: false }, render: ["vp build", "node ./scripts/render.ts"]`,
    ),
  });
  expect(found).toStrictEqual([
    "command-outside-bin tools/measure/vite.config.ts:1:114",
    "command-outside-bin tools/measure/vite.config.ts:1:54",
    "scripts-directory tools/measure/scripts:1:1",
  ]);
});

const acceptsBinAndDeclaredEntries = Effect.gen(function* acceptsBinAndDeclaredEntries() {
  const found = yield* locationsIn({
    "tools/measure/package.json": `{ "name": "measure", "main": "src/main.ts", "bin": { "share": "./bin/share.ts" } }`,
    "tools/measure/src/main.ts": COMMAND,
    "tools/measure/bin/measure.ts": COMMAND,
    "tools/measure/bin/share.ts": COMMAND,
    "tools/measure/bin/publish.ts": COMMAND,
    "tools/measure/bin/lib/shared.ts": COMMAND,
    "tools/measure/bin/measure.test.ts": COMMAND,
    "tools/measure/vite.config.ts": configWith(
      `measure: "node bin/measure.ts", start: \`node src/main.ts \${"x"}\``,
    ),
    ".github/workflows/publish.yml": "run: node ../../tools/measure/bin/publish.ts\n",
  });
  expect(found).toStrictEqual([]);
});

const reportsUnrunCommands = Effect.gen(function* reportsUnrunCommands() {
  const found = yield* locationsIn({
    "tools/measure/package.json": `{ "name": "measure" }`,
    "tools/measure/bin/forgotten.ts": COMMAND,
    "tools/measure/vite.config.ts": configWith(`check: "vp check"`),
  });
  expect(found).toStrictEqual(["unrun-command tools/measure/bin/forgotten.ts:1:1"]);
});

layer(fixtureLayer)("command entries", (it) => {
  it.effect(
    "reports a task that runs a file outside bin/ and a scripts directory",
    () => reportsCommandsOutsideBin,
  );
  it.effect(
    "accepts commands in bin/, package.json entries and files that a workflow runs",
    () => acceptsBinAndDeclaredEntries,
  );
  it.effect("reports a command in bin/ that nothing runs", () => reportsUnrunCommands);
});
