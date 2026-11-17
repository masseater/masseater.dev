#!/usr/bin/env node
import { Array as Arr, Effect, Schema, Stdio } from "effect";

import { ProblemsFound } from "#/app/output.ts";
import { runCli } from "#/app/runtime.ts";
import { runChanged } from "#/features/run-changed/index.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

const SUCCESS = 0;
const ONE_FAILURE = 1;
const USAGE =
  "usage: msch-changed <command> [arguments]. Runs the command with the paths of the workspaces whose inputs changed since it last passed.";

const taggedError = Schema.TaggedError;

class UsageError extends taggedError<UsageError, { readonly brand: unique symbol }>()(
  "UsageError",
  { message: Schema.String },
) {}

const changed = Effect.gen(function* changed() {
  const stdio = yield* Stdio.Stdio;
  const files = yield* RepositoryFiles;
  const args = yield* stdio.args;
  if (!Arr.isReadonlyArrayNonEmpty(args)) {
    return yield* UsageError.make({ message: USAGE });
  }
  const code = yield* runChanged(files.resolve("."), args);
  if (code !== SUCCESS) {
    return yield* ProblemsFound.make({ count: ONE_FAILURE });
  }
  return yield* Effect.void;
});

runCli(changed);
