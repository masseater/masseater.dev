import { Effect, Schema } from "effect";
import { Command } from "effect/cli";

import { sessionWork, workSummary } from "#/features/sum-claude-work/index.ts";
import { writeReport } from "#/shared/lib/output.ts";

import { dirFlag, outFlag } from "./flags.ts";

const ToolRow = Schema.Struct({
  tool: Schema.String,
  calls: Schema.Finite,
  failures: Schema.Finite,
  seconds: Schema.Finite,
});

const WorkRow = Schema.Struct({
  session: Schema.String,
  requests: Schema.Finite,
  apiErrors: Schema.Finite,
  inputTokens: Schema.Finite,
  outputTokens: Schema.Finite,
  cacheReadTokens: Schema.Finite,
  cacheCreationTokens: Schema.Finite,
  costUsd: Schema.Finite,
  apiSeconds: Schema.Finite,
  tools: Schema.Array(ToolRow),
});

const runClaude = Effect.fn("command.claude")(function* runClaude(
  input: Readonly<{ dir: string; out: string }>,
) {
  const works = yield* sessionWork(input.dir);
  yield* writeReport({
    out: input.out,
    name: "claude",
    codec: Schema.Array(WorkRow),
    value: works,
    summary: `## Claude's work per session\n\n${workSummary(works)}\n`,
  });
});

/** @internal */
export const claudeCommand = Command.make("claude", { dir: dirFlag, out: outFlag }, runClaude);
