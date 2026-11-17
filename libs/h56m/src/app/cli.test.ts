import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Effect, Path, Stream, String as Str } from "effect";
import { ChildProcess } from "effect/process";
import { expect } from "vite-plus/test";

import { TOKEN, commit, emptyRepository, git, write } from "./repository.test.support.ts";

const PASSED = 0;
const FAILED = 1;
const SHORT_COMMIT = 12;
const START = 0;
const TIMEOUT = 120_000;
const PRESET = `${import.meta.dirname}/../../native/core/tests/fixtures/preset.toml`;
const configOf = (more: string): string =>
  `export default { h56m: { extend: { path: "${PRESET}"${more} } } };\n`;
const CONFIG = { "vite.config.ts": configOf("") };
const LEAK = { ...CONFIG, "key.ts": `export const k = "${TOKEN}";\n` };
const CLEAN = { ...CONFIG, "a.ts": "export const a = 1;\n" };
const DISABLED = configOf(', disabledRules: ["github-pat"]');

const textOf = <Err, Req>(
  stream: Stream.Stream<Uint8Array, Err, Req>,
): Effect.Effect<string, Err, Req> => stream.pipe(Stream.decodeText(), Stream.mkString);

const h56mIn = Effect.fn("h56mIn")(function* h56mIn(root: string, args: readonly string[] = []) {
  const path = yield* Path.Path;
  const cli = path.join(import.meta.dirname, "..", "..", "bin", "h56m.ts");
  const handle = yield* ChildProcess.make(process.execPath, [cli, ...args], {
    cwd: root,
    extendEnv: true,
    stdin: "ignore",
  });
  const [stdout, stderr, status] = yield* Effect.all(
    [textOf(handle.stdout), textOf(handle.stderr), handle.exitCode],
    { concurrency: "unbounded" },
  );
  return { stdout, stderr, status: Number(status) };
});

const passesCleanRepository = Effect.gen(function* passesCleanRepository() {
  const root = yield* emptyRepository;
  yield* commit(root, CLEAN);
  const run = yield* h56mIn(root);
  expect(run).toStrictEqual({ stdout: "", stderr: "", status: PASSED });
}).pipe(Effect.scoped);

const failsWithoutPrintingSecret = Effect.gen(function* failsWithoutPrintingSecret() {
  const root = yield* emptyRepository;
  const head = yield* commit(root, LEAK);
  const run = yield* h56mIn(root);
  const short = Str.slice(START, SHORT_COMMIT)(head);
  expect(run.status).toBe(FAILED);
  expect(run.stdout).toMatch(
    /^key\.ts:1:19 github-pat .* sha256:[0-9a-f]{64} \([0-9a-f]{12}\)\n$/u,
  );
  expect(run.stdout).toContain(`(${short})`);
  expect(run.stdout).not.toContain(TOKEN);
}).pipe(Effect.scoped);

const scansAfterBase = Effect.gen(function* scansAfterBase() {
  const root = yield* emptyRepository;
  const base = yield* commit(root, LEAK);
  yield* commit(root, CLEAN);
  const run = yield* h56mIn(root, [base]);
  expect(run).toMatchObject({ stdout: "", status: PASSED });
}).pipe(Effect.scoped);

const scansIndex = Effect.gen(function* scansIndex() {
  const root = yield* emptyRepository;
  yield* commit(root, CLEAN);
  yield* write(root, { "key.ts": LEAK["key.ts"] });
  const unstaged = yield* h56mIn(root, ["--staged"]);
  yield* git(root, ["add", "key.ts"]);
  const staged = yield* h56mIn(root, ["--staged"]);
  expect(unstaged).toMatchObject({ status: PASSED });
  expect(staged.status).toBe(FAILED);
  expect(staged.stdout).toMatch(/^key\.ts:1:19 github-pat /u);
}).pipe(Effect.scoped);

const readsViteConfig = Effect.gen(function* readsViteConfig() {
  const root = yield* emptyRepository;
  yield* commit(root, { ...LEAK, "vite.config.ts": DISABLED });
  const run = yield* h56mIn(root);
  expect(run).toMatchObject({ stdout: "", status: PASSED });
}).pipe(Effect.scoped);

layer(nodeServicesLayer)("h56m CLI", (it) => {
  it.effect("passes a repository without secrets", () => passesCleanRepository, TIMEOUT);
  it.effect("fails without printing the secret", () => failsWithoutPrintingSecret, TIMEOUT);
  it.effect("scans only commits after the given base", () => scansAfterBase, TIMEOUT);
  it.effect("scans the index with --staged", () => scansIndex, TIMEOUT);
  it.effect("reads its settings from vite.config.ts", () => readsViteConfig, TIMEOUT);
});
