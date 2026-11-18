import { Option, pipe } from "effect";

import type { AuditContext, Produced, RepoView } from "#/features/audit-workflows/model/audit.ts";
import type { SymbolicLocation } from "#/features/audit-workflows/model/finding.ts";
import type { AuditInput, ReusableJob } from "#/features/audit-workflows/model/input.ts";
import type { StepView } from "#/features/audit-workflows/model/step.ts";

import { annotated, primary, withinText, withKeys } from "./location.ts";
import { repoLocation, repoLocationWithGrip } from "./pre-commit.ts";
import { urlRef, usesRef } from "./uses.ts";
import type { RepoRef } from "./uses.ts";
import { jobLocation, jobLocationWithGrip } from "./workflow.ts";

export type TargetKind = "step" | "reusable" | "repo";

export interface UsesTarget {
  readonly kind: TargetKind;
  readonly input: AuditInput;
  readonly ref: RepoRef;
  readonly raw: string;
  readonly repo: string;
  readonly location: SymbolicLocation;
  readonly grip: SymbolicLocation;
  readonly at: (annotation: string) => SymbolicLocation;
}

type Uses = ReusableJob["model"]["uses"];

export type Check = (target: UsesTarget, context: AuditContext) => Produced;

interface Written {
  readonly key: string;
  readonly text: string;
  readonly raw: string;
  readonly repo: string;
}

interface Place {
  readonly kind: TargetKind;
  readonly input: AuditInput;
  readonly location: SymbolicLocation;
  readonly grip: SymbolicLocation;
}

const targetOf =
  ({ kind, input, location, grip }: Place) =>
  ({ key, text, raw, repo }: Written, ref: RepoRef): UsesTarget => {
    const within = withinText(text);
    return {
      kind,
      input,
      ref,
      raw,
      repo,
      location,
      grip,
      at: (annotation) => pipe(location, withKeys(key), within, annotated(annotation), primary),
    };
  };

const usesTarget = (uses: Uses, place: Place): Option.Option<UsesTarget> => {
  if (uses.type !== "repository") {
    return Option.none();
  }
  const written = { key: "uses", text: uses.slug, raw: uses.raw, repo: uses.slug };
  return Option.some(targetOf(place)(written, usesRef(uses)));
};

const checked =
  (check: Check, context: AuditContext) =>
  (target: Option.Option<UsesTarget>): Produced =>
    Option.match(target, {
      onNone: (): Produced => [],
      onSome: (found) => check(found, context),
    });

export const stepTargetCheck =
  (check: Check) =>
  (view: StepView, context: AuditContext): Produced => {
    if (view.body.type !== "uses") {
      return [];
    }
    const place: Place = {
      kind: "step",
      input: view.input,
      location: view.location,
      grip: view.locationWithGrip,
    };
    return checked(check, context)(usesTarget(view.body.uses, place));
  };

export const reusableTargetCheck =
  (check: Check) =>
  (job: ReusableJob, context: AuditContext): Produced => {
    const place: Place = {
      kind: "reusable",
      input: job.workflow,
      location: jobLocation(job),
      grip: jobLocationWithGrip(job),
    };
    return checked(check, context)(usesTarget(job.model.uses, place));
  };

export const repoTargetCheck =
  (check: Check) =>
  (repo: RepoView, context: AuditContext): Produced => {
    const { model } = repo;
    if (model.type !== "remote") {
      return [];
    }
    const place: Place = {
      kind: "repo",
      input: repo.input,
      location: repoLocation(repo),
      grip: repoLocationWithGrip(repo),
    };
    const written = { key: "repo", text: model.url.href, raw: model.rev, repo: model.repo };
    return check(targetOf(place)(written, urlRef(model.url)(model.rev)), context);
  };
