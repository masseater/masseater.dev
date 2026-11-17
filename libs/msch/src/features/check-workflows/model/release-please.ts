import { Array as Arr, Effect, pipe } from "effect";

import type { Problem, RuleName } from "#/shared/lib/problem.ts";
import { RepositoryFiles } from "#/shared/lib/repository-files.ts";

import { scalarKeyOffsets, workflowCheck } from "./workflow-yaml.ts";

const RULE: RuleName = "release-please";
const RELEASE_PLEASE = /^googleapis\/release-please-action(?:@|$)/u;
const RELEASE_PLEASE_FILE = /(?:^|\/)(?:release-please-config|\.release-please-manifest)\.json$/u;
const FIRST = 1;
const MESSAGE =
  "releases with release-please. Releases are manual: bump the version in a PR, then run the publish workflow, which runs `msch-publish` for the workspace.";

const releasePleaseOffsetsOf = scalarKeyOffsets({
  name: "uses",
  matches: (value) => RELEASE_PLEASE.test(value),
});

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
