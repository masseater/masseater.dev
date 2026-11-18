import { Array as Arr, Option, String as Str, pipe } from "effect";

import type { If, LoE } from "#/features/audit-workflows/model/common.ts";
import type { SymbolicLocation } from "#/features/audit-workflows/model/finding.ts";
import type { NormalJob, Step } from "#/features/audit-workflows/model/input.ts";
import type { StepBodyCommon, StepView } from "#/features/audit-workflows/model/step.ts";
import type { Defaults, StepModel } from "#/features/audit-workflows/model/workflow.ts";

import { keepsRunning } from "./conditions.ts";
import { envIsStatic } from "./expressions.ts";
import { annotated, withKeys } from "./location.ts";
import { jobLocation, matrixOf, workflowInput, workflowLocation } from "./workflow.ts";

const NOT_PARALLEL = -1;

const shellForLabel = (label: string): Option.Option<string> => {
  if (label === "linux" || label === "macOS") {
    return Option.some("bash");
  }
  if (label === "windows") {
    return Option.some("pwsh");
  }
  if (Str.includes("ubuntu-")(label) || Str.includes("macos")(label)) {
    return Option.some("bash");
  }
  if (Str.includes("windows-")(label)) {
    return Option.some("pwsh");
  }
  return Option.none();
};

export const runnerDefaultShell = (job: NormalJob): Option.Option<string> => {
  const { runsOn } = job.model;
  if (runsOn.type === "expr") {
    return Option.none();
  }
  return Arr.findFirst(runsOn.value.labels, shellForLabel);
};

const rawSteps = (job: NormalJob): readonly Step[] =>
  pipe(
    job.model.steps,
    Arr.flatMap((raw, index): readonly Step[] => {
      if (raw.type === "step") {
        return [{ index, parallelIndex: Option.none(), model: raw.step, job }];
      }
      if (raw.type === "parallel") {
        return pipe(
          raw.steps,
          Arr.map((model, parallel) => ({
            index,
            parallelIndex: Option.some(parallel),
            model,
            job,
          })),
        );
      }
      return [];
    }),
  );

export const stepsOf = (job: NormalJob): readonly Step[] =>
  Arr.filter(rawSteps(job), (step) => keepsRunning(step.model.if));

export const stepLocation = (step: Step): SymbolicLocation => {
  const base = withKeys("steps", step.index)(jobLocation(step.job));
  const located = Option.match(step.parallelIndex, {
    onNone: () => base,
    onSome: (parallel) => withKeys("parallel", parallel)(base),
  });
  return annotated("this step")(located);
};

const gripOf = (
  location: SymbolicLocation,
  name: Option.Option<string>,
  id: Option.Option<string>,
): SymbolicLocation => {
  if (Option.isSome(name)) {
    return withKeys("name")(location);
  }
  if (Option.isSome(id)) {
    return withKeys("id")(location);
  }
  return location;
};

const defaultShellOf = (
  defaults: Option.Option<LoE<string>>,
  location: SymbolicLocation,
): Option.Option<Option.Option<readonly [string, SymbolicLocation]>> =>
  pipe(
    defaults,
    Option.map((shell) => {
      if (shell.type === "literal") {
        return Option.some([shell.value, location] as const);
      }
      return Option.none();
    }),
  );

const DEFAULT_SHELL = ["defaults", "run", "shell"] as const;

const shellIn = (defaults: Option.Option<Defaults>): Option.Option<LoE<string>> =>
  pipe(
    defaults,
    Option.flatMap((each) => each.run),
    Option.flatMap((run) => run.shell),
  );

type Located = readonly [string, SymbolicLocation];

const declaredShell = (
  step: Step,
  shell: Option.Option<LoE<string>>,
): Option.Option<Option.Option<readonly [string, SymbolicLocation]>> => {
  const own = pipe(stepLocation(step), withKeys("shell"), annotated("shell defined here"));
  const jobAt = pipe(
    jobLocation(step.job),
    withKeys(...DEFAULT_SHELL),
    annotated("job default shell defined here"),
  );
  const workflowAt = pipe(
    workflowLocation(step.job.workflow),
    withKeys(...DEFAULT_SHELL),
    annotated("workflow default shell defined here"),
  );
  return pipe(
    defaultShellOf(shell, own),
    Option.orElse(() => defaultShellOf(shellIn(step.job.model.defaults), jobAt)),
    Option.orElse(() => defaultShellOf(shellIn(step.job.workflow.model.defaults), workflowAt)),
  );
};

const impliedShell = (job: NormalJob): Option.Option<Located> => {
  const location = annotated("shell implied by runner")(withKeys("runs-on")(jobLocation(job)));
  return Option.map(runnerDefaultShell(job), (shell): Located => [shell, location]);
};

const runShell = (step: Step): Option.Option<Located> => {
  const { body } = step.model;
  if (body.type !== "run") {
    return Option.none();
  }
  return Option.match(declaredShell(step, body.shell), {
    onSome: (explicit) => explicit,
    onNone: () => impliedShell(step.job),
  });
};

const bodyOf = (model: StepModel): StepBodyCommon => {
  if (model.body.type === "uses") {
    return model.body;
  }
  return { type: "run", run: model.body.run };
};

export const stepView = (step: Step): StepView => {
  const location = stepLocation(step);
  return {
    kind: "workflow",
    input: step.job.workflow,
    document: step.job.workflow.document,
    order: [step.index, Option.getOrElse(step.parallelIndex, () => NOT_PARALLEL)],
    name: step.model.name,
    id: step.model.id,
    if: step.model.if,
    env: step.model.env,
    body: bodyOf(step.model),
    location,
    locationWithGrip: gripOf(location, step.model.name, step.model.id),
    matrix: matrixOf(step.job),
    envIsStatic: (context) =>
      envIsStatic(context)([step.model.env, step.job.model.env, step.job.workflow.model.env]),
    shell: () => runShell(step),
    getInput: workflowInput(step.job.workflow),
    job: Option.some(step.job),
    action: Option.none(),
    index: step.index,
  };
};

export const jobConditions = (job: NormalJob): readonly (readonly [If, SymbolicLocation])[] => [
  ...Arr.map(Option.toArray(job.model.if), (condition) => [condition, jobLocation(job)] as const),
  ...Arr.flatMap(stepsOf(job), (step) =>
    Arr.map(Option.toArray(step.model.if), (condition) => [condition, stepLocation(step)] as const),
  ),
];
