import { Array as Arr, Match, Option, pipe } from "effect";

import type { Audit, AuditContext, Produced } from "#/features/audit-workflows/model/audit.ts";
import type {
  ActionInput,
  AuditInput,
  NormalJob,
  PreCommitConfigInput,
  WorkflowInput,
} from "#/features/audit-workflows/model/input.ts";
import type { StepView } from "#/features/audit-workflows/model/step.ts";

import { compositeSteps } from "./action.ts";
import { combined, producedBy } from "./produced.ts";
import { stepView, stepsOf } from "./workflow-steps.ts";
import { jobsOf } from "./workflow.ts";

type Handler<Input> = (input: Input, context: AuditContext) => Produced;

const none = (): Produced => [];

const orElse =
  <Input>(handler: Handler<Input> | undefined, fallback: Handler<Input>): Handler<Input> =>
  (input, context) =>
    Option.match(Option.fromNullishOr(handler), {
      onNone: () => fallback(input, context),
      onSome: (run) => run(input, context),
    });

export const defaultNormalJob =
  (audit: Audit) =>
  (job: NormalJob) =>
  (context: AuditContext): Produced =>
    pipe(
      stepsOf(job),
      producedBy((each) => orElse(audit.step, none)(stepView(each), context)),
    );

export const defaultWorkflow =
  (audit: Audit) =>
  (workflow: WorkflowInput) =>
  (context: AuditContext): Produced => {
    const normal = orElse(audit.normalJob, (job: NormalJob) =>
      defaultNormalJob(audit)(job)(context),
    );
    const reusable = orElse(audit.reusableJob, none);
    return pipe(
      jobsOf(workflow),
      producedBy((job) => {
        if (job.type === "normal") {
          return normal(job.job, context);
        }
        return reusable(job.job, context);
      }),
    );
  };

const dockerOf = (audit: Audit): Handler<ActionInput> => orElse(audit.dockerAction, none);

export const defaultAction =
  (audit: Audit) =>
  (action: ActionInput) =>
  (context: AuditContext): Produced => {
    const composite = orElse(audit.compositeStep, none);
    const steps = Option.getOrElse(compositeSteps(action), (): readonly StepView[] => []);
    const docker = Arr.filter([action], (each) => each.model.runs.type === "docker");
    return combined([
      pipe(
        docker,
        producedBy((each) => dockerOf(audit)(each, context)),
      ),
      pipe(
        steps,
        producedBy((step) => composite(step, context)),
      ),
    ]);
  };

const defaultPreCommit =
  (audit: Audit): Handler<PreCommitConfigInput> =>
  (config, context) => {
    const repo = orElse(audit.preCommitRepo, none);
    return combined(
      pipe(
        config.model.repos,
        Arr.map((model, index) => repo({ index, model, input: config }, context)),
      ),
    );
  };

const structured = (audit: Audit, context: AuditContext): ((input: AuditInput) => Produced) =>
  Match.type<AuditInput>().pipe(
    Match.discriminatorsExhaustive("kind")({
      workflow: (input) =>
        orElse(audit.workflow, (each: WorkflowInput) => defaultWorkflow(audit)(each)(context))(
          input,
          context,
        ),
      action: (input) =>
        orElse(audit.action, (each: ActionInput) => defaultAction(audit)(each)(context))(
          input,
          context,
        ),
      dependabot: (input) => orElse(audit.dependabot, none)(input, context),
      "pre-commit-config": (input) =>
        orElse(audit.preCommitConfig, defaultPreCommit(audit))(input, context),
      "pre-commit-hooks": (input) => orElse(audit.preCommitHooks, none)(input, context),
    }),
  );

export const runAudit =
  (audit: Audit) =>
  (input: AuditInput) =>
  (context: AuditContext): Produced =>
    combined([structured(audit, context)(input), orElse(audit.raw, none)(input, context)]);
