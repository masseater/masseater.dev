import { NodeServices } from "@effect/platform-node";
import { Array as Arr, Effect, FileSystem, ManagedRuntime, Path, Record, pipe } from "effect";
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

const ACTION = "actions/setup/action.yml";

const ACTION_SOURCE = `name: setup
description: set up
runs:
  using: composite
  steps:
    - uses: actions/checkout@v6
`;

const DEPENDABOT = ".github/dependabot.yml";

const DEPENDABOT_SOURCE = `version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: daily
`;

const QUIET_AUDITS = {
  rules: {
    "excessive-permissions": { disable: true },
    "template-injection": { disable: true },
  },
};

type Linted = Effect.Effect<
  readonly Diagnostic[],
  Fu4Error | PlatformError,
  FileSystem.FileSystem | Path.Path
>;

const lintFiles = (files: Readonly<Record<string, string>>, config: Fu4Config): Linted =>
  Effect.gen(function* fixture() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* fileSystem.makeTempDirectoryScoped();
    for (const [name, text] of Record.toEntries(files)) {
      const file = path.join(root, name);
      yield* fileSystem.makeDirectory(path.dirname(file), { recursive: true });
      yield* fileSystem.writeFileString(file, text);
    }
    return yield* lint({ root, files: Record.keys(files), config });
  }).pipe(Effect.scoped);

const rulesOf = (diagnostics: readonly Diagnostic[]): readonly string[] =>
  pipe(
    diagnostics,
    Arr.map(({ rule }) => rule),
  );

const lintWorkflow = (config: Fu4Config): Linted => lintFiles({ [WORKFLOW]: SOURCE }, config);

test("reports actionlint's and zizmor's findings with their rule and position", () =>
  Effect.gen(function* reports() {
    const diagnostics = yield* lintWorkflow({});
    expect(diagnostics).toMatchObject([
      { path: WORKFLOW, line: 3, column: 3, rule: "excessive-permissions" },
      { path: WORKFLOW, line: 4, column: 14, rule: "runner-label" },
      { path: WORKFLOW, line: 6, column: 23, rule: "expression" },
      { path: WORKFLOW, line: 6, column: 23, rule: "template-injection" },
    ]);
  }).pipe(services.runPromise));

test("links each audit finding to zizmor's documentation", () =>
  Effect.gen(function* links() {
    const diagnostics = yield* lintWorkflow({});
    expect(
      pipe(
        diagnostics,
        Arr.map(({ message }) => message),
      ),
    ).toContain(
      "overly broad permissions: default permissions used due to no permissions: block (https://docs.zizmor.sh/audits/#excessive-permissions)",
    );
  }).pipe(services.runPromise));

test("accepts configured self-hosted labels, ignored messages and disabled audits", () =>
  Effect.gen(function* configured() {
    const diagnostics = yield* lintWorkflow({
      selfHostedRunner: { labels: ["gpu-box"] },
      paths: { [WORKFLOW]: { ignore: ['^property "events" is not defined'] } },
      audit: QUIET_AUDITS,
    });
    expect(diagnostics).toStrictEqual([]);
  }).pipe(services.runPromise));

test("drops audit findings below the minimum severity", () =>
  Effect.gen(function* minimum() {
    const diagnostics = yield* lintWorkflow({ audit: { minSeverity: "high" } });
    expect(rulesOf(diagnostics)).toStrictEqual([
      "runner-label",
      "expression",
      "template-injection",
    ]);
  }).pipe(services.runPromise));

test("audits actions and Dependabot configs without running actionlint on them", () =>
  Effect.gen(function* inputs() {
    const diagnostics = yield* lintFiles(
      { [ACTION]: ACTION_SOURCE, [DEPENDABOT]: DEPENDABOT_SOURCE },
      { audit: { online: false } },
    );
    expect(diagnostics).toMatchObject([
      { path: DEPENDABOT, line: 3, column: 5, rule: "dependabot-cooldown" },
      { path: ACTION, line: 6, column: 7, rule: "artipacked" },
      { path: ACTION, line: 6, column: 13, rule: "unpinned-uses" },
    ]);
  }).pipe(services.runPromise));

test("adds pedantic findings only for the pedantic persona", () =>
  Effect.gen(function* persona() {
    const regular = yield* lintWorkflow({});
    const pedantic = yield* lintWorkflow({ audit: { persona: "pedantic" } });
    const isNew = (finding: Diagnostic): boolean =>
      !pipe(
        regular,
        Arr.some((seen) => seen.message === finding.message),
      );
    const added = pipe(pedantic, Arr.filter(isNew), rulesOf);
    expect(new Set(added)).toStrictEqual(new Set(["anonymous-definition", "concurrency-limits"]));
  }).pipe(services.runPromise));

test("formats a diagnostic like actionlint", () => {
  expect(
    format({
      path: WORKFLOW,
      line: 1,
      column: 2,
      rule: "events",
      message: "bad",
      severity: "error",
    }),
  ).toBe(`${WORKFLOW}:1:2: bad [events]`);
});

test("reads the fu4 section and excludes ignored, vendored and generated workflows", () => {
  const config = fu4Section({ fu4: { ignores: [".github/workflows/vendor-*.yml"] } });
  expect(workflowPathspecs({ config })).toStrictEqual([
    ".github/workflows/*.yml",
    ".github/workflows/*.yaml",
    ":(glob)**/action.yml",
    ":(glob)**/action.yaml",
    ".github/dependabot.yml",
    ".github/dependabot.yaml",
    ".pre-commit-config.yaml",
    ".pre-commit-hooks.yaml",
    ":(exclude,attr:linguist-vendored)",
    ":(exclude,attr:linguist-generated)",
    ":(glob,exclude).github/workflows/vendor-*.yml",
  ]);
  expect(fu4Section({})).toStrictEqual({});
});
