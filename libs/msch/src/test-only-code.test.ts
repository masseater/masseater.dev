import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, Path, Stream, String as Str, pipe } from "effect";
import { ChildProcess } from "effect/process";
import { expect } from "vite-plus/test";

import { directoryWith, fixtureLayer } from "./repository.test.support.ts";

const workspacePackage = (name: string): string =>
  `{ "name": "${name}", "private": true, "type": "module", "exports": { ".": "./src/index.ts" } }`;

const SAMPLE_SOURCE = "export const sample = 1;\n";

const FIXTURE: Readonly<Record<string, string>> = {
  "package.json": '{ "name": "fixture-root", "private": true, "type": "module" }',
  "pnpm-workspace.yaml": "packages:\n  - apps/*\n  - libs/*\n  - tools/*\n  - infra/*\n",
  "apps/sample/package.json": workspacePackage("apps-sample"),
  "apps/sample/src/index.ts": SAMPLE_SOURCE,
  "tools/sample/package.json": workspacePackage("tools-sample"),
  "tools/sample/src/index.ts": SAMPLE_SOURCE,
  "infra/sample/package.json": workspacePackage("infra-sample"),
  "infra/sample/src/index.ts": SAMPLE_SOURCE,
  "libs/fixture/package.json": workspacePackage("fixture"),
  "libs/fixture/src/index.ts":
    'import { used } from "./values.ts";\nimport { supportValue } from "./values.test.support.ts";\nexport const answer = used + supportValue;\n',
  "libs/fixture/src/values.ts": "export const used = 1;\nexport const onlyForTests = 2;\n",
  "libs/fixture/src/helper.ts": "export const testHelper = 3;\n",
  "libs/fixture/src/values.test.support.ts": "export const supportValue = 4;\n",
  "libs/fixture/src/values.test.ts":
    'import { onlyForTests } from "./values.ts";\nimport { testHelper } from "./helper.ts";\nexport const sum = onlyForTests + testHelper;\n',
};

const findingsOf = Effect.fn("findingsOf")(function* findingsOf(
  root: string,
  args: readonly string[],
) {
  const path = yield* Path.Path;
  const repository = path.resolve(import.meta.dirname, "..", "..", "..");
  const fallow = path.join(repository, "node_modules", ".bin", "fallow");
  const config = path.join(repository, ".fallowrc.jsonc");
  const handle = yield* ChildProcess.make(fallow, [
    ...args,
    "--root",
    root,
    "--config",
    config,
    "--quiet",
    "--format",
    "compact",
  ]);
  const output = yield* handle.stdout.pipe(Stream.decodeText(), Stream.mkString);
  return Str.split(output, "\n");
});

const flagsCodeOnlyTestsUse = Effect.gen(function* flagsCodeOnlyTestsUse() {
  const root = yield* directoryWith(FIXTURE);
  const production = yield* findingsOf(root, ["dead-code"]);
  expect(production).toStrictEqual(
    expect.arrayContaining([
      "unused-file:libs/fixture/src/helper.ts",
      "unused-export:libs/fixture/src/values.ts:2:onlyForTests",
    ]),
  );
  const everything = yield* findingsOf(root, ["dead-code", "--no-production"]);
  const isBoundaryViolation = Str.startsWith("boundary-violation:");
  expect(pipe(everything, Arr.filter(isBoundaryViolation))).toStrictEqual([
    "boundary-violation:libs/fixture/src/index.ts:2:libs/fixture/src/index.ts -> libs/fixture/src/values.test.support.ts (libs -> tests)",
  ]);
});

const FALLOW_TIMEOUT = 60_000;

layer(Layer.merge(fixtureLayer, nodeServicesLayer))("test-only code", (it) => {
  it.effect(
    "the repository's fallow config flags code that only tests use or that production takes from tests",
    () => flagsCodeOnlyTestsUse,
    FALLOW_TIMEOUT,
  );
});
