import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Option, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { FixtureFiles, directoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { writeLockedClosures } from "./locked-closure-files.ts";

const LOCK_FILE = "pnpm-lock.yaml";
const APP_CLOSURE = "libs/app/node_modules/.cache/msch/locked-inputs.lock";
const OTHER_CLOSURE = "libs/other/node_modules/.cache/msch/locked-inputs.lock";
const ROOT_CLOSURE = "node_modules/.cache/msch/locked-inputs.lock";

interface Versions {
  readonly leaf: string;
  readonly right: string;
}

const BASE: Versions = { leaf: "1.0.0", right: "1.0.0" };

const LEAF = "{leaf}";
const RIGHT = "{right}";
const CLOSURE_LINE = "\n";
const MISSING = "missing";

const LOCKFILE = `lockfileVersion: '9.0'

settings:
  autoInstallPeers: true
  excludeLinksFromLockfile: false

importers:

  .:
    devDependencies:
      tool:
        specifier: 1.0.0
        version: 1.0.0

  libs/app:
    dependencies:
      '@fixture/shared':
        specifier: workspace:*
        version: link:../shared
      left:
        specifier: 1.0.0
        version: 1.0.0
    devDependencies:
      tester:
        specifier: 1.0.0
        version: 1.0.0

  libs/other:
    dependencies:
      right:
        specifier: {right}
        version: {right}

  libs/shared:
    dependencies:
      deep:
        specifier: 1.0.0
        version: 1.0.0
    devDependencies:
      builder:
        specifier: 1.0.0
        version: 1.0.0

packages:

  builder@1.0.0:
    resolution: {integrity: sha512-builder}

  deep@1.0.0:
    resolution: {integrity: sha512-deep}

  leaf@{leaf}:
    resolution: {integrity: sha512-leaf}

  left@1.0.0:
    resolution: {integrity: sha512-left}

  right@{right}:
    resolution: {integrity: sha512-right}

  tester@1.0.0:
    resolution: {integrity: sha512-tester}

  tool@1.0.0:
    resolution: {integrity: sha512-tool}

snapshots:

  builder@1.0.0: {}

  deep@1.0.0: {}

  leaf@{leaf}: {}

  left@1.0.0:
    dependencies:
      leaf: {leaf}

  right@{right}: {}

  tester@1.0.0: {}

  tool@1.0.0: {}
`;

const lockfileWith = ({ leaf, right }: Versions): string =>
  pipe(LOCKFILE, Str.replaceAll(LEAF, leaf), Str.replaceAll(RIGHT, right));

const closureOf = (leaf: string): string =>
  Arr.join(["deep@1.0.0", `leaf@${leaf}`, "left@1.0.0", "tester@1.0.0"], CLOSURE_LINE);

const closureIn = Effect.fn("closureIn")(function* closureIn(root: string, file: string) {
  const files = yield* RepositoryFiles;
  const text = yield* files.readFile(files.join(root, file));
  return Option.getOrElse(text, () => MISSING);
});

const relock = Effect.fn("relock")(function* relock(root: string, versions: Versions) {
  const fixtures = yield* FixtureFiles;
  const files = yield* RepositoryFiles;
  yield* fixtures.writeFile(files.join(root, LOCK_FILE), lockfileWith(versions));
});

const writesWhatEachWorkspaceCanLoad = Effect.gen(function* writesWhatEachWorkspaceCanLoad() {
  const root = yield* directoryWith({ [LOCK_FILE]: lockfileWith(BASE) });
  yield* writeLockedClosures(root);
  const app = yield* closureIn(root, APP_CLOSURE);
  const other = yield* closureIn(root, OTHER_CLOSURE);
  const workspace = yield* closureIn(root, ROOT_CLOSURE);
  expect(app).toBe(closureOf(BASE.leaf));
  expect(other).toBe("right@1.0.0");
  expect(workspace).toBe("tool@1.0.0");
});

const keepsTheClosureWhenAnotherWorkspaceMoves = Effect.gen(
  function* keepsTheClosureWhenAnotherWorkspaceMoves() {
    const root = yield* directoryWith({ [LOCK_FILE]: lockfileWith(BASE) });
    yield* writeLockedClosures(root);
    yield* relock(root, { ...BASE, right: "2.0.0" });
    yield* writeLockedClosures(root);
    const app = yield* closureIn(root, APP_CLOSURE);
    const other = yield* closureIn(root, OTHER_CLOSURE);
    expect(app).toBe(closureOf(BASE.leaf));
    expect(other).toBe("right@2.0.0");
  },
);

const changesTheClosureWhenAnIndirectDependencyMoves = Effect.gen(
  function* changesTheClosureWhenAnIndirectDependencyMoves() {
    const root = yield* directoryWith({ [LOCK_FILE]: lockfileWith(BASE) });
    yield* writeLockedClosures(root);
    yield* relock(root, { ...BASE, leaf: "1.0.1" });
    yield* writeLockedClosures(root);
    const closure = yield* closureIn(root, APP_CLOSURE);
    expect(closure).toBe(closureOf("1.0.1"));
  },
);

const writesAgainWhenAClosureIsGone = Effect.gen(function* writesAgainWhenAClosureIsGone() {
  const files = yield* RepositoryFiles;
  const root = yield* directoryWith({ [LOCK_FILE]: lockfileWith(BASE) });
  yield* writeLockedClosures(root);
  yield* files.removeFile(files.join(root, APP_CLOSURE));
  yield* writeLockedClosures(root);
  const closure = yield* closureIn(root, APP_CLOSURE);
  expect(closure).toBe(closureOf(BASE.leaf));
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
