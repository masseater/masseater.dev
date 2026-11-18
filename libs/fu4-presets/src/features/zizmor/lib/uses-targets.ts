import { Option, pipe } from "effect";

import type { Drafts, RepoView } from "#/features/zizmor/model/audit.ts";
import type { SymbolicLocation } from "#/features/zizmor/model/finding.ts";
import type { ReusableJob } from "#/features/zizmor/model/input.ts";
import type { StepView } from "#/features/zizmor/model/step.ts";

import { annotated, primary, withinText, withKeys } from "./location.ts";
import { repoLocation, repoLocationWithGrip } from "./pre-commit.ts";
import { urlRef, usesRef } from "./uses.ts";
import type { RepoRef } from "./uses.ts";
import { jobLocation, jobLocationWithGrip } from "./workflow.ts";

export interface UsesTarget {
  readonly ref: RepoRef;
  readonly grip: SymbolicLocation;
  readonly at: (annotation: string) => SymbolicLocation;
}

type Uses = ReusableJob["model"]["uses"];

type Check = (target: UsesTarget) => Drafts;

const targetOf =
  (location: SymbolicLocation, grip: SymbolicLocation) =>
  (key: string, text: string, ref: RepoRef): UsesTarget => {
    const within = withinText(text);
    return {
      ref,
      grip,
      at: (annotation) => pipe(location, withKeys(key), within, annotated(annotation), primary),
    };
  };

const usesTarget = (
  uses: Uses,
  location: SymbolicLocation,
  grip: SymbolicLocation,
): Option.Option<UsesTarget> => {
  if (uses.type !== "repository") {
    return Option.none();
  }
  return Option.some(targetOf(location, grip)("uses", uses.slug, usesRef(uses)));
};

const checked =
  (check: Check) =>
  (target: Option.Option<UsesTarget>): Drafts =>
    Option.match(target, { onNone: () => [], onSome: check });

export const stepTargetCheck =
  (check: Check) =>
  (view: StepView): Drafts => {
    if (view.body.type !== "uses") {
      return [];
    }
    return checked(check)(usesTarget(view.body.uses, view.location, view.locationWithGrip));
  };

export const reusableTargetCheck =
  (check: Check) =>
  (job: ReusableJob): Drafts =>
    checked(check)(usesTarget(job.model.uses, jobLocation(job), jobLocationWithGrip(job)));

export const repoTargetCheck =
  (check: Check) =>
  (repo: RepoView): Drafts => {
    const { model } = repo;
    if (model.type !== "remote") {
      return [];
    }
    const target = targetOf(repoLocation(repo), repoLocationWithGrip(repo));
    return check(target("repo", model.url.href, urlRef(model.url)(model.rev)));
  };
