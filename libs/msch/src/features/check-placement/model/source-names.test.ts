import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkSourceNames } from "./source-names.ts";

const WORKSPACE = "packages:\n  - apps/*\n";
const MODULE = "export const value = 1;\n";

const locationsIn = Effect.fn("locationsIn")(function* locationsIn(
  contents: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith({ "pnpm-workspace.yaml": WORKSPACE, ...contents });
  const files = yield* RepositoryFiles;
  const problems = yield* checkSourceNames(root);
  const locations = pipe(
    problems,
    Arr.map(({ file, rule }) => `${rule} ${files.relative(root, file)}`),
  );
  return Arr.sort(locations, Str.Order);
});

const reportsNounSlices = Effect.gen(function* reportsNounSlices() {
  const found = yield* locationsIn({
    "apps/site/package.json": `{ "name": "site" }`,
    "apps/site/src/features/search/index.ts": MODULE,
    "apps/site/src/features/search/model/query.ts": MODULE,
    "apps/site/src/features/workspace-settings/index.ts": MODULE,
    "apps/site/src/features/banned-tools/index.ts": MODULE,
  });
  expect(found).toStrictEqual([
    "feature-slice-name apps/site/src/features/banned-tools",
    "feature-slice-name apps/site/src/features/search",
    "feature-slice-name apps/site/src/features/workspace-settings",
  ]);
});

const acceptsVerbObjectSlices = Effect.gen(function* acceptsVerbObjectSlices() {
  const found = yield* locationsIn({
    "apps/site/package.json": `{ "name": "site" }`,
    "apps/site/src/features/sync-manuscripts/index.ts": MODULE,
    "apps/site/src/features/hold-to-mark/index.ts": MODULE,
    "apps/site/src/entities/search/index.ts": MODULE,
    "apps/site/src/pages/library/index.ts": MODULE,
  });
  expect(found).toStrictEqual([]);
});

const reportsDeployNames = Effect.gen(function* reportsDeployNames() {
  const found = yield* locationsIn({
    "apps/site/package.json": `{ "name": "site" }`,
    "apps/site/src/app/tail.worker.ts": MODULE,
    "apps/site/src/app/slides-entrypoint.ts": MODULE,
    "apps/site/src/app/entrypoint/main.ts": MODULE,
    "apps/site/src/pages/team/ui/house-worker.tsx": MODULE,
    "apps/site/src/app/tail.ts": MODULE,
  });
  expect(found).toStrictEqual([
    "deploy-entry-name apps/site/src/app/entrypoint",
    "deploy-entry-name apps/site/src/app/slides-entrypoint.ts",
    "deploy-entry-name apps/site/src/app/tail.worker.ts",
  ]);
});

const reportsSegmentFolders = Effect.gen(function* reportsSegmentFolders() {
  const found = yield* locationsIn({
    "apps/site/package.json": `{ "name": "site" }`,
    "apps/site/src/features/sync-manuscripts/index.ts": MODULE,
    "apps/site/src/features/sync-manuscripts/rules/first.ts": MODULE,
    "apps/site/src/features/sync-manuscripts/rules/second.ts": MODULE,
    "apps/site/src/entities/manuscript/index.ts": MODULE,
    "apps/site/src/entities/manuscript/catalog/deep/entry.ts": MODULE,
    "apps/site/src/entities/manuscript/model/shape.ts": MODULE,
    "apps/site/src/entities/manuscript/lib/format/dates.ts": MODULE,
    "apps/site/src/entities/manuscript/@x/library.ts": MODULE,
    "apps/site/src/entities/manuscript/data/entries.json": "{}",
    "apps/site/src/features/check-code/check-first/model/first.ts": MODULE,
    "apps/site/src/features/check-code/check-first/index.ts": MODULE,
    "apps/site/src/features/check-code/check-first/finders/first.ts": MODULE,
    "apps/site/src/features/check-code/finders/first.ts": MODULE,
    "apps/site/src/shared/rules/first.ts": MODULE,
    "apps/site/src/app/rules/first.ts": MODULE,
  });
  expect(found).toStrictEqual([
    "slice-segment-name apps/site/src/entities/manuscript/catalog",
    "slice-segment-name apps/site/src/features/sync-manuscripts/rules",
  ]);
});

layer(fixtureLayer)("checkSourceNames", (it) => {
  it.effect("reports feature slices that do not start with a verb", () => reportsNounSlices);
  it.effect("accepts <verb>-<object> slices and other layers", () => acceptsVerbObjectSlices);
  it.effect("reports slice folders that are not segments", () => reportsSegmentFolders);
  it.effect("reports files and folders named after the deploy target", () => reportsDeployNames);
});
