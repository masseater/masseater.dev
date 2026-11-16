import { layer } from "@effect/vitest";
import { Effect, Array as Arr, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { FixtureFiles, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { cacheEntriesAfter, findingsAfterEdit } from "./findings.test.support.ts";

const lines = (source: readonly string[]): string => pipe(source, Arr.join("\n"));

const STATUS_OWNER = lines([
  "/** @msch order.status */",
  'export const ORDER_STATUSES = ["draft", "published", "archived"] as const;',
  "export type OrderStatus = (typeof ORDER_STATUSES)[number];",
  "",
]);

const DERIVED = lines([
  'import type { OrderStatus } from "./status.ts";',
  'export type Early = Extract<OrderStatus, "draft" | "published">;',
  "",
]);

const RESTATED = lines(['export type Local = "draft" | "published";', ""]);

const reportsAProblemAddedAfterACleanRun = Effect.gen(
  function* reportsAProblemAddedAfterACleanRun() {
    const findings = yield* findingsAfterEdit(
      { "src/status.ts": STATUS_OWNER, "src/use.ts": DERIVED },
      { "src/use.ts": RESTATED },
    );
    expect(findings).toStrictEqual([[], ["src/use.ts:1 owner-value-set"]]);
  },
);

const dropsAProblemFixedAfterTheFirstRun = Effect.gen(
  function* dropsAProblemFixedAfterTheFirstRun() {
    const findings = yield* findingsAfterEdit(
      { "src/status.ts": STATUS_OWNER, "src/use.ts": RESTATED },
      { "src/use.ts": DERIVED },
    );
    expect(findings).toStrictEqual([["src/use.ts:1 owner-value-set"], []]);
  },
);

const installed =
  (version: string) =>
  (root: string): Effect.Effect<void, never, FixtureFiles | RepositoryFiles> =>
    Effect.gen(function* installVersion() {
      const fixtures = yield* FixtureFiles;
      const files = yield* RepositoryFiles;
      const target = files.join(
        root,
        "node_modules",
        ".pnpm",
        `dep@${version}`,
        "node_modules",
        "dep",
      );
      yield* fixtures.writeFile(files.join(target, "package.json"), '{"name":"dep"}');
      yield* files.removeFile(files.join(root, "node_modules", "dep"));
      yield* fixtures.symlink(target, files.join(root, "node_modules", "dep"));
    });

const sources = { "src/status.ts": STATUS_OWNER, "src/use.ts": DERIVED };

const keepsTheEntryWhenAnUnrelatedRootFileChanges = Effect.gen(
  function* keepsTheEntryWhenAnUnrelatedRootFileChanges() {
    const entries = yield* cacheEntriesAfter(sources, (root) =>
      Effect.gen(function* editReadme() {
        const fixtures = yield* FixtureFiles;
        const files = yield* RepositoryFiles;
        yield* fixtures.writeFile(files.join(root, "README.md"), "changed");
      }),
    );
    expect(entries.after).toStrictEqual(entries.before);
  },
);

const replacesTheEntryWhenTheInstalledDependenciesChange = Effect.gen(
  function* replacesTheEntryWhenTheInstalledDependenciesChange() {
    const entries = yield* cacheEntriesAfter(sources, (root) =>
      installed("1.0.0")(root).pipe(Effect.andThen(installed("2.0.0")(root))),
    );
    expect(entries.after).toHaveLength(entries.before.length);
    expect(entries.after).not.toStrictEqual(entries.before);
  },
);

layer(fixtureLayer)("value-owners cache", (it) => {
  it.effect("reports a problem added after a clean run", () => reportsAProblemAddedAfterACleanRun);
  it.effect("drops a problem fixed after the first run", () => dropsAProblemFixedAfterTheFirstRun);
  it.effect(
    "keeps the entry when an unrelated root file changes",
    () => keepsTheEntryWhenAnUnrelatedRootFileChanges,
  );
  it.effect(
    "replaces the entry when the installed dependencies change",
    () => replacesTheEntryWhenTheInstalledDependenciesChange,
  );
});
