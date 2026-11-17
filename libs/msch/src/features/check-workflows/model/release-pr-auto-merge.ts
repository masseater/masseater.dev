import { Array as Arr, Option, pipe } from "effect";
import { isMap, isScalar, isSeq } from "yaml";
import type { YAMLMap } from "yaml";

import type { RuleName } from "#/shared/lib/problem.ts";

import { pairsNamed, workflowCheck } from "./workflow-yaml.ts";

const RULE: RuleName = "release-pr-auto-merge";
const RELEASE_PLEASE = /^googleapis\/release-please-action(?:@|$)/u;
const AUTO_MERGE = /\bgh\s+pr\s+merge\b[^\n]*--auto\b/u;
const MESSAGE =
  "opens a release PR with release-please but no later step in the job turns on its auto-merge. The merge queue only moves PRs with auto-merge, so the release PR falls behind main and waits for someone. Add a step after it that runs `gh pr merge --auto --squash` on the PR from the action's `pr` output with the token that opened it.";

const scalarOf = (map: YAMLMap, name: string): Option.Option<unknown> =>
  pipe(
    Arr.findFirst(map.items, (item) => isScalar(item.key) && item.key.value === name),
    Option.flatMap(({ value }) => Option.liftPredicate(value, isScalar)),
    Option.map((scalar) => scalar.value),
  );

const opensReleasePr = (step: YAMLMap): boolean =>
  pipe(
    scalarOf(step, "uses"),
    Option.exists((uses) => typeof uses === "string" && RELEASE_PLEASE.test(uses)),
  ) &&
  !pipe(
    Arr.findFirst(step.items, (item) => isScalar(item.key) && item.key.value === "with"),
    Option.flatMap(({ value }) => Option.liftPredicate(value, isMap)),
    Option.flatMap((inputs) => scalarOf(inputs, "skip-github-pull-request")),
    Option.exists((skip) => String(skip) === "true"),
  );

const turnsOnAutoMerge = (step: YAMLMap): boolean =>
  pipe(
    scalarOf(step, "run"),
    Option.exists((run) => typeof run === "string" && AUTO_MERGE.test(run)),
  );

const usesOffsetOf = (step: YAMLMap): Option.Option<number> =>
  pipe(
    Arr.findFirst(step.items, (item) => isScalar(item.key) && item.key.value === "uses"),
    Option.flatMap(({ key }) => Option.liftPredicate(key, isScalar)),
    Option.flatMap((key) => Option.fromNullishOr(key.range)),
    Option.map(([start]) => start),
  );

const releasePrOffsetsOf = (source: string): readonly number[] =>
  pipe(
    pairsNamed("steps")(source),
    Arr.flatMap(({ value }) => (isSeq(value) ? [Arr.filter(value.items, isMap)] : [])),
    Arr.flatMap((steps) =>
      pipe(
        steps,
        Arr.flatMap((step, index) =>
          opensReleasePr(step) && !Arr.some(Arr.drop(steps, index + 1), turnsOnAutoMerge)
            ? Option.toArray(usesOffsetOf(step))
            : [],
        ),
      ),
    ),
  );

/** @internal */
export const checkReleasePrAutoMerge = workflowCheck({
  rule: RULE,
  message: MESSAGE,
  offsetsOf: releasePrOffsetsOf,
});
