import { layer } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { directoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import {
  APP_CLOSURE,
  OTHER_CLOSURE,
  ROOT_CLOSURE,
  BASE,
  MISSING,
  WORKSPACE,
  closureOf,
  packagesIn,
  manifestsIn,
  closureIn,
  relock,
} from "./locked-closure-files.test.support.ts";
import { writeLockedClosures } from "./locked-closure-files.ts";

const writesWhatEachWorkspaceCanLoad = Effect.gen(function* writesWhatEachWorkspaceCanLoad() {
  const root = yield* directoryWith(WORKSPACE);
  yield* writeLockedClosures(root);
  const app = yield* closureIn(root, APP_CLOSURE);
  const other = yield* closureIn(root, OTHER_CLOSURE);
  const workspace = yield* closureIn(root, ROOT_CLOSURE);
  expect(packagesIn(app)).toBe(closureOf(BASE.leaf));
  expect(manifestsIn(app)).toStrictEqual([
    "manifest:libs/app",
    "manifest:libs/shared",
    "manifest:libs/tooling",
  ]);
  expect(packagesIn(other)).toBe("right@1.0.0");
  expect(packagesIn(workspace)).toBe("tool@1.0.0");
});

const keepsTheClosureWhenAnotherWorkspaceMoves = Effect.gen(
  function* keepsTheClosureWhenAnotherWorkspaceMoves() {
    const root = yield* directoryWith(WORKSPACE);
    yield* writeLockedClosures(root);
    yield* relock(root, { ...BASE, right: "2.0.0" });
    yield* writeLockedClosures(root);
    const app = yield* closureIn(root, APP_CLOSURE);
    const other = yield* closureIn(root, OTHER_CLOSURE);
    expect(packagesIn(app)).toBe(closureOf(BASE.leaf));
    expect(packagesIn(other)).toBe("right@2.0.0");
  },
);

const changesTheClosureWhenAnIndirectDependencyMoves = Effect.gen(
  function* changesTheClosureWhenAnIndirectDependencyMoves() {
    const root = yield* directoryWith(WORKSPACE);
    yield* writeLockedClosures(root);
    yield* relock(root, { ...BASE, leaf: "1.0.1" });
    yield* writeLockedClosures(root);
    const closure = yield* closureIn(root, APP_CLOSURE);
    expect(packagesIn(closure)).toBe(closureOf("1.0.1"));
  },
);

const writesAgainWhenAClosureIsGone = Effect.gen(function* writesAgainWhenAClosureIsGone() {
  const files = yield* RepositoryFiles;
  const root = yield* directoryWith(WORKSPACE);
  yield* writeLockedClosures(root);
  yield* files.removeFile(files.join(root, APP_CLOSURE));
  yield* writeLockedClosures(root);
  const closure = yield* closureIn(root, APP_CLOSURE);
  expect(packagesIn(closure)).toBe(closureOf(BASE.leaf));
});

const writesNothingWithoutALockfile = Effect.gen(function* writesNothingWithoutALockfile() {
  const root = yield* directoryWith({ "package.json": "{}" });
  yield* writeLockedClosures(root);
  const closure = yield* closureIn(root, ROOT_CLOSURE);
  expect(closure).toBe(MISSING);
});

layer(fixtureLayer)("writeLockedClosures", (it) => {
  it.effect(
    "writes what each workspace can load next to that workspace",
    () => writesWhatEachWorkspaceCanLoad,
  );
  it.effect(
    "keeps the closure when only another workspace's dependency moves",
    () => keepsTheClosureWhenAnotherWorkspaceMoves,
  );
  it.effect(
    "changes the closure when an indirect dependency moves",
    () => changesTheClosureWhenAnIndirectDependencyMoves,
  );
  it.effect(
    "writes a closure again when its file is gone and the lockfile is the same",
    () => writesAgainWhenAClosureIsGone,
  );
  it.effect("writes nothing when there is no lockfile", () => writesNothingWithoutALockfile);
});
