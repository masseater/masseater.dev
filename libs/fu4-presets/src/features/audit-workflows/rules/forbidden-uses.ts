import { Array as Arr, Option, pipe } from "effect";

import {
  atPath,
  confidence,
  finding,
  persona,
  severity,
} from "#/features/audit-workflows/lib/finding.ts";
import {
  annotated,
  primary,
  withinText,
  withKeys,
} from "#/features/audit-workflows/lib/location.ts";
import { repoLocation } from "#/features/audit-workflows/lib/pre-commit.ts";
import { patternMatches, urlRef, usesRef } from "#/features/audit-workflows/lib/uses.ts";
import type { RepoRef } from "#/features/audit-workflows/lib/uses.ts";
import type { Audit, AuditContext, Drafts } from "#/features/audit-workflows/model/audit.ts";
import type { StepView } from "#/features/audit-workflows/model/step.ts";

const meta = { ident: "forbidden-uses", desc: "forbidden action or repository used" } as const;

const denied = (context: AuditContext, ref: RepoRef): Option.Option<boolean> =>
  pipe(
    context.config.forbiddenUses,
    Option.map((config) => {
      const matched = pipe(
        config.patterns,
        Arr.some((pattern) => patternMatches(pattern)(ref)),
      );
      if (config.type === "allow") {
        return !matched;
      }
      return matched;
    }),
  );

const step = (view: StepView, context: AuditContext): Drafts => {
  const { body } = view;
  if (
    body.type !== "uses" ||
    body.uses.type !== "repository" ||
    !Option.contains(denied(context, usesRef(body.uses)), true)
  ) {
    return [];
  }
  return [
    pipe(
      finding(meta),
      confidence("high"),
      severity("high"),
      persona("regular"),
      atPath(
        view.location,
        primary,
        withKeys("uses"),
        withinText(body.uses.raw),
        annotated("use of this action is forbidden"),
      ),
    ),
  ];
};

export const forbiddenUses: Audit = {
  ...meta,
  step,
  compositeStep: step,
  preCommitRepo: (repo, context) => {
    const { model } = repo;
    if (
      model.type !== "remote" ||
      !Option.contains(denied(context, urlRef(model.url)(model.rev)), true)
    ) {
      return [];
    }
    return [
      pipe(
        finding(meta),
        confidence("high"),
        severity("high"),
        persona("regular"),
        atPath(
          repoLocation(repo),
          withKeys("repo"),
          withinText(model.url.href),
          annotated("use of this repository is forbidden"),
          primary,
        ),
      ),
    ];
  },
};
