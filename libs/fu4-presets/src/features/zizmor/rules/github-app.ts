import { Array as Arr, Option, String as Str, pipe } from "effect";

import {
  at,
  atPath,
  confidence,
  finding,
  persona,
  severity,
  tip,
} from "#/features/zizmor/lib/finding.ts";
import { annotated, primary, withinText, withKeys } from "#/features/zizmor/lib/location.ts";
import { usesMatches } from "#/features/zizmor/lib/uses.ts";
import type { Audit, Drafts } from "#/features/zizmor/model/audit.ts";
import type { EnvValue } from "#/features/zizmor/model/common.ts";
import type {
  Confidence,
  FindingDraft,
  SymbolicLocation,
} from "#/features/zizmor/model/finding.ts";
import type { StepView } from "#/features/zizmor/model/step.ts";

import { revocation } from "./github-app-revocation.ts";

const meta = { ident: "github-app", desc: "dangerous use of GitHub App tokens" } as const;

const ORG_ONLY = new Set([
  "permission-custom-properties-for-organizations",
  "permission-enterprise-custom-properties-for-organizations",
  "permission-members",
  "permission-organization-administration",
  "permission-organization-announcement-banners",
  "permission-organization-copilot-seat-management",
  "permission-organization-custom-org-roles",
  "permission-organization-custom-properties",
  "permission-organization-custom-roles",
  "permission-organization-events",
  "permission-organization-hooks",
  "permission-organization-packages",
  "permission-organization-personal-access-token-requests",
  "permission-organization-personal-access-tokens",
  "permission-organization-plan",
  "permission-organization-projects",
  "permission-organization-secrets",
  "permission-organization-self-hosted-runners",
  "permission-organization-user-blocking",
]);

const isCreateToken = usesMatches("actions/create-github-app-token");

const base = (level: Confidence): FindingDraft =>
  pipe(finding(meta), confidence(level), severity("high"), persona("regular"));

interface TokenStep {
  readonly view: StepView;
  readonly inputs: ReadonlyMap<string, EnvValue>;
  readonly requested: (annotation: string) => SymbolicLocation;
  readonly permissions: readonly string[];
}

const revokedFindings = ({ view, inputs, requested }: TokenStep): Drafts =>
  pipe(
    Option.fromNullishOr(inputs.get("skip-token-revoke")),
    Option.flatMap(revocation),
    Option.map(([level, annotation]) =>
      pipe(
        base(level),
        at(requested("app token requested here")),
        atPath(
          view.location,
          withKeys("with", "skip-token-revoke"),
          annotated(annotation),
          primary,
        ),
      ),
    ),
    Option.toArray,
  );

const isOrgOnly = (permissions: readonly string[]): boolean =>
  Arr.isReadonlyArrayNonEmpty(permissions) &&
  pipe(
    permissions,
    Arr.every((each) => ORG_ONLY.has(each)),
  );

const ownerFindings = ({ view, inputs, requested, permissions }: TokenStep): Drafts => {
  if (!inputs.has("owner") || inputs.has("repositories") || isOrgOnly(permissions)) {
    return [];
  }
  return [
    pipe(
      base("high"),
      at(requested("app token requested here")),
      atPath(
        view.location,
        withKeys("with", "owner"),
        annotated("token granted access to all repositories for this owner's app installation"),
        primary,
      ),
      tip("use `repositories: 'repo1,repo2'` to scope the token to specific repositories"),
    ),
  ];
};

const blanketFindings = ({ requested, permissions }: TokenStep): Drafts => {
  if (Arr.isReadonlyArrayNonEmpty(permissions)) {
    return [];
  }
  return [
    pipe(
      base("high"),
      at(requested("app token inherits blanket installation permissions")),
      tip("specify at least one `permission-<name>` input to limit the token's permissions"),
    ),
  ];
};

const permissionInputs = (inputs: ReadonlyMap<string, EnvValue>): readonly string[] =>
  pipe(Arr.fromIterable(inputs.keys()), Arr.filter(Str.startsWith("permission-")));

const tokenStepOf = (view: StepView): Option.Option<TokenStep> => {
  const { body } = view;
  if (
    body.type !== "uses" ||
    body.uses.type !== "repository" ||
    !isCreateToken(body.uses) ||
    body.with.type !== "literal"
  ) {
    return Option.none();
  }
  const usesAt = withinText(body.uses.raw)(withKeys("uses")(view.location));
  const inputs = body.with.value;
  return Option.some({
    view,
    inputs,
    requested: (annotation) => annotated(annotation)(usesAt),
    permissions: permissionInputs(inputs),
  });
};

const step = (view: StepView): Drafts =>
  Option.match(tokenStepOf(view), {
    onNone: () => [],
    onSome: (token) => [
      ...revokedFindings(token),
      ...ownerFindings(token),
      ...blanketFindings(token),
    ],
  });

export const githubApp: Audit = { ...meta, step, compositeStep: step };
