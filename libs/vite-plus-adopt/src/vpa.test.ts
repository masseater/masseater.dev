import { layer as fixtureLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertFalse, assertTrue, deepStrictEqual } from "@effect/vitest/utils";
import {
  Effect,
  Exit,
  FileSystem,
  Predicate,
  Ref,
  Sink,
  Stdio,
  Array as Arr,
  String as Str,
  pipe,
} from "effect";
import type { Scope } from "effect";

import { BETTERLEAKS } from "./binaries.ts";
import type { CommandError, CommandServices } from "./command.ts";
import { commitEmpty, directoryWith, lines, runGit } from "./fixture.test.support.ts";
import { VendorDirectory } from "./vendor.ts";
import { runVpa } from "./vpa.ts";

interface Captured {
  readonly exit: Exit.Exit<void, CommandError>;
  readonly output: string;
}

const CONFIG = lines(
  "export default {",
  '  commitlint: { rules: { "type-empty": [2, "never"] } },',
  '  dependencyRules: { banned: { "use the stack": ["left-pad"] } },',
  '  betterleaks: { extend: { useDefault: true }, ignoredSecrets: ["0".repeat(64)] },',
  "  steiger: {",
  '    paths: ["src"],',
  "    rules: [",
  '      { meta: { name: "none", version: "0.0.0" }, ruleDefinitions: [{ name: "none/ok", check: () => ({ diagnostics: [] }) }] },',
  '      { rules: { "none/ok": "error" } },',
  "    ],",
  "  },",
  '  textlint: { ignores: ["skip/**"], rules: {} },',
  '  markdownlint: { ignores: ["skip/**"] },',
  "};",
);

const manifest = (dependencies: Readonly<Record<string, string>>): string =>
  JSON.stringify({ name: "fixture", dependencies });

const DIGEST_LENGTH = 64;
const ZEROS = "0".repeat(DIGEST_LENGTH);

const FAKE_BETTERLEAKS = lines(
  "#!/bin/sh",
  'printf %s "$BETTERLEAKS_CONFIG_TOML" | grep -q "useDefault = true" || exit 3',
  'case "$1" in',
  `  git) test "$6" = --ignore-file && grep -qx ${ZEROS} "$7" ;;`,
  "  stdin) ! grep -q AKIA ;;",
  "  *) exit 2 ;;",
  "esac",
);

const VENDORED_BETTERLEAKS = `vendor/betterleaks/${BETTERLEAKS.version}/betterleaks`;

const EXECUTABLE_MODE = 0o755;

const REPOSITORY = {
  "vite.config.ts": CONFIG,
  "package.json": manifest({}),
  "pnpm-workspace.yaml": lines("packages:", "  - libs/*"),
  "libs/a/package.json": manifest({ effect: "4.1.2" }),
  "docs/guide.md": "# Guide\n",
  "skip/notes.md": "#Notes\n",
  "src/shared/index.ts": "export {};\n",
  [VENDORED_BETTERLEAKS]: FAKE_BETTERLEAKS,
};

const repositoryWith = (
  files: Readonly<Record<string, string>>,
  commits: readonly string[],
): Effect.Effect<string, never, CommandServices | Scope.Scope> =>
  Effect.gen(function* repository() {
    const root = yield* directoryWith({ ...REPOSITORY, ...files });
    const fs = yield* FileSystem.FileSystem;
    yield* fs.chmod(`${root}/${VENDORED_BETTERLEAKS}`, EXECUTABLE_MODE).pipe(Effect.orDie);
    yield* commitEmpty(root, "feat: base");
    yield* runGit(root, ["update-ref", "refs/remotes/origin/main", "HEAD"]);
    yield* pipe(
      commits,
      Effect.forEach((message) => commitEmpty(root, message)),
    );
    return root;
  });

const run = (
  root: string,
  args: readonly string[],
): Effect.Effect<Captured, never, CommandServices> =>
  Effect.gen(function* capture() {
    const written = yield* Ref.make<readonly (string | Uint8Array)[]>([]);
    const stdout = Sink.collect<string | Uint8Array>().pipe(
      Sink.mapEffect((chunks) => Ref.set(written, chunks)),
    );
    const stdio = Stdio.layerTest({ stdout: () => stdout });
    const exit = yield* Effect.exit(
      runVpa(root, args).pipe(
        Effect.provide(stdio),
        Effect.provideService(VendorDirectory, `${root}/vendor`),
      ),
    );
    const chunks = yield* Ref.get(written);
    return { exit, output: pipe(chunks, Arr.filter(Predicate.isString), Arr.join("")) };
  });

const statusLines = (output: string): readonly string[] =>
  pipe(
    Str.split(output, "\n"),
    Arr.filter((line) => Str.startsWith("✓ ")(line) || Str.startsWith("✗ ")(line)),
  );

const passesEveryConfiguredCheck = Effect.gen(function* passesEveryConfiguredCheck() {
  const root = yield* repositoryWith({}, ["feat: second"]);
  const { exit, output } = yield* run(root, []);
  assertTrue(Exit.isSuccess(exit));
  deepStrictEqual(statusLines(output), [
    "✓ betterleaks",
    "✓ commitlint",
    "✓ dependencies",
    "✓ steiger",
    "✓ textlint",
    "✓ markdownlint",
  ]);
});

const namesTheFailingChecks = Effect.gen(function* namesTheFailingChecks() {
  const root = yield* repositoryWith(
    { "libs/a/package.json": manifest({ "left-pad": "1.0.0" }), "docs/guide.md": "#Guide\n" },
    ["no type"],
  );
  const { exit, output } = yield* run(root, []);
  assertFalse(Exit.isSuccess(exit));
  const failed = pipe(statusLines(output), Arr.filter(Str.startsWith("✗ ")));
  deepStrictEqual(failed, ["✗ commitlint", "✗ dependencies", "✗ markdownlint"]);
});

const lintsTheCommitMessageFile = Effect.gen(function* lintsTheCommitMessageFile() {
  const root = yield* repositoryWith({ GOOD_MSG: "feat: add\n", BAD_MSG: "no type\n" }, []);
  const results = yield* Effect.forEach(
    [
      ["--commit-msg", `${root}/GOOD_MSG`],
      ["--commit-msg", `${root}/BAD_MSG`],
      ["--commit-msg"],
      ["--other"],
    ],
    (args) => run(root, args),
  );
  deepStrictEqual(
    pipe(
      results,
      Arr.map(({ exit }) => Exit.isSuccess(exit)),
    ),
    [true, false, false, false],
  );
});

const scansTheStagedChanges = Effect.gen(function* scansTheStagedChanges() {
  const root = yield* repositoryWith({ "clean.txt": "hello\n", "leak.txt": "AKIAEXAMPLE\n" }, []);
  yield* runGit(root, ["add", "clean.txt"]);
  const clean = yield* run(root, ["--staged"]);
  yield* runGit(root, ["add", "leak.txt"]);
  const leaked = yield* run(root, ["--staged"]);
  assertTrue(Exit.isSuccess(clean.exit));
  assertFalse(Exit.isSuccess(leaked.exit));
});

layer(fixtureLayer)("vpa", (it) => {
  it.effect(
    "runs every check configured in vite.config.ts and passes",
    () => passesEveryConfiguredCheck,
  );
  it.effect("reports each failing check by name", () => namesTheFailingChecks);
  it.effect("lints a commit message file for the commit-msg hook", () => lintsTheCommitMessageFile);
  it.effect("scans the staged changes for the pre-commit hook", () => scansTheStagedChanges);
});
