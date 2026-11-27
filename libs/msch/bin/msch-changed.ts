#!/usr/bin/env node
import { Array as Arr, Effect, Option, Schema, Stdio } from "effect";

import { ProblemsFound } from "#/app/output.ts";
import { runCli } from "#/app/runtime.ts";
import { invocationOf, runChanged } from "#/features/run-changed/index.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const SUCCESS = 0;
const ONE_FAILURE = 1;
const USAGE =
  "usage: msch-changed [--batch-sources <count>] <command> [arguments]. Runs the command with the paths of the workspaces whose inputs changed since it last passed, in batches of at most <count> source files.";

const taggedError = Schema.TaggedError;

class UsageError extends taggedError<UsageError, { readonly brand: unique symbol }>()(
  "UsageError",
  { message: Schema.String },
) {}

const invocation = Effect.gen(function* invocation() {
  const stdio = yield* Stdio.Stdio;
  const args = yield* stdio.args;
  const parsed = Option.liftPredicate(Arr.isReadonlyArrayNonEmpty)(args).pipe(
    Option.flatMap(invocationOf),
  );
  if (Option.isNone(parsed)) {
    return yield* UsageError.make({ message: USAGE });
  }
  return parsed.value;
});

const changed = Effect.gen(function* changed() {
  const files = yield* RepositoryFiles;
  const parsed = yield* invocation;
  const code = yield* runChanged(files.resolve("."), parsed);
  if (code !== SUCCESS) {
    return yield* ProblemsFound.make({ count: ONE_FAILURE });
  }
  return yield* Effect.void;
});

runCli(changed);
