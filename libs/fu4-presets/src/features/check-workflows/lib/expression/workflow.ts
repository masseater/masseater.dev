import { Array as Arr, Option, Record as Rec, pipe } from "effect";

import { STRING, loose, strict } from "#/entities/expression/index.ts";
import type { ObjectType } from "#/entities/expression/index.ts";
import type { Job, Workflow, WorkflowCallEvent } from "#/entities/workflow/index.ts";

import type { ExprEnv } from "./env.ts";
import { checkEvents, withEventVars } from "./events.ts";
import type { EventVars } from "./events.ts";
import { checkConcurrency, checkDefaults, checkEnv } from "./sections.ts";
import { checkString } from "./strings.ts";

export const checkWorkflow =
  (env: ExprEnv) =>
  (workflow: Workflow): EventVars => {
    checkString(env)(workflow.name, "");
    const vars = checkEvents(env)(workflow.on ?? []);
    const after = withEventVars(env)(vars);
    checkString(after)(workflow.runName, "run-name");
    checkEnv(after)(workflow.env, "env");
    checkDefaults(after)(workflow.defaults, "");
    checkConcurrency(after)(workflow.concurrency, "concurrency");
    return vars;
  };

const callEventOf = (workflow: Workflow): Option.Option<WorkflowCallEvent> =>
  pipe(
    workflow.on ?? [],
    Arr.findFirst((event): event is WorkflowCallEvent => event.type === "workflow_call"),
  );

const outputsType = (job: Job): ObjectType =>
  Option.match(Option.fromNullishOr(job.workflowCall), {
    onNone: () =>
      strict(
        pipe(
          job.outputs,
          Rec.map(() => STRING),
        ),
      ),
    onSome: () => loose(),
  });

const jobsType = (workflow: Workflow): ObjectType =>
  strict(
    pipe(
      workflow.jobs ?? {},
      Rec.map((job) => strict({ outputs: outputsType(job) })),
    ),
  );

export const callOutputsJobs = (workflow: Workflow): Option.Option<ObjectType> =>
  pipe(
    callEventOf(workflow),
    Option.filter(
      (call) => !Rec.isEmptyRecord(call.outputs) && !Rec.isEmptyRecord(workflow.jobs ?? {}),
    ),
    Option.map(() => jobsType(workflow)),
  );

export const checkCallOutputs =
  (env: ExprEnv) =>
  (workflow: Workflow): void => {
    for (const call of Option.toArray(callEventOf(workflow))) {
      for (const output of Rec.values(call.outputs)) {
        checkString(env)(output.value, "on.workflow_call.outputs.<output_id>.value");
      }
    }
  };
