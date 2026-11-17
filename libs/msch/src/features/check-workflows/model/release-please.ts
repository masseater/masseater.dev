import { Array as Arr, Effect, Option, pipe } from "effect";
import { isScalar } from "yaml";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { pairsNamed, workflowCheck } from "./workflow-yaml.ts";

const RULE: RuleName = "release-please";
const RELEASE_PLEASE = /^googleapis\/release-please-action(?:@|$)/u;
const RELEASE_PLEASE_FILE = /(?:^|\/)(?:release-please-config|\.release-please-manifest)\.json$/u;
const FIRST = 1;
const MESSAGE =
  "releases with release-please. Releases are manual: bump the version in a PR, then run the publish workflow, which runs `msch-publish` for the workspace.";

const releasePleaseOffsetsOf = (source: string): readonly number[] =>
  pipe(
    pairsNamed("uses")(source),
    Arr.filter(({ value }) => isScalar(value) && RELEASE_PLEASE.test(String(value.value))),
    Arr.flatMap(({ key }) =>
      pipe(
        Option.liftPredicate(key, isScalar),
        Option.flatMap((scalar) => Option.fromNullishOr(scalar.range)),
        Option.map(([start]) => start),
        Option.toArray,
      ),
    ),
  );

const checkReleasePleaseSteps = workflowCheck({
  rule: RULE,
  message: MESSAGE,
  offsetsOf: releasePleaseOffsetsOf,
});

const checkReleasePleaseFiles = Effect.fn("checkReleasePleaseFiles")(
  function* checkReleasePleaseFiles(root: string) {
    const files = yield* RepositoryFiles;
    const names = yield* files.listedFiles(root);
    return pipe(
      names,
      Arr.filter((name) => RELEASE_PLEASE_FILE.test(name)),
      Arr.map((name): Problem => ({
        file: files.join(root, name),
        line: FIRST,
        column: FIRST,
        rule: RULE,
        message: MESSAGE,
      })),
    );
  },
);

/** @internal */
export const checkReleasePlease = Effect.fn("checkReleasePlease")(function* checkReleasePlease(
  root: string,
) {
  const found = yield* Effect.all([checkReleasePleaseSteps(root), checkReleasePleaseFiles(root)], {
    concurrency: "unbounded",
  });
  return Arr.flatten(found);
});
