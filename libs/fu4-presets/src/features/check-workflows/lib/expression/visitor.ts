import type { RuleContext } from "@r_masseater/fu4";
import { Option } from "effect";

import { settingsOf } from "#/features/check-workflows/lib/settings.ts";
import type { Fail, Visitor } from "#/features/check-workflows/lib/workflow-rule.ts";

import type { ExprEnv, Vars } from "./env.ts";
import { jobVars } from "./job-vars.ts";
import { checkJobPost, checkJobPre } from "./job.ts";
import { jobInfos } from "./outputs.ts";
import type { JobInfo } from "./outputs.ts";
import { checkStep } from "./step.ts";
import { callOutputsJobs, checkCallOutputs, checkWorkflow } from "./workflow.ts";

const EMPTY_VARS: Vars = {
  matrix: Option.none(),
  steps: Option.none(),
  needs: Option.none(),
  secrets: Option.none(),
  inputs: Option.none(),
  dispatchInputs: Option.none(),
  jobs: Option.none(),
};

const JOB_RESET = { matrix: Option.none(), steps: Option.none(), needs: Option.none() } as const;

export interface Target {
  readonly fail: Fail;
  readonly context: RuleContext;
}

export const expressionVisitor = ({ fail, context }: Target): Visitor => {
  let vars = EMPTY_VARS;
  let infos: Readonly<Record<string, JobInfo>> = {};
  const env: ExprEnv = { fail, configVars: settingsOf(context).configVariables, vars: () => vars };
  const scope = { env, project: context.project };
  return {
    workflowPre: (workflow): void => {
      vars = { ...EMPTY_VARS, ...checkWorkflow(env)(workflow) };
      infos = jobInfos(workflow);
    },
    jobPre: (job): void => {
      vars = { ...vars, ...jobVars(scope)(job, infos) };
      checkJobPre(scope)(job);
    },
    step: (step): void => {
      vars = { ...vars, steps: checkStep(scope)(step, vars.steps) };
    },
    jobPost: (job): void => {
      checkJobPost(env)(job);
      vars = { ...vars, ...JOB_RESET };
    },
    workflowPost: (workflow): void => {
      vars = { ...vars, jobs: callOutputsJobs(workflow) };
      checkCallOutputs(env)(workflow);
    },
  };
};
