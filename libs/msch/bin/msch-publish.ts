#!/usr/bin/env node
import { Effect, Schema, Stdio } from "effect";

import { runCli } from "#/app/runtime.ts";
import {
  planOf,
  publishRelease,
  publishToNpm,
  writePlan,
} from "#/features/publish-workspace/index.ts";

const Arguments = Schema.Union([
  Schema.Tuple([Schema.Literal("plan"), Schema.String]),
  Schema.Tuple([Schema.Literal("npm"), Schema.String]),
  Schema.Tuple([Schema.Literal("release"), Schema.String]),
]);

const taggedError = Schema.TaggedError;

class UsageError extends taggedError<UsageError, { readonly brand: unique symbol }>()(
  "UsageError",
  { message: Schema.String },
) {}

const USAGE = "usage: msch-publish <plan|npm|release> <workspace directory>";

const publish = Effect.gen(function* publish() {
  const stdio = yield* Stdio.Stdio;
  const args = yield* stdio.args;
  const [step, directory] = yield* Schema.decodeUnknownEffect(Arguments)(args).pipe(
    Effect.mapError(() => UsageError.make({ message: USAGE })),
  );
  if (step === "plan") {
    return yield* planOf(directory).pipe(Effect.flatMap(writePlan));
  }
  if (step === "npm") {
    return yield* publishToNpm(directory);
  }
  return yield* publishRelease(directory);
});

runCli(publish);
