import { layer as fixtureLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { assertFalse, assertTrue, deepStrictEqual } from "@effect/vitest/utils";
import { Effect, Exit } from "effect";

import { failedChecksOf, repositoryWith, run } from "./vpa.test.support.ts";

const checksOnlyCommitsAfterTheDefaultBranch = Effect.gen(
  function* checksOnlyCommitsAfterTheDefaultBranch() {
    const root = yield* repositoryWith({
      commits: ["feat: second"],
      base: "no type",
      remoteRefs: [
        ["update-ref", "refs/remotes/origin/trunk", "HEAD"],
        ["symbolic-ref", "refs/remotes/origin/HEAD", "refs/remotes/origin/trunk"],
      ],
    });
    const { exit } = yield* run(root, []);
    assertTrue(Exit.isSuccess(exit));
  },
);

const checksTheWholeHistoryWithoutARemote = Effect.gen(
  function* checksTheWholeHistoryWithoutARemote() {
    const root = yield* repositoryWith({
      commits: ["feat: second"],
      base: "no type",
      remoteRefs: [],
    });
    const { exit, output } = yield* run(root, []);
    assertFalse(Exit.isSuccess(exit));
    deepStrictEqual(failedChecksOf(output), ["✗ commitlint"]);
  },
);

layer(fixtureLayer)("commit range", (it) => {
  it.effect(
    "checks the commits after the remote's default branch, whatever its name",
    () => checksOnlyCommitsAfterTheDefaultBranch,
  );
  it.effect(
    "checks the whole history when there is no remote branch",
    () => checksTheWholeHistoryWithoutARemote,
  );
});
