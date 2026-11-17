import { NodeServices } from "@effect/platform-node";
import { waitForSpans } from "@r_masseater/vitest-otlp";
import type { ReceivedSpan } from "@r_masseater/vitest-otlp";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Path,
  Record as Rec,
  Stream,
  String as Str,
  pipe,
} from "effect";
import type { PlatformError } from "effect/PlatformError";
import type { ChildProcessSpawner } from "effect/process";
import { ChildProcess } from "effect/process";
import { afterAll, expect, test } from "vite-plus/test";

const PASSED = 0;
const FAILED = 1;
const CLI_TIMEOUT = 120_000;
const MISPLACED_COUNT = 2;

const services = ManagedRuntime.make(NodeServices.layer);
afterAll(() => services.dispose());

const configWith = (section: string): string =>
  `export default {\n  wism: {\n    kinds: [{ name: "workspace", marker: "package.json", placements: [{ files: ["**/*.ts"], allow: ["src/**"], message: "sits outside src/." }] }],\n    ${section}\n  },\n};\n`;

const MISPLACED: Readonly<Record<string, string>> = {
  "libs/kit/package.json": "{}\n",
  "libs/kit/src/index.ts": "export const ok = 1;\n",
  "libs/kit/kit.ts": "export const loose = 1;\n",
  "libs/other/package.json": "{}\n",
  "libs/other/other.ts": "export const loose = 1;\n",
};

const textOf = <Err, Req>(
  stream: Stream.Stream<Uint8Array, Err, Req>,
): Effect.Effect<string, Err, Req> => stream.pipe(Stream.decodeText(), Stream.mkString);

interface Ran {
  readonly stdout: string;
  readonly stderr: string;
  readonly status: number;
}

const CLEAN: Ran = { stdout: "", stderr: "", status: PASSED };

const writeTree = (
  root: string,
  tree: Readonly<Record<string, string>>,
): Effect.Effect<void, PlatformError, FileSystem.FileSystem | Path.Path> =>
  Effect.gen(function* write() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    yield* Effect.forEach(
      Rec.toEntries(tree),
      ([name, text]) => {
        const file = path.join(root, name);
        return fileSystem
          .makeDirectory(path.dirname(file), { recursive: true })
          .pipe(Effect.andThen(fileSystem.writeFileString(file, text)));
      },
      { concurrency: 1, discard: true },
    );
  });

const run = (
  tree: Readonly<Record<string, string>>,
  args: readonly string[] = [],
): Effect.Effect<
  Ran,
  PlatformError,
  FileSystem.FileSystem | Path.Path | ChildProcessSpawner.ChildProcessSpawner
> =>
  Effect.gen(function* cli() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const root = yield* fileSystem.makeTempDirectoryScoped({ prefix: "wism-cli-" });
    yield* writeTree(root, tree);
    yield* ChildProcess.make("git", ["init", "-q"], { cwd: root, stdin: "ignore" }).pipe(
      Effect.flatMap((handle) => handle.exitCode),
    );
    const bin = path.join(import.meta.dirname, "..", "..", "bin", "wism.ts");
    const handle = yield* ChildProcess.make(process.execPath, [bin, ...args], {
      cwd: root,
      extendEnv: true,
    });
    const [stdout, stderr, status] = yield* Effect.all(
      [textOf(handle.stdout), textOf(handle.stderr), handle.exitCode],
      { concurrency: "unbounded" },
    );
    const ran: Ran = { stdout, stderr, status: Number(status) };
    return ran;
  }).pipe(Effect.scoped);

const linesOf = (stdout: string): readonly string[] =>
  pipe(Str.trimEnd(stdout), Str.split("\n"), Arr.filter(Str.isNonEmpty));

test(
  "passes a repository without findings",
  () =>
    Effect.gen(function* clean() {
      const ran = yield* run({
        "vite.config.mjs": configWith(""),
        "libs/kit/package.json": "{}\n",
        "libs/kit/src/index.ts": "export const ok = 1;\n",
      });
      expect(ran).toStrictEqual(CLEAN);
    }).pipe(services.runPromise),
  CLI_TIMEOUT,
);

test(
  "prints one line per finding and fails on errors",
  () =>
    Effect.gen(function* errors() {
      const ran = yield* run({ "vite.config.mjs": configWith(""), ...MISPLACED });
      expect(ran.status).toBe(FAILED);
      expect(linesOf(ran.stdout)).toStrictEqual([
        "libs/kit/kit.ts:1:1 error placement sits outside src/.",
        "libs/other/other.ts:1:1 error placement sits outside src/.",
      ]);
    }).pipe(services.runPromise),
  CLI_TIMEOUT,
);

test(
  "passes when every finding is a warning",
  () =>
    Effect.gen(function* warnings() {
      const ran = yield* run({
        "vite.config.mjs": configWith(`rules: { placement: "warn" },`),
        ...MISPLACED,
      });
      expect(ran.status).toBe(PASSED);
      expect(linesOf(ran.stdout)).toHaveLength(MISPLACED_COUNT);
    }).pipe(services.runPromise),
  CLI_TIMEOUT,
);

test(
  "lints only the given paths and skips ignored and vendored files",
  () =>
    Effect.gen(function* narrowed() {
      const ran = yield* run(
        {
          "vite.config.mjs": configWith(`ignores: ["libs/kit/kit.ts"],`),
          ".gitattributes": "libs/vendor/** linguist-vendored\n",
          "libs/vendor/package.json": "{}\n",
          "libs/vendor/vendor.ts": "export const loose = 1;\n",
          ...MISPLACED,
        },
        ["libs/kit", "libs/vendor"],
      );
      expect(ran).toStrictEqual(CLEAN);
    }).pipe(services.runPromise),
  CLI_TIMEOUT,
);

test(
  "lints nothing without a config",
  () =>
    Effect.gen(function* unconfigured() {
      const ran = yield* run(MISPLACED);
      expect(ran).toStrictEqual(CLEAN);
    }).pipe(services.runPromise),
  CLI_TIMEOUT,
);

const isLint = (span: ReceivedSpan): boolean =>
  span.resource["service.name"] === "wism" && span.name === "wism.lint";

test(
  "traces the lint",
  () =>
    Effect.gen(function* traced() {
      yield* run({ "vite.config.mjs": configWith(""), ...MISPLACED });
      const spans = yield* waitForSpans({ where: isLint });
      expect(Arr.isReadonlyArrayNonEmpty(spans)).toBe(true);
    }).pipe(services.runPromise),
  CLI_TIMEOUT,
);
