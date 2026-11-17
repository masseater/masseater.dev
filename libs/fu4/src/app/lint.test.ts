import { NodeServices } from "@effect/platform-node";
import { Effect, FileSystem, ManagedRuntime, Path } from "effect";
import type { PlatformError } from "effect/PlatformError";
import { afterAll, expect, test } from "vite-plus/test";

import { format, fu4Section, lint, workflowPathspecs } from "./index.ts";
import type { Diagnostic, Fu4Config, Fu4Error } from "./index.ts";

const services = ManagedRuntime.make(NodeServices.layer);
afterAll(() => services.dispose());

const WORKFLOW = ".github/workflows/ci.yml";

const SOURCE = `on: push
jobs:
  test:
    runs-on: gpu-box
    steps:
      - run: echo \${{ github.events }}
`;

const lintWorkflow = (
  config: Fu4Config,
): Effect.Effect<
  readonly Diagnostic[],
  Fu4Error | PlatformError,
  FileSystem.FileSystem | Path.Path
> =>
  Effect.gen(function* fixture() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* fileSystem.makeTempDirectoryScoped();
    const file = path.join(root, WORKFLOW);
    yield* fileSystem.makeDirectory(path.dirname(file), { recursive: true });
    yield* fileSystem.writeFileString(file, SOURCE);
    return yield* lint({ root, files: [WORKFLOW], config });
  }).pipe(Effect.scoped);

test("reports actionlint's findings with their rule and position", () =>
  Effect.gen(function* reports() {
    const diagnostics = yield* lintWorkflow({});
    expect(diagnostics).toMatchObject([
      { path: WORKFLOW, line: 4, column: 14, rule: "runner-label" },
      { path: WORKFLOW, line: 6, column: 23, rule: "expression" },
    ]);
  }).pipe(services.runPromise));

test("accepts configured self-hosted labels and ignores matching messages", () =>
  Effect.gen(function* configured() {
    const diagnostics = yield* lintWorkflow({
      selfHostedRunner: { labels: ["gpu-box"] },
      paths: { [WORKFLOW]: { ignore: ['^property "events" is not defined'] } },
    });
    expect(diagnostics).toStrictEqual([]);
  }).pipe(services.runPromise));

test("formats a diagnostic like actionlint", () => {
  expect(format({ path: WORKFLOW, line: 1, column: 2, rule: "events", message: "bad" })).toBe(
    `${WORKFLOW}:1:2: bad [events]`,
  );
});

test("reads the fu4 section and excludes ignored workflows", () => {
  const config = fu4Section({ fu4: { ignores: [".github/workflows/vendor-*.yml"] } });
  expect(workflowPathspecs({ config })).toStrictEqual([
    ".github/workflows/*.yml",
    ".github/workflows/*.yaml",
    ":(glob,exclude).github/workflows/vendor-*.yml",
  ]);
  expect(fu4Section({})).toStrictEqual({});
});
