import { Array as Arr, Effect, Option, pipe } from "effect";

import { atPath, confidence, finding, severity } from "#/features/audit-workflows/lib/finding.ts";
import { longestTag, lookupRef } from "#/features/audit-workflows/lib/github-refs.ts";
import { annotated, primary, withKeys, withUrl } from "#/features/audit-workflows/lib/location.ts";
import { withGitHub } from "#/features/audit-workflows/lib/online.ts";
import { stepTargetCheck } from "#/features/audit-workflows/lib/uses-targets.ts";
import type { UsesTarget } from "#/features/audit-workflows/lib/uses-targets.ts";
import { commitRef, refSlug, symbolicRef } from "#/features/audit-workflows/lib/uses.ts";
import type {
  Audit,
  AuditContext,
  Drafts,
  Produced,
} from "#/features/audit-workflows/model/audit.ts";
import type { Severity } from "#/features/audit-workflows/model/finding.ts";
import type {
  Advisory,
  GitHubClient,
  GitHubEffect,
} from "#/features/audit-workflows/model/github.ts";

const meta = {
  ident: "known-vulnerable-actions",
  desc: "action has a known vulnerability",
} as const;

const severityOf = (advisory: Advisory): Severity => {
  if (advisory.severity === "low") {
    return "low";
  }
  if (advisory.severity === "medium") {
    return "medium";
  }
  return "high";
};

const symbolicVersion =
  (client: GitHubClient, target: UsesTarget, slug: string) =>
  (name: string): GitHubEffect<Option.Option<string>> =>
    Effect.flatMap(
      lookupRef(client)(slug)(name),
      Option.match({
        onNone: () => Effect.succeedNone,
        onSome: (found) =>
          Effect.map(longestTag(client)(target.ref)(found.commit), (tag) =>
            Option.some(Option.match(tag, { onNone: () => name, onSome: (each) => each.name })),
          ),
      }),
    );

const versionOf =
  (client: GitHubClient, target: UsesTarget) =>
  (slug: string): GitHubEffect<Option.Option<string>> =>
    Option.match(symbolicRef(target.ref), {
      onSome: symbolicVersion(client, target, slug),
      onNone: () =>
        Option.match(commitRef(target.ref), {
          onNone: () => Effect.succeedNone,
          onSome: (commit) =>
            Effect.map(
              longestTag(client)(target.ref)(commit),
              Option.map((tag) => tag.name),
            ),
        }),
    });

const draftOf =
  (target: UsesTarget) =>
  (advisory: Advisory): Drafts => [
    pipe(
      finding(meta),
      confidence("high"),
      severity(severityOf(advisory)),
      atPath(
        target.location,
        primary,
        withKeys("uses"),
        withUrl(`https://github.com/advisories/${advisory.id}`),
        annotated(advisory.id),
      ),
    ),
  ];

const findings =
  (client: GitHubClient, target: UsesTarget, context: AuditContext) =>
  (slug: string): GitHubEffect<Drafts> =>
    Effect.flatMap(
      versionOf(client, target)(slug),
      Option.match({
        onNone: () => Effect.succeed<Drafts>([]),
        onSome: (version) =>
          Effect.map(client.advisories(slug)(version), (advisories) =>
            pipe(
              advisories,
              Arr.filter((advisory) => !context.config.knownVulnerableAllow.has(advisory.id)),
              Arr.flatMap(draftOf(target)),
            ),
          ),
      }),
    );

const check = (target: UsesTarget, context: AuditContext): Produced =>
  Option.match(refSlug(target.ref), {
    onNone: (): Produced => [],
    onSome: (slug) => withGitHub(context)((client) => findings(client, target, context)(slug.full)),
  });

const step = stepTargetCheck(check);

export const knownVulnerableActions: Audit = {
  ...meta,
  step,
  compositeStep: step,
};
