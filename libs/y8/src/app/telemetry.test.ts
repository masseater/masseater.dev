import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { waitForSpans } from "@r_masseater/vitest-otlp";
import { Array as Arr, Effect, FileSystem, Layer, ManagedRuntime, Path, pipe } from "effect";
import { FetchHttpClient } from "effect/http";
import { Otlp, OtlpSerialization } from "effect/observability";
import { afterAll, expect, test } from "vite-plus/test";

import { definePlugin, defineRule, lint } from "./index.ts";

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

const BUILTIN_RULES = 53;
const ENTRY_SPANS = 1;

const tempRoot = Effect.gen(function* tempRoot() {
  const fileSystem = yield* FileSystem.FileSystem;
  const path = yield* Path.Path;
  const root = yield* fileSystem.makeTempDirectoryScoped();
  yield* fileSystem.writeFileString(path.join(root, "a.md"), "# A\n");
  return root;
});

test("the Rust side exports its spans under the caller's trace", () =>
  Effect.gen(function* traced() {
    const root = yield* tempRoot;
    const caller = yield* Effect.makeSpanScoped("caller");
    yield* lint({ root, files: ["a.md"] }).pipe(Effect.withParentSpan(caller));
    const rules = yield* waitForSpans({
      where: (span) => span.traceId === caller.traceId && span.name === "y8.rule",
      count: BUILTIN_RULES,
    });
    expect(rules).toHaveLength(BUILTIN_RULES);
    expect(
      pipe(
        rules,
        Arr.every((span) => span.resource["service.name"] === "y8"),
      ),
    ).toBe(true);
    const entries = yield* waitForSpans({
      where: (span) => span.traceId === caller.traceId && span.name === "y8.lint_paths",
    });
    expect(entries).toHaveLength(ENTRY_SPANS);
  }).pipe(Effect.scoped, services.runPromise));

const FIRST_LINE = 1;
const FIRST_COLUMN = 1;
const TRANSFER_SPANS = ["y8.encode_tree", "y8.to_js", "y8.script_rules"];

const traced = Layer.mergeAll(
  nodeServices,
  Otlp.layerFromConfig({ resource: { serviceName: "y8-test" } }).pipe(
    Layer.provide(OtlpSerialization.layerJson),
    Layer.provide(FetchHttpClient.layer),
  ),
);

const visited = defineRule({
  meta: { description: "Reports every heading" },
  create: (context) => ({
    heading: (node): void => {
      context.report({ node, message: "heading" });
    },
  }),
});

const lintWithScriptRule = Effect.gen(function* withScriptRule() {
  const root = yield* tempRoot;
  return yield* lint({
    root,
    files: ["a.md"],
    config: {
      plugins: { local: definePlugin({ rules: { visited } }) },
      rules: { "local/visited": "error" },
    },
  }).pipe(Effect.withSpan("caller"));
}).pipe(Effect.scoped);

test("passing the tree to TypeScript rules and running them is traced", () =>
  Effect.gen(function* tracedRun() {
    const runtime = ManagedRuntime.make(traced);
    const diagnostics = yield* Effect.promise(() => runtime.runPromise(lintWithScriptRule));
    yield* Effect.promise(() => runtime.dispose());
    expect(
      pipe(
        diagnostics,
        Arr.filter(({ rule }) => rule === "local/visited"),
        Arr.map(({ line, column }) => [line, column]),
      ),
    ).toStrictEqual([[FIRST_LINE, FIRST_COLUMN]]);
    const spans = yield* waitForSpans({
      where: (span) => Arr.contains(TRANSFER_SPANS, span.name),
      count: TRANSFER_SPANS.length,
    });
    const names = pipe(
      spans,
      Arr.map(({ name }) => name),
    );
    expect(new Set(names)).toStrictEqual(new Set(TRANSFER_SPANS));
  }).pipe(services.runPromise));
