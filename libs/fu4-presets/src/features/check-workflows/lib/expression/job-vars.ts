import type { Project } from "@r_masseater/fu4";
import { Option, pipe } from "effect";

import { strict } from "#/entities/expression/index.ts";
import type { Job } from "#/entities/workflow/index.ts";

import type { ExprEnv, Vars } from "./env.ts";
import { matrixType } from "./matrix-type.ts";
import { needsType } from "./outputs.ts";
import type { JobInfo } from "./outputs.ts";

export interface Scope {
  readonly env: ExprEnv;
  readonly project: Project;
}

export type JobVars = Pick<Vars, "matrix" | "needs" | "steps">;

export const jobVars =
  (scope: Scope) =>
  (job: Job, infos: Readonly<Record<string, JobInfo>>): JobVars => {
    const needs = Option.some(needsType(scope.env)(scope.project)(job, infos));
    const env: ExprEnv = { ...scope.env, vars: () => ({ ...scope.env.vars(), needs }) };
    const matrix = pipe(
      Option.fromNullishOr(job.strategy),
      Option.flatMap((strategy) => Option.fromNullishOr(strategy.matrix)),
      Option.map(matrixType(env)),
    );
    return { needs, matrix, steps: Option.some(strict()) };
  };
