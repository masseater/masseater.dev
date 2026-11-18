import { Array as Arr, Boolean as Bool, Option, pipe } from "effect";

import type { Permissions } from "#/features/audit-workflows/model/common.ts";
import type { SymbolicLocation } from "#/features/audit-workflows/model/finding.ts";
import type {
  Job,
  NormalJob,
  ReusableJob,
  WorkflowInput,
} from "#/features/audit-workflows/model/input.ts";
import type { Capability, MatrixView } from "#/features/audit-workflows/model/step.ts";
import type {
  CallInputType,
  DispatchInputType,
} from "#/features/audit-workflows/model/workflow.ts";

import { keepsRunning } from "./conditions.ts";
import { annotated, keyOnly, rootLocation, withKeys } from "./location.ts";
import { matrixView } from "./matrix.ts";

const SINGLE = 1;

export const DANGEROUS_TRIGGERS = ["pull_request_target", "workflow_run", "issue_comment"] as const;

const CACHE_WRITE_EVENTS = [
  "push",
  "workflow_dispatch",
  "repository_dispatch",
  "delete",
  "registry_package",
  "page_build",
  "schedule",
] as const;

export const workflowLocation = (_workflow: WorkflowInput): SymbolicLocation =>
  rootLocation("this workflow");

export const hasEvent =
  (workflow: WorkflowInput) =>
  (event: string): boolean =>
    workflow.model.on.events.has(event);

const triggerLocation = (workflow: WorkflowInput, event: string): SymbolicLocation => {
  const parent = withKeys("on")(workflowLocation(workflow));
  const { syntax } = workflow.model.on;
  if (syntax.type === "mapping") {
    return keyOnly(withKeys(event)(parent));
  }
  if (syntax.type === "scalar") {
    return parent;
  }
  return withKeys(syntax.events.indexOf(event))(parent);
};

export const triggerAt =
  (event: string) =>
  (workflow: WorkflowInput): Option.Option<SymbolicLocation> =>
    Option.liftPredicate(triggerLocation(workflow, event), () => hasEvent(workflow)(event));

export const hasSingleTrigger = (workflow: WorkflowInput): boolean =>
  workflow.model.on.events.size === SINGLE;

export const isReusableOnly = (workflow: WorkflowInput): boolean =>
  hasEvent(workflow)("workflow_call") && hasSingleTrigger(workflow);

export const isCacheWriteTrigger = (workflow: WorkflowInput): boolean =>
  pipe(
    CACHE_WRITE_EVENTS,
    Arr.some((event) => hasEvent(workflow)(event)),
  );

const callCapability = (type: CallInputType): Capability => {
  if (type === "string") {
    return "arbitrary";
  }
  return "fixed";
};

const dispatchCapability = (type: DispatchInputType): Capability => {
  if (type === "string") {
    return "arbitrary";
  }
  return "fixed";
};

export const unify =
  (left: Capability) =>
  (right: Capability): Capability => {
    if (left === "arbitrary" || right === "arbitrary") {
      return "arbitrary";
    }
    if (left === "structured" || right === "structured") {
      return "structured";
    }
    return left;
  };

export const workflowInput =
  (workflow: WorkflowInput) =>
  (name: string): Option.Option<Capability> => {
    const call = pipe(
      workflow.model.on.workflowCall,
      Option.flatMap((event) => Option.fromNullishOr(event.inputs.get(name))),
      Option.map(callCapability),
    );
    const dispatch = pipe(
      workflow.model.on.workflowDispatch,
      Option.flatMap((event) => Option.fromNullishOr(event.inputs.get(name))),
      Option.map(dispatchCapability),
    );
    if (Option.isSome(call) && Option.isSome(dispatch)) {
      return Option.some(unify(call.value)(dispatch.value));
    }
    return Option.orElse(call, () => dispatch);
  };

export const jobLocation = (job: NormalJob | ReusableJob): SymbolicLocation =>
  withKeys("jobs", job.id)(annotated("this job")(workflowLocation(job.workflow)));

export const jobLocationWithGrip = (job: NormalJob | ReusableJob): SymbolicLocation => {
  if (Option.isSome(job.model.name)) {
    return withKeys("name")(jobLocation(job));
  }
  return keyOnly(jobLocation(job));
};

export const jobsOf = (workflow: WorkflowInput): readonly Job[] =>
  pipe(
    workflow.model.jobs,
    Arr.filter(([, model]) => keepsRunning(model.if)),
    Arr.map(([id, model]): Job => {
      if (model.type === "normal") {
        return { type: "normal", job: { id, model, workflow } };
      }
      return { type: "reusable", job: { id, model, workflow } };
    }),
  );

export const normalJobsOf = (workflow: WorkflowInput): readonly NormalJob[] =>
  Arr.flatMap(jobsOf(workflow), (job) => {
    if (job.type === "normal") {
      return [job.job];
    }
    return [];
  });

export const effectivePermissions = (job: NormalJob | ReusableJob): Permissions => {
  if (job.model.permissions.type === "base" && job.model.permissions.base === "default") {
    return job.workflow.model.permissions;
  }
  return job.model.permissions;
};

export const hasIdToken = (job: NormalJob): boolean => {
  const permissions = effectivePermissions(job);
  if (permissions.type === "base") {
    return permissions.base === "write-all";
  }
  return permissions.permissions.get("id-token") === "write";
};

export const matrixOf = (job: NormalJob): Option.Option<MatrixView> =>
  pipe(
    job.model.strategy,
    Option.flatMap((strategy) => strategy.matrix),
    Option.map((matrix) =>
      matrixView(matrix)(
        pipe(jobLocation(job), withKeys("strategy", "matrix"), annotated("this matrix")),
      ),
    ),
  );

export const effectiveCacheMode = (
  job: NormalJob | ReusableJob,
): { readonly mode: string; readonly location: Option.Option<SymbolicLocation> } => {
  if (Option.isSome(job.model.cacheMode)) {
    return {
      mode: job.model.cacheMode.value,
      location: Option.some(withKeys("cache-mode")(jobLocation(job))),
    };
  }
  if (Option.isSome(job.workflow.model.cacheMode)) {
    return {
      mode: job.workflow.model.cacheMode.value,
      location: Option.some(withKeys("cache-mode")(workflowLocation(job.workflow))),
    };
  }
  const mode = Bool.match(isCacheWriteTrigger(job.workflow), {
    onTrue: () => "write",
    onFalse: () => "read",
  });
  return { mode, location: Option.none() };
};
