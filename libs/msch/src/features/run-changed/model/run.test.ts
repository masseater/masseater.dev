import { layer } from "@effect/vitest";
import { Effect, Layer, Option, Record as Rec } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles, nodeServicesLayer } from "#/shared/lib/repository-files.ts";
import {
  FixtureFiles,
  fixtureLayer,
  gitRepositoryWith,
} from "#/shared/lib/repository.test.support.ts";

import { runChanged } from "./run.ts";

const FILES = {
  ".gitignore": "node_modules\n",
  ".github/workflows/ci.yml": "name: ci\n",
  "README.md": "# fixture\n",
  "package.json": '{"name":"root","devDependencies":{"lint":"workspace:*"}}',
  "pnpm-workspace.yaml": "packages:\n  - apps/*\n  - libs/*\n",
  "vite.config.ts": "export default {};\n",
  "apps/README.md": "# apps\n",
  "apps/a/package.json": '{"name":"a","dependencies":{"shared":"workspace:*"}}',
  "apps/a/src/index.ts": "export const a = 1;\n",
  "apps/b/package.json": '{"name":"b","dependencies":{"dep":"1.0.0"}}',
  "apps/b/src/index.ts": "export const b = 1;\n",
  "libs/lint/package.json": '{"name":"lint"}',
  "libs/lint/src/index.ts": "export const lint = 1;\n",
  "libs/shared/package.json": '{"name":"shared"}',
  "libs/shared/src/index.ts": "export const shared = 1;\n",
};

const ROOT_PATHS =
  ".github .gitignore README.md apps/README.md package.json pnpm-workspace.yaml vite.config.ts";
const RECORD = String.raw`require("node:fs").appendFileSync(process.argv[1], process.argv.slice(2).join(" ") + "\n")`;
const RECORD_AND_FAIL = `${RECORD}; process.exit(1)`;
const EVERYTHING = "\n";
const PASSED = 0;
const FAILED = 1;

const installed = Effect.fn("installed")(function* installed(root: string, version: string) {
  const fixtures = yield* FixtureFiles;
  const files = yield* RepositoryFiles;
  const store = files.join(root, "node_modules", ".pnpm", `dep@${version}`, "node_modules", "dep");
  const link = files.join(root, "apps", "b", "node_modules", "dep");
  yield* fixtures.writeFile(files.join(store, "package.json"), '{"name":"dep"}');
  yield* files.removeFile(link);
  yield* fixtures.symlink(store, link);
});

const repository = Effect.gen(function* repository() {
  const fixtures = yield* FixtureFiles;
  const files = yield* RepositoryFiles;
  const root = yield* gitRepositoryWith(FILES);
  yield* fixtures.symlink(
    files.join(root, "libs", "shared"),
    files.join(root, "apps", "a", "node_modules", "shared"),
  );
  yield* fixtures.symlink(
    files.join(root, "libs", "lint"),
    files.join(root, "node_modules", "lint"),
  );
  yield* installed(root, "1.0.0");
  return root;
});

const runsOf = Effect.fn("runsOf")(function* runsOf(
  script: string,
  change: (root: string) => Effect.Effect<void, never, FixtureFiles | RepositoryFiles>,
) {
  const files = yield* RepositoryFiles;
  const root = yield* repository;
  const runs = files.join(root, "node_modules", ".runs");
  const codes = [
    yield* runChanged(root, ["node", "-e", script, runs]),
    yield* change(root).pipe(Effect.andThen(runChanged(root, ["node", "-e", script, runs]))),
  ];
  const recorded = yield* files.readFile(runs);
  return { codes, recorded: Option.getOrElse(recorded, () => "") };
});

const edited =
  (edits: Readonly<Record<string, string>>) =>
  (root: string): Effect.Effect<void, never, FixtureFiles | RepositoryFiles> =>
    Effect.gen(function* edit() {
      const fixtures = yield* FixtureFiles;
      const files = yield* RepositoryFiles;
      yield* Effect.forEach(
        Rec.toEntries(edits),
        ([file, source]) => fixtures.writeFile(files.join(root, file), source),
        { concurrency: 1, discard: true },
      );
    });

const skipsTheCommandWhenNothingChanged = Effect.gen(function* skipsTheCommandWhenNothingChanged() {
  const runs = yield* runsOf(RECORD, () => Effect.void);
  expect(runs).toStrictEqual({ codes: [PASSED, PASSED], recorded: EVERYTHING });
});

const passesTheChangedWorkspaceAndItsDependents = Effect.gen(
  function* passesTheChangedWorkspaceAndItsDependents() {
    const runs = yield* runsOf(
      RECORD,
      edited({ "libs/shared/src/index.ts": "export const shared = 2;\n" }),
    );
    expect(runs.recorded).toBe(`${EVERYTHING}apps/a libs/shared\n`);
  },
);

const passesTheRootPathsWhenAFileOutsideWorkspacesChanges = Effect.gen(
  function* passesTheRootPathsWhenAFileOutsideWorkspacesChanges() {
    const runs = yield* runsOf(RECORD, edited({ "apps/README.md": "# changed\n" }));
    expect(runs.recorded).toBe(`${EVERYTHING}${ROOT_PATHS}\n`);
  },
);

const runsEverythingWhenSharedConfigurationChanges = Effect.gen(
  function* runsEverythingWhenSharedConfigurationChanges() {
    const runs = yield* runsOf(RECORD, edited({ "vite.config.ts": "export default { a: 1 };\n" }));
    expect(runs.recorded).toBe(`${EVERYTHING}${EVERYTHING}`);
  },
);

const runsEverythingWhenAWorkspaceTheRootUsesChanges = Effect.gen(
  function* runsEverythingWhenAWorkspaceTheRootUsesChanges() {
    const runs = yield* runsOf(
      RECORD,
      edited({ "libs/lint/src/index.ts": "export const lint = 2;\n" }),
    );
    expect(runs.recorded).toBe(`${EVERYTHING}${EVERYTHING}`);
  },
);

const passesTheWorkspaceWhoseInstalledDependencyChanged = Effect.gen(
  function* passesTheWorkspaceWhoseInstalledDependencyChanged() {
    const runs = yield* runsOf(RECORD, (root) => installed(root, "2.0.0"));
    expect(runs.recorded).toBe(`${EVERYTHING}apps/b\n`);
  },
);

const runsAgainAfterAFailure = Effect.gen(function* runsAgainAfterAFailure() {
  const runs = yield* runsOf(RECORD_AND_FAIL, () => Effect.void);
  expect(runs).toStrictEqual({ codes: [FAILED, FAILED], recorded: `${EVERYTHING}${EVERYTHING}` });
});

layer(Layer.mergeAll(fixtureLayer, nodeServicesLayer))("msch-changed", (it) => {
  it.effect("skips the command when nothing changed", () => skipsTheCommandWhenNothingChanged);
  it.effect(
    "passes the workspace that changed and the workspaces that depend on it",
    () => passesTheChangedWorkspaceAndItsDependents,
  );
  it.effect(
    "passes the paths outside workspaces when one of them changes",
    () => passesTheRootPathsWhenAFileOutsideWorkspacesChanges,
  );
  it.effect(
    "runs everything when a shared configuration file changes",
    () => runsEverythingWhenSharedConfigurationChanges,
  );
  it.effect(
    "runs everything when a workspace the root depends on changes",
    () => runsEverythingWhenAWorkspaceTheRootUsesChanges,
  );
  it.effect(
    "passes the workspace whose installed dependency changed",
    () => passesTheWorkspaceWhoseInstalledDependencyChanged,
  );
  it.effect("runs again after the command failed", () => runsAgainAfterAFailure);
});
