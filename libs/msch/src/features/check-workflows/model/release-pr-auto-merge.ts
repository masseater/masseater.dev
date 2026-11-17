import { Array as Arr, Option, pipe } from "effect";
import { isMap, isScalar, isSeq } from "yaml";
import type { Pair } from "yaml";

import type { RuleName } from "#/shared/lib/problem.ts";

import { pairsNamed, workflowCheck } from "./workflow-yaml.ts";

const RULE: RuleName = "release-pr-auto-merge";
const RELEASE_PLEASE = /^googleapis\/release-please-action(?:@|$)/u;
const AUTO_MERGE = /\bgh\s+pr\s+merge\b[^\n]*--auto\b/u;
const MESSAGE =
  "opens a release PR with release-please but no later step in the job turns on its auto-merge. The merge queue only moves PRs with auto-merge, so the release PR falls behind main and waits for someone. Add a step after it that runs `gh pr merge --auto --squash` on the PR from the action's `pr` output with the token that opened it.";

interface Step {
  readonly opensReleasePr: boolean;
  readonly turnsOnAutoMerge: boolean;
  readonly offset: Option.Option<number>;
}

const pairOf = (node: unknown, name: string): Option.Option<Pair> =>
  pipe(
    Option.liftPredicate(node, isMap),
    Option.flatMap((map) =>
      Arr.findFirst(map.items, (item) => isScalar(item.key) && item.key.value === name),
    ),
  );

const textOf = (node: unknown, name: string): string =>
  pipe(
    pairOf(node, name),
    Option.flatMap(({ value }) => Option.liftPredicate(value, isScalar)),
    Option.map((scalar) => String(scalar.value)),
    Option.getOrElse(() => ""),
  );

const stepOf = (node: unknown): Step => {
  const inputs = Option.getOrUndefined(Option.map(pairOf(node, "with"), ({ value }) => value));
  return {
    opensReleasePr:
      RELEASE_PLEASE.test(textOf(node, "uses")) &&
      textOf(inputs, "skip-github-pull-request") !== "true",
    turnsOnAutoMerge: AUTO_MERGE.test(textOf(node, "run")),
    offset: pipe(
      pairOf(node, "uses"),
      Option.flatMap(({ key }) => Option.liftPredicate(key, isScalar)),
      Option.flatMap((key) => Option.fromNullishOr(key.range)),
      Option.map(([start]) => start),
    ),
  };
};

const stepsOf = (node: unknown): readonly Step[] =>
  pipe(
    Option.liftPredicate(node, isSeq),
    Option.map((seq) => pipe(seq.items, Arr.map(stepOf))),
    Option.getOrElse(() => []),
  );

const unqueuedOffsetsOf = (steps: readonly Step[]): readonly number[] =>
  pipe(
    steps,
    Arr.flatMap((step, index) =>
      pipe(
        step.offset,
        Option.filter(
          () =>
            step.opensReleasePr &&
            !Arr.some(Arr.drop(steps, index), (later) => later.turnsOnAutoMerge),
        ),
        Option.toArray,
      ),
    ),
  );

const releasePrOffsetsOf = (source: string): readonly number[] =>
  pipe(
    pairsNamed("steps")(source),
    Arr.flatMap(({ value }) => unqueuedOffsetsOf(stepsOf(value))),
  );

/** @internal */
export const checkReleasePrAutoMerge = workflowCheck({
  rule: RULE,
  message: MESSAGE,
  offsetsOf: releasePrOffsetsOf,
});
