import { Effect, Schema } from "effect";
import { Command } from "effect/cli";

import { lintRuleCosts, ruleSummary } from "#/features/time-lint-rules/index.ts";
import { writeReport } from "#/shared/lib/output.ts";

import { dirsFlag, outFlag } from "./flags.ts";

const RuleRow = Schema.Struct({
  linter: Schema.String,
  rule: Schema.String,
  runs: Schema.Finite,
  totalMillis: Schema.Finite,
  p50Millis: Schema.Finite,
  p90Millis: Schema.Finite,
  maxMillis: Schema.Finite,
  diagnostics: Schema.Finite,
});

const runLint = Effect.fn("command.lint")(function* runLint(
  input: Readonly<{ dir: readonly string[]; out: string }>,
) {
  const costs = yield* lintRuleCosts(input.dir);
  yield* writeReport({
    out: input.out,
    name: "lint",
    codec: Schema.Array(RuleRow),
    value: costs,
    summary: `## Time and diagnostics per lint rule\n\n${ruleSummary(costs)}\n`,
  });
});

/** @internal */
export const lintCommand = Command.make("lint", { dir: dirsFlag, out: outFlag }, runLint);
