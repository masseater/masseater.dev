import { layer as fixtureLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertFalse, assertTrue, deepStrictEqual } from "@effect/vitest/utils";
import { Effect, Exit, FileSystem, Array as Arr, String as Str, pipe } from "effect";
import type { Scope } from "effect";

import type { CommandServices } from "#/shared/lib/command.ts";
import { NO_FOO_RULE, commitEmpty, lines, runGit } from "#/shared/lib/fixture.test.support.ts";
import { toJson } from "#/shared/lib/json.ts";

import { failedChecksOf, manifest, repositoryWith, run, statusLines } from "./vpa.test.support.ts";

const LEAK = Arr.join(["AKIA", "Z7XQ2JN4VBD3KPLM"], "");

const passesEveryConfiguredCheck = Effect.gen(function* passesEveryConfiguredCheck() {
  const root = yield* repositoryWith({ commits: ["feat: second"] });
  const { exit, output } = yield* run(root, []);
  assertTrue(Exit.isSuccess(exit));
  deepStrictEqual(statusLines(output), ["✓ h56m", "✓ commitlint", "✓ dependencies", "✓ textlint"]);
});

const namesTheFailingChecks = Effect.gen(function* namesTheFailingChecks() {
  const root = yield* repositoryWith({
    files: { "libs/a/package.json": manifest({ "left-pad": "1.0.0" }) },
    commits: ["no type"],
  });
  const { exit, output } = yield* run(root, []);
  assertFalse(Exit.isSuccess(exit));
  const failed = failedChecksOf(output);
  deepStrictEqual(failed, ["✗ commitlint", "✗ dependencies"]);
});

const SOURCE_CONFIG = lines(
  'export default { textlint: { rules: {}, sources: [{ files: ["notes/**/*.txt"],',
  '  rules: { "no-foo": true } }] } };',
);

const lintsTheConfiguredSources = Effect.gen(function* lintsTheConfiguredSources() {
  const root = yield* repositoryWith({
    files: {
      "vite.config.ts": SOURCE_CONFIG,
      "node_modules/textlint-rule-no-foo/package.json": toJson({
        name: "textlint-rule-no-foo",
        main: "index.js",
      }),
      "node_modules/textlint-rule-no-foo/index.js": NO_FOO_RULE,
      "notes/deep/a.txt": "This line says foo.\n",
      "docs/foo.md": "# Foo\n\nThis line says foo.\n",
    },
  });
  const { exit, output } = yield* run(root, []);
  assertFalse(Exit.isSuccess(exit));
  deepStrictEqual(failedChecksOf(output), ["✗ textlint"]);
  assertTrue(Str.includes("notes/deep/a.txt")(output));
  assertFalse(Str.includes("docs/foo.md")(output));
});

const lintsTheCommitMessageFile = Effect.gen(function* lintsTheCommitMessageFile() {
  const root = yield* repositoryWith({ files: { GOOD_MSG: "feat: add\n", BAD_MSG: "no type\n" } });
  const results = yield* Effect.forEach(
    [
      ["--commit-msg", `${root}/GOOD_MSG`],
      ["--commit-msg", `${root}/BAD_MSG`],
      ["--commit-msg"],
      ["--other"],
    ],
    (args) => run(root, args),
    { concurrency: 1 },
  );
  deepStrictEqual(
    pipe(
      results,
      Arr.map(({ exit }) => Exit.isSuccess(exit)),
    ),
    [true, false, false, false],
  );
});

const lintsAGivenMessage = Effect.gen(function* lintsAGivenMessage() {
  const root = yield* repositoryWith();
  const results = yield* Effect.forEach(
    [["--message", "feat: add (#7)"], ["--message", "no type (#7)"], ["--message"]],
    (args) => run(root, args),
    { concurrency: 1 },
  );
  deepStrictEqual(
    pipe(
      results,
      Arr.map(({ exit }) => Exit.isSuccess(exit)),
    ),
    [true, false, false],
  );
});

const scansTheStagedChanges = Effect.gen(function* scansTheStagedChanges() {
  const root = yield* repositoryWith({
    files: { "clean.txt": "hello\n", "leak.txt": `${LEAK}\n` },
  });
  yield* runGit(root, ["add", "clean.txt"]);
  const clean = yield* run(root, ["--staged"]);
  yield* runGit(root, ["add", "leak.txt"]);
  const leaked = yield* run(root, ["--staged"]);
  assertTrue(Exit.isSuccess(clean.exit));
  assertFalse(Exit.isSuccess(leaked.exit));
});

const shallowCloneOf = (
  files: Readonly<Record<string, string>>,
): Effect.Effect<string, never, CommandServices | Scope.Scope> =>
  Effect.gen(function* shallowClone() {
    const origin = yield* repositoryWith({ files });
    yield* runGit(origin, ["add", "-A"]);
    yield* commitEmpty(origin, "feat: add the files");
    const fs = yield* FileSystem.FileSystem;
    const parent = yield* fs.makeTempDirectoryScoped({ prefix: "vpa-clone-" }).pipe(Effect.orDie);
    yield* runGit(parent, ["clone", "-q", "--depth", "1", `file://${origin}`, "clone"]);
    return `${parent}/clone`;
  });

const scansTheTreeOfAShallowClone = Effect.gen(function* scansTheTreeOfAShallowClone() {
  const clean = yield* shallowCloneOf({ "clean.txt": "hello\n" });
  const leaked = yield* shallowCloneOf({ "leak.txt": `${LEAK}\n` });
  const cleanRun = yield* run(clean, []);
  const leakedRun = yield* run(leaked, []);
  deepStrictEqual(failedChecksOf(cleanRun.output), []);
  deepStrictEqual(failedChecksOf(leakedRun.output), ["✗ h56m"]);
});

layer(fixtureLayer)("vpa", (it) => {
  it.effect(
    "runs every check configured in vite.config.ts and passes",
    () => passesEveryConfiguredCheck,
  );
  it.effect("reports each failing check by name", () => namesTheFailingChecks);
  it.effect("lints a commit message file for the commit-msg hook", () => lintsTheCommitMessageFile);
  it.effect("lints a message given on the command line", () => lintsAGivenMessage);
  it.effect("lints the files of each textlint source", () => lintsTheConfiguredSources);
  it.effect("scans the staged changes for the pre-commit hook", () => scansTheStagedChanges);
  it.effect(
    "scans the committed tree when the clone has no history to diff",
    () => scansTheTreeOfAShallowClone,
  );
});
