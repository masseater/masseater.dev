import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Option,
  Path,
  Record,
  pipe,
} from "effect";
import type { PlatformError } from "effect/PlatformError";
import { afterAll, expect, test } from "vite-plus/test";

import {
  definePlugin,
  defineRule,
  format,
  fu4Section,
  lint,
  lintText,
  workflowPathspecs,
} from "./index.ts";
import type { Diagnostic, Fu4Config, Fu4Error, RuleContext } from "./index.ts";

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

const WORKFLOW = ".github/workflows/ci.yml";
const ACTION = "actions/setup/action.yml";
const SOURCE = "on: push\njobs:\n  test:\n    runs-on: ubuntu-latest\n";
const TOP = 1;

const firstKey = (context: RuleContext): string =>
  pipe(
    Option.fromNullishOr(context.source.yaml),
    Option.flatMap((root) => Arr.head(root.children)),
    Option.map((key) => key.value),
    Option.getOrElse(() => ""),
  );

const example = definePlugin({
  rules: {
    "first-key": defineRule({
      meta: { description: "Reports the first top-level key" },
      check: (context) => {
        context.report({ message: firstKey(context), line: TOP, column: TOP });
      },
    }),
    "action-name": defineRule({
      meta: { description: "Reports the action file's name", kinds: ["action"] },
      check: (context) => {
        context.report({ message: context.kind, line: TOP, column: TOP });
      },
    }),
    "reads-project": defineRule({
      meta: { description: "Reads another file through the project" },
      check: (context) => {
        const found = pipe(
          context.project.read("notes.txt"),
          Option.getOrElse(() => "missing"),
        );
        context.report({ message: found, line: TOP, column: TOP });
      },
    }),
    "parses-script": defineRule({
      meta: { description: "Parses a bash script" },
      check: (context) => {
        const root = pipe(
          Option.fromNullishOr(context.parseScript("bash", "echo hi\n").syntax),
          Option.map((syntax) => syntax.type),
          Option.getOrElse(() => "none"),
        );
        context.report({ message: root, line: TOP, column: TOP });
      },
    }),
    "effect-rule": defineRule({
      meta: { description: "Reports from an Effect" },
      check: (context) =>
        Effect.sync(() => {
          context.report({ message: "from effect", line: TOP, column: TOP });
        }),
    }),
    crashes: defineRule({
      meta: { description: "Throws" },
      check: () => {
        throw new Error("boom");
      },
    }),
  },
});

const configWith = (rules: NonNullable<Fu4Config["rules"]>, extra: Fu4Config = {}): Fu4Config => ({
  plugins: { example },
  rules,
  ...extra,
});

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

const messagesOf = (diagnostics: readonly Diagnostic[]): readonly string[] =>
  pipe(
    diagnostics,
    Arr.map(({ message }) => message),
  );

test("runs enabled plugin rules and names each finding by plugin and rule", () =>
  Effect.gen(function* reports() {
    const diagnostics = yield* lintFiles(
      { [WORKFLOW]: SOURCE },
      configWith({ "example/first-key": "warn" }),
    );
    expect(diagnostics).toStrictEqual([
      {
        path: WORKFLOW,
        line: TOP,
        column: TOP,
        message: "on",
        rule: "example/first-key",
        severity: "warn",
      },
    ]);
  }).pipe(services.runPromise));

test("runs a rule only on the input kinds it declares", () =>
  Effect.gen(function* kinds() {
    const diagnostics = yield* lintFiles(
      { [WORKFLOW]: SOURCE, [ACTION]: "name: setup\n" },
      configWith({ "example/action-name": "error" }),
    );
    expect(diagnostics).toMatchObject([{ path: ACTION, message: "action" }]);
  }).pipe(services.runPromise));

test("applies overrides and ignores by path", () =>
  Effect.gen(function* overrides() {
    const diagnostics = yield* lintFiles(
      { [WORKFLOW]: SOURCE, ".github/workflows/other.yml": SOURCE },
      configWith(
        { "example/first-key": "error" },
        {
          overrides: [{ files: ["**/other.yml"], rules: { "example/first-key": "off" } }],
          ignores: [".github/workflows/vendored-*.yml"],
        },
      ),
    );
    expect(diagnostics).toMatchObject([{ path: WORKFLOW }]);
  }).pipe(services.runPromise));

test("gives rules the project's files, script parsing and Effect results", () =>
  Effect.gen(function* context() {
    const diagnostics = yield* lintFiles(
      { [WORKFLOW]: SOURCE, "notes.txt": "hello" },
      configWith({
        "example/reads-project": "error",
        "example/parses-script": "error",
        "example/effect-rule": "error",
      }),
    );
    expect(messagesOf(diagnostics)).toStrictEqual(["from effect", "hello", "program"]);
  }).pipe(services.runPromise));

test("fails with the rule and file when a rule throws", () =>
  Effect.gen(function* crash() {
    const failure = yield* lintFiles(
      { [WORKFLOW]: SOURCE },
      configWith({ "example/crashes": "error" }),
    ).pipe(Effect.flip);
    expect(failure.message).toContain(`fu4 rule example/crashes failed on ${WORKFLOW}`);
  }).pipe(services.runPromise));

test("takes the plugins, rules, settings and overrides of the configs a config extends", () =>
  Effect.gen(function* extended() {
    const base = configWith({ "example/first-key": "warn" });
    const quiet: Fu4Config = {
      overrides: [
        { files: [".github/workflows/quiet.yml"], rules: { "example/first-key": "off" } },
      ],
    };
    const diagnostics = yield* lintFiles(
      { [WORKFLOW]: SOURCE, ".github/workflows/quiet.yml": SOURCE },
      { extends: [base, quiet], rules: { "example/first-key": "error" } },
    );
    expect(
      pipe(
        diagnostics,
        Arr.map(({ path, severity }) => `${path} ${severity}`),
      ),
    ).toStrictEqual([`${WORKFLOW} error`]);
  }).pipe(services.runPromise));

test("lints a text with an explicit input kind", () =>
  Effect.gen(function* text() {
    const diagnostics = yield* lintText({
      root: ".",
      path: "test.yaml",
      kind: "workflow",
      text: SOURCE,
      config: configWith({ "example/first-key": "error" }),
    });
    expect(messagesOf(diagnostics)).toStrictEqual(["on"]);
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
