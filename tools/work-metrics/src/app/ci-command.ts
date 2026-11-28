import { Clock, Effect, Path } from "effect";
import { Command, Flag } from "effect/cli";

import { downloadCiTraces } from "#/features/time-spans/index.ts";
import { repositoryOf } from "#/shared/api/index.ts";
import { sinceDays } from "#/shared/lib/output.ts";

import { daysFlag, outFlag, topFlag } from "./flags.ts";
import { reportSpans } from "./span-report.ts";

const DEFAULT_WORKFLOW = "verify.yml";

const repositoryFlag = Flag.String("repo");
const workflowFlag = Flag.String("workflow").pipe(Flag.withDefault(DEFAULT_WORKFLOW));

const runCi = Effect.fn("command.ci")(function* runCi(
  input: Readonly<{ repo: string; workflow: string; days: number; out: string; top: number }>,
) {
  const path = yield* Path.Path;
  const now = yield* Clock.currentTimeMillis;
  const directories = yield* downloadCiTraces({
    repository: repositoryOf(input.repo),
    workflow: input.workflow,
    since: sinceDays(input.days)(now),
    into: path.join(input.out, "ci-traces"),
  });
  yield* reportSpans({
    dir: directories,
    out: input.out,
    top: input.top,
    title: `Time per span of ${input.workflow}, last ${String(input.days)} days`,
  });
});

/** @internal */
export const ciCommand = Command.make(
  "ci",
  { repo: repositoryFlag, workflow: workflowFlag, days: daysFlag, out: outFlag, top: topFlag },
  runCi,
);
