import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import {
  Array as Arr,
  Effect,
  FileSystem,
  Path,
  Record as Rec,
  Schema,
  Stream,
  String as Str,
  pipe,
} from "effect";
import { ChildProcess } from "effect/process";
import { expect } from "vite-plus/test";

import { JSON_FLAG } from "./cli-contract.ts";

const PASSED = 0;
const FAILED = 1;

const encodeJson = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const fixtureFiles = Effect.gen(function* fixtureFiles() {
  const manifest = yield* encodeJson({ name: "fixture" });
  const tsconfig = yield* encodeJson({
    compilerOptions: {
      strict: true,
      module: "nodenext",
      moduleResolution: "nodenext",
      target: "esnext",
      noEmit: true,
      skipLibCheck: true,
    },
    include: ["src"],
  });
  return { "package.json": manifest, "tsconfig.json": tsconfig };
}).pipe(Effect.orDie);

const DUPLICATED_SETS: Readonly<Record<string, string>> = {
  "src/a.ts": 'export type Mode = "light" | "dark";\n',
  "src/b.ts": 'export const MODES = ["dark", "light"] as const;\n',
};

const CLEAN_SOURCE: Readonly<Record<string, string>> = {
  "src/a.ts": "export const answer = 42;\n",
};

const ReportedProblems = Schema.fromJsonString(
  Schema.Array(Schema.Struct({ rule: Schema.String })),
);

const repositoryWith = Effect.fn("repositoryWith")(function* repositoryWith(
  sources: Readonly<Record<string, string>>,
) {
  const fs = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fs.makeTempDirectoryScoped({ prefix: "msch-cli-" });
  const fixtures = yield* fixtureFiles;
  yield* Effect.forEach(
    Rec.toEntries({ ...fixtures, ...sources }),
    ([name, source]) => {
      const file = path.join(root, name);
      return fs
        .makeDirectory(path.dirname(file), { recursive: true })
        .pipe(Effect.andThen(fs.writeFileString(file, source)));
    },
    { discard: true },
  );
  return root;
});

const textOf = <Err, Req>(
  stream: Stream.Stream<Uint8Array, Err, Req>,
): Effect.Effect<string, Err, Req> => stream.pipe(Stream.decodeText(), Stream.mkString);

const mschIn = Effect.fn("mschIn")(function* mschIn(root: string, args: readonly string[]) {
  const path = yield* Path.Path;
  const cli = path.join(import.meta.dirname, "cli.ts");
  const handle = yield* ChildProcess.make(process.execPath, [cli, ...args], { cwd: root });
  const [stdout, stderr, status] = yield* Effect.all(
    [textOf(handle.stdout), textOf(handle.stderr), handle.exitCode],
    { concurrency: "unbounded" },
  );
  return { stdout, stderr, status: Number(status) };
});

const passesARepositoryWithoutProblems = Effect.gen(function* passesARepositoryWithoutProblems() {
  const root = yield* repositoryWith(CLEAN_SOURCE);
  const run = yield* mschIn(root, []);
  expect(run).toStrictEqual({ stdout: "", stderr: "", status: PASSED });
});

const failsWithOneLinePerProblem = Effect.gen(function* failsWithOneLinePerProblem() {
  const root = yield* repositoryWith(DUPLICATED_SETS);
  const run = yield* mschIn(root, []);
  expect(run.status).toBe(FAILED);
  expect(run.stderr).toBe("");
  const lines = pipe(Str.trimEnd(run.stdout), Str.split("\n"));
  const flagged = pipe(lines, Arr.map(Str.includes("duplicate-value-set")));
  expect(flagged).toStrictEqual([true, true]);
});

const printsProblemsAsJson = Effect.gen(function* printsProblemsAsJson() {
  const root = yield* repositoryWith(DUPLICATED_SETS);
  const run = yield* mschIn(root, [JSON_FLAG]);
  expect(run.status).toBe(PASSED);
  const problems = yield* Schema.decodeEffect(ReportedProblems)(run.stdout);
  expect(
    pipe(
      problems,
      Arr.map((problem) => problem.rule),
    ),
  ).toStrictEqual(["duplicate-value-set", "duplicate-value-set"]);
});

const CLI_TIMEOUT = 120_000;

layer(nodeServicesLayer)("msch CLI", (it) => {
  it.effect(
    "passes a repository without problems",
    () => passesARepositoryWithoutProblems,
    CLI_TIMEOUT,
  );
  it.effect("fails with one line per problem", () => failsWithOneLinePerProblem, CLI_TIMEOUT);
  it.effect("prints the problems as JSON", () => printsProblemsAsJson, CLI_TIMEOUT);
});
