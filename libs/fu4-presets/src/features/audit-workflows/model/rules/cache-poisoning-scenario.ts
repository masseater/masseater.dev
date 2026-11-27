import type { YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, String as Str, pipe } from "effect";

import { usageOf } from "#/features/audit-workflows/lib/coordinate.ts";
import { hasEvent } from "#/features/audit-workflows/lib/workflow.ts";
import type { NormalJob, WorkflowInput } from "#/features/audit-workflows/model/input.ts";
import type { StepView } from "#/features/audit-workflows/model/step.ts";
import { valueAt } from "#/shared/yaml/index.ts";

import type { ReleaseTrigger, Scenario } from "./cache-poisoning-control.ts";
import { PUBLISHERS } from "./cache-poisoning-coordinates.ts";

const TAG_KEYS = ["tags", "tags-ignore"];

const pushBody = (workflow: WorkflowInput): Option.Option<YamlNode> =>
  pipe(
    Option.fromNullishOr(workflow.model.on.events.get("push")),
    Option.flatMap((push) => {
      if (push.type === "body") {
        return Option.some(push.node);
      }
      return Option.none();
    }),
  );

const hasKey =
  (node: YamlNode) =>
  (key: string): boolean =>
    Option.isSome(valueAt(key)(node));

const hasTagFilter = (node: YamlNode): boolean => pipe(TAG_KEYS, Arr.some(hasKey(node)));

const isReleaseBranch = (branch: YamlNode): boolean =>
  pipe(Str.toLowerCase(branch.value), Str.includes("release"));

const hasReleaseBranch = (branches: YamlNode): boolean =>
  pipe(branches.children, Arr.some(isReleaseBranch));

const RELEASE_CHECKS: readonly (readonly [ReleaseTrigger, (workflow: WorkflowInput) => boolean])[] =
  [
    ["tag-push", (workflow): boolean => pipe(pushBody(workflow), Option.exists(hasTagFilter))],
    [
      "release-branch-push",
      (workflow): boolean =>
        pipe(
          pushBody(workflow),
          Option.flatMap(valueAt("branches")),
          Option.exists(hasReleaseBranch),
        ),
    ],
    ["release-event", (workflow): boolean => hasEvent(workflow)("release")],
  ];

const releaseTriggers = (workflow: WorkflowInput): readonly ReleaseTrigger[] =>
  pipe(
    RELEASE_CHECKS,
    Arr.filter(([, check]) => check(workflow)),
    Arr.map(([trigger]) => trigger),
  );

const isPublisher = (step: StepView): boolean =>
  pipe(
    PUBLISHERS,
    Arr.some((publisher) => Option.isSome(usageOf(publisher)(step))),
  );

export const scenarioOf =
  (job: NormalJob) =>
  (steps: readonly StepView[]): Option.Option<Scenario> => {
    const triggers = releaseTriggers(job.workflow);
    if (Arr.isReadonlyArrayNonEmpty(triggers)) {
      return Option.some({ type: "triggers", triggers });
    }
    return pipe(
      steps,
      Arr.findFirst(isPublisher),
      Option.map((publisher) => ({ type: "action", publisher })),
    );
  };
