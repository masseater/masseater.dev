import type { Position } from "@r_masseater/fu4";
import { Option, pipe } from "effect";

import type { Step } from "#/entities/workflow/model/job-types.ts";
import {
  isChecked,
  runnerShell,
  sanitize,
  shellOf,
  shown,
  stepShell,
} from "#/features/actionlint/lib/shellcheck.ts";
import type { Shells } from "#/features/actionlint/lib/shellcheck.ts";
import { runOf } from "#/features/actionlint/lib/step.ts";
import { NOOP, workflowRule } from "#/features/actionlint/lib/workflow-rule.ts";
import type { Visitor } from "#/features/actionlint/lib/workflow-rule.ts";
import { checkShell } from "#/shared/shell/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

const checkedRun =
  (shells: Readonly<Shells>) =>
  (step: Step): Option.Option<readonly [Text, Position]> =>
    pipe(
      runOf(step),
      Option.filter((run) => isChecked(stepShell(shells)(run))),
      Option.flatMap((run) =>
        Option.all([Option.fromNullishOr(run.run), Option.fromNullishOr(run.runPosition)]),
      ),
    );

export const shellcheck = workflowRule({
  description: "Reports shellcheck findings in bash and sh run scripts",
  docs: "https://github.com/rhysd/actionlint/blob/main/docs/checks.md#check-shellcheck-integ",
  visitor: (fail, context): Visitor => {
    const shells: Shells = { workflow: Option.none(), job: Option.none(), runner: Option.none() };
    return {
      ...NOOP,
      workflowPre: (workflow) => {
        shells.workflow = shellOf(workflow.defaults);
      },
      jobPre: (job) => {
        shells.job = shellOf(job.defaults);
        shells.runner = runnerShell(job);
      },
      jobPost: () => {
        shells.job = Option.none();
        shells.runner = Option.none();
      },
      step: (step) => {
        for (const [script, at] of Option.toArray(checkedRun(shells)(step))) {
          for (const finding of checkShell(context.parseScript("bash", sanitize(script.value)))) {
            fail(at, shown(finding));
          }
        }
      },
    };
  },
});
