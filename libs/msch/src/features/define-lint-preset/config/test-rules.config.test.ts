import { fileURLToPath } from "node:url";

import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Layer, Schema, Stream, String as Str, pipe } from "effect";
import { ChildProcess } from "effect/process";
import { expect } from "vite-plus/test";

import { directoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { testDoubleSyntax } from "./test-rules.config.ts";

const OXLINT = fileURLToPath(new URL("./bin/oxlint", import.meta.resolve("oxlint/package.json")));

const ESLINT_PLUGIN = fileURLToPath(import.meta.resolve("oxlint-plugin-eslint"));

const Config = Schema.fromJsonString(Schema.Unknown);

const findingsIn = Effect.fn("findingsIn")(function* findingsIn(source: string) {
  const config = yield* Schema.encodeEffect(Config)({
    jsPlugins: [{ name: "eslint-js", specifier: ESLINT_PLUGIN }],
    rules: { "eslint-js/no-restricted-syntax": ["error", ...testDoubleSyntax] },
  });
  const root = yield* directoryWith({ ".oxlintrc.json": config, "subject.test.ts": source });
  const handle = yield* ChildProcess.make(
    process.execPath,
    [OXLINT, "--format", "unix", "subject.test.ts"],
    {
      cwd: root,
      extendEnv: false,
      env: { LANG: "C" },
      stdin: "ignore",
    },
  );
  const [output] = yield* Effect.all(
    [handle.stdout.pipe(Stream.decodeText(), Stream.mkString), handle.exitCode],
    { concurrency: "unbounded" },
  );
  return pipe(Str.split(output, "\n"), Arr.filter(Str.includes("no-restricted-syntax")));
}, Effect.scoped);

const flagged = Effect.fn("flagged")(function* flagged(source: string) {
  const findings = yield* findingsIn(source);
  expect({ source, findings: findings.length }).toStrictEqual({ source, findings: 1 });
});

const MODULE_MOCKS = [
  'vi.mock("./read.ts");\n',
  'vi.mock("cloudflare:workers", () => ({ env: {} }));\n',
  'vi.doMock("node:fs");\n',
  'vi.doMock("cloudflare:workers");\n',
];

const GLOBAL_STUBS = [
  'vi.stubGlobal("fetch", () => Promise.resolve(new Response()));\n',
  'vi.stubGlobal("location", new URL("https://example.com/"));\n',
  'vi.stubGlobal("navigator", {});\n',
];

const flagsEveryModuleMock = Effect.forEach(MODULE_MOCKS, flagged, {
  concurrency: 1,
  discard: true,
});

const flagsEveryGlobalStub = Effect.forEach(GLOBAL_STUBS, flagged, {
  concurrency: 1,
  discard: true,
});

const allowsPlainTests = Effect.gen(function* allowsPlainTests() {
  const findings = yield* findingsIn(
    'import { expect, test, vi } from "vite-plus/test";\ntest("adds", () => { vi.useFakeTimers(); expect(1 + 1).toBe(2); });\n',
  );
  expect(findings).toStrictEqual([]);
});

layer(Layer.merge(fixtureLayer, nodeServicesLayer))("test double lint rules", (it) => {
  it.effect("report every module mock, the platform module included", () => flagsEveryModuleMock);
  it.effect("report every stubbed global, not only fetch", () => flagsEveryGlobalStub);
  it.effect("leave tests without test doubles alone", () => allowsPlainTests);
});
