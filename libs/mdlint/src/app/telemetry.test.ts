import { NodeServices } from "@effect/platform-node";
import { waitForSpans } from "@r_masseater/vitest-otlp";
import { Array as Arr, Effect, FileSystem, ManagedRuntime, Path, pipe } from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import { lint } from "./index.ts";

const services = ManagedRuntime.make(NodeServices.layer);
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
      where: (span) => span.traceId === caller.traceId && span.name === "mdlint.rule",
      count: BUILTIN_RULES,
    });
    expect(rules).toHaveLength(BUILTIN_RULES);
    expect(
      pipe(
        rules,
        Arr.every((span) => span.resource["service.name"] === "mdlint"),
      ),
    ).toBe(true);
    const entries = yield* waitForSpans({
      where: (span) => span.traceId === caller.traceId && span.name === "mdlint.lint_paths",
    });
    expect(entries).toHaveLength(ENTRY_SPANS);
  }).pipe(Effect.scoped, services.runPromise));
