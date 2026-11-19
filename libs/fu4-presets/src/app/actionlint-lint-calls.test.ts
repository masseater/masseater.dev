import { layer as nodeServices } from "@effect/platform-node/NodeServices";
import { lintText } from "@r_masseater/fu4";
import type { Diagnostic } from "@r_masseater/fu4";
import {
  Array as Arr,
  Effect,
  FileSystem,
  ManagedRuntime,
  Path,
  Schema,
  String as Str,
  pipe,
} from "effect";
import { afterAll, expect, test } from "vite-plus/test";

import { actionlint } from "#/app/presets.ts";

import { FIXTURES, PREFIX, normalize, verdictOf } from "./actionlint-harness.test.support.ts";
import type { Outcome } from "./actionlint-harness.test.support.ts";

const CALLS = `${FIXTURES}/lint-calls.json`;
const KNOWN = "fixtures/actionlint-lint-calls-known-failures.txt";
const SEQUENTIAL = { concurrency: 1 } as const;

const ErrorSchema = Schema.Struct({
  line: Schema.Int,
  column: Schema.Int,
  message: Schema.String,
  rule: Schema.String,
});

const CallSchema = Schema.Struct({
  id: Schema.String,
  content: Schema.String,
  configVariables: Schema.NullOr(Schema.Array(Schema.String)),
  unsupported: Schema.String,
  errors: Schema.Array(ErrorSchema),
});

type Call = typeof CallSchema.Type;

const Recorded = Schema.fromJsonString(Schema.Array(CallSchema));

const here = Effect.gen(function* here() {
  const path = yield* Path.Path;
  const file = yield* path.fromFileUrl(new URL(import.meta.url));
  return path.dirname(file);
});

const shown = (diagnostic: Diagnostic): string =>
  `${String(diagnostic.line)}:${String(diagnostic.column)}: ${normalize(diagnostic.message)} [${Str.replace(PREFIX, "")(diagnostic.rule)}]`;

const wantOf = (call: Call): readonly string[] =>
  pipe(
    call.errors,
    Arr.map(
      ({ line, column, message, rule }) =>
        `${String(line)}:${String(column)}: ${message} [${rule}]`,
    ),
  );

const outcomeOf = Effect.fn("outcomeOf")(function* outcomeOf(dir: string, call: Call) {
  if (Str.isNonEmpty(call.unsupported)) {
    return {
      id: call.id,
      want: wantOf(call),
      have: [`not run: ${call.unsupported}`],
    } satisfies Outcome;
  }
  const found = yield* lintText({
    root: dir,
    path: "test.yaml",
    kind: "workflow",
    text: call.content,
    config: actionlint(),
  });
  return { id: call.id, want: wantOf(call), have: pipe(found, Arr.map(shown)) } satisfies Outcome;
});

const services = ManagedRuntime.make(nodeServices);
afterAll(() => services.dispose());

test("matches actionlint on the workflows its Go tests lint outside testdata", () =>
  Effect.gen(function* lintCalls() {
    const fileSystem = yield* FileSystem.FileSystem;
    const path = yield* Path.Path;
    const dir = yield* here;
    const text = yield* fileSystem.readFileString(path.join(dir, CALLS));
    const calls = yield* Schema.decodeEffect(Recorded)(text);
    const outcomes = yield* Effect.forEach(calls, (call) => outcomeOf(dir, call), SEQUENTIAL);
    const known = yield* fileSystem.readFileString(path.join(dir, KNOWN));
    expect(verdictOf(known)(outcomes)).toStrictEqual({ unexpected: [], fixed: [] });
  }).pipe(services.runPromise));
