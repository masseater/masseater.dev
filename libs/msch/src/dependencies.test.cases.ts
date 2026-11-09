import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { dependencyEntries } from "./dependencies.ts";
import { manifestText } from "./manifest.test.support.ts";
import type { RepositoryFiles } from "./repository-files.ts";
import { directoryWith } from "./repository.test.support.ts";

interface RelativeEntry {
  readonly specifier: string;
  readonly declarationsPath: string;
}

const manifest = manifestText;

const relativeEntries = (
  packageDirectory: string,
): Effect.Effect<readonly RelativeEntry[], never, RepositoryFiles> =>
  dependencyEntries(packageDirectory).pipe(
    Effect.map((entries) =>
      pipe(
        entries,
        Arr.map((entry) => ({
          specifier: entry.specifier,
          declarationsPath: Str.slice(`${packageDirectory}/`.length)(entry.declarationsPath),
        })),
      ),
    ),
  );

const EMPTY_DECLARATIONS = "";

const readsTheRootTypesConditionOfAnExportMap = Effect.gen(
  function* readsTheRootTypesConditionOfAnExportMap() {
    const manifestText1 = yield* manifest({ dependencies: { oxlint: "1.0.0" } });
    const manifestText2 = yield* manifest({
      exports: { ".": { types: "./dist/index.d.ts", default: "./dist/index.js" } },
    });
    const packageDirectory = yield* directoryWith({
      "package.json": manifestText1,
      "node_modules/oxlint/package.json": manifestText2,
      "node_modules/oxlint/dist/index.d.ts": EMPTY_DECLARATIONS,
    });
    const actual1 = yield* relativeEntries(packageDirectory);
    expect(actual1).toStrictEqual([
      { specifier: "oxlint", declarationsPath: "node_modules/oxlint/dist/index.d.ts" },
    ]);
  },
);

const readsAnExportMapSpelledAsOnePathAsTheRoo = Effect.gen(
  function* readsAnExportMapSpelledAsOnePathAsTheRoo() {
    const manifestText3 = yield* manifest({ dependencies: { oxlint: "1.0.0" } });
    const manifestText4 = yield* manifest({ exports: "./dist/index.js" });
    const packageDirectory = yield* directoryWith({
      "package.json": manifestText3,
      "node_modules/oxlint/package.json": manifestText4,
      "node_modules/oxlint/dist/index.d.ts": EMPTY_DECLARATIONS,
    });
    const actual2 = yield* relativeEntries(packageDirectory);
    expect(actual2).toStrictEqual([
      { specifier: "oxlint", declarationsPath: "node_modules/oxlint/dist/index.d.ts" },
    ]);
  },
);

const readsConditionsWrittenWithoutASubpathAsT = Effect.gen(
  function* readsConditionsWrittenWithoutASubpathAsT() {
    const manifestText5 = yield* manifest({ dependencies: { oxlint: "1.0.0" } });
    const manifestText6 = yield* manifest({
      exports: { import: { types: "./dist/index.d.mts" } },
    });
    const packageDirectory = yield* directoryWith({
      "package.json": manifestText5,
      "node_modules/oxlint/package.json": manifestText6,
      "node_modules/oxlint/dist/index.d.mts": EMPTY_DECLARATIONS,
    });
    const actual3 = yield* relativeEntries(packageDirectory);
    expect(actual3).toStrictEqual([
      { specifier: "oxlint", declarationsPath: "node_modules/oxlint/dist/index.d.mts" },
    ]);
  },
);

const readsEveryPublishedSubpathAndLeavesWildc = Effect.gen(
  function* readsEveryPublishedSubpathAndLeavesWildc() {
    const manifestText7 = yield* manifest({ dependencies: { effect: "4.0.0" } });
    const manifestText8 = yield* manifest({
      exports: {
        ".": { types: "./dist/index.d.ts" },
        "./encoding": { types: "./dist/encoding.d.ts" },
        "./internal/*": { types: "./dist/internal/*.d.ts" },
        "./package.json": "./package.json",
      },
    });
    const packageDirectory = yield* directoryWith({
      "package.json": manifestText7,
      "node_modules/effect/package.json": manifestText8,
      "node_modules/effect/dist/index.d.ts": EMPTY_DECLARATIONS,
      "node_modules/effect/dist/encoding.d.ts": EMPTY_DECLARATIONS,
    });
    const actual4 = yield* relativeEntries(packageDirectory);
    expect(actual4).toStrictEqual([
      { specifier: "effect", declarationsPath: "node_modules/effect/dist/index.d.ts" },
      {
        specifier: "effect/encoding",
        declarationsPath: "node_modules/effect/dist/encoding.d.ts",
      },
    ]);
  },
);

const letsTheTypesFieldNameTheRootWhenTheExpor = Effect.gen(
  function* letsTheTypesFieldNameTheRootWhenTheExpor() {
    const manifestText9 = yield* manifest({ dependencies: { oxlint: "1.0.0" } });
    const manifestText10 = yield* manifest({
      types: "./index.d.ts",
      exports: { "./plugins": { types: "./plugins.d.ts" } },
    });
    const packageDirectory = yield* directoryWith({
      "package.json": manifestText9,
      "node_modules/oxlint/package.json": manifestText10,
      "node_modules/oxlint/index.d.ts": EMPTY_DECLARATIONS,
      "node_modules/oxlint/plugins.d.ts": EMPTY_DECLARATIONS,
    });
    const actual5 = yield* relativeEntries(packageDirectory);
    expect(actual5).toStrictEqual([
      { specifier: "oxlint", declarationsPath: "node_modules/oxlint/index.d.ts" },
      { specifier: "oxlint/plugins", declarationsPath: "node_modules/oxlint/plugins.d.ts" },
    ]);
  },
);

const letsTheTypesFieldDecideWhenTheExportMapN = Effect.gen(
  function* letsTheTypesFieldDecideWhenTheExportMapN() {
    const manifestText11 = yield* manifest({ dependencies: { oxlint: "1.0.0", vite: "1.0.0" } });
    const manifestText12 = yield* manifest({
      typings: "./types.d.ts",
      exports: { ".": "./bin/vite" },
    });
    const packageDirectory = yield* directoryWith({
      "package.json": manifestText11,
      "node_modules/oxlint/package.json": '{"types":"./index.d.ts","exports":{".":{"node":null}}}',
      "node_modules/oxlint/index.d.ts": EMPTY_DECLARATIONS,
      "node_modules/vite/package.json": manifestText12,
      "node_modules/vite/types.d.ts": EMPTY_DECLARATIONS,
    });
    const actual6 = yield* relativeEntries(packageDirectory);
    expect(actual6).toStrictEqual([
      { specifier: "oxlint", declarationsPath: "node_modules/oxlint/index.d.ts" },
      { specifier: "vite", declarationsPath: "node_modules/vite/types.d.ts" },
    ]);
  },
);

const findsATypesConditionNestedUnderAnotherCo = Effect.gen(
  function* findsATypesConditionNestedUnderAnotherCo() {
    const manifestText13 = yield* manifest({ dependencies: { oxlint: "1.0.0" } });
    const manifestText14 = yield* manifest({
      exports: {
        ".": { import: { types: "./dist/index.d.mts", default: "./dist/index.mjs" } },
      },
    });
    const packageDirectory = yield* directoryWith({
      "package.json": manifestText13,
      "node_modules/oxlint/package.json": manifestText14,
      "node_modules/oxlint/dist/index.d.mts": EMPTY_DECLARATIONS,
    });
    const actual7 = yield* relativeEntries(packageDirectory);
    expect(actual7).toStrictEqual([
      { specifier: "oxlint", declarationsPath: "node_modules/oxlint/dist/index.d.mts" },
    ]);
  },
);

const pointsARuntimeOnlyMainEntryAtTheDeclarat = Effect.gen(
  function* pointsARuntimeOnlyMainEntryAtTheDeclarat() {
    const manifestText15 = yield* manifest({ dependencies: { nested: "1.0.0" } });
    const manifestText16 = yield* manifest({ main: "./lib/main.cjs" });
    const packageDirectory = yield* directoryWith({
      "package.json": manifestText15,
      "node_modules/nested/package.json": manifestText16,
      "node_modules/nested/lib/main.d.cts": EMPTY_DECLARATIONS,
    });
    const actual8 = yield* relativeEntries(packageDirectory);
    expect(actual8).toStrictEqual([
      { specifier: "nested", declarationsPath: "node_modules/nested/lib/main.d.cts" },
    ]);
  },
);

const readsDevelopmentAndPeerDependenciesTheSa = Effect.gen(
  function* readsDevelopmentAndPeerDependenciesTheSa() {
    const manifestText17 = yield* manifest({
      devDependencies: { oxlint: "1.0.0" },
      peerDependencies: { vite: "1.0.0" },
    });
    const manifestText18 = yield* manifest({ types: "./index.d.ts" });
    const manifestText19 = yield* manifest({ types: "./index.d.ts" });
    const packageDirectory = yield* directoryWith({
      "package.json": manifestText17,
      "node_modules/oxlint/package.json": manifestText18,
      "node_modules/oxlint/index.d.ts": EMPTY_DECLARATIONS,
      "node_modules/vite/package.json": manifestText19,
      "node_modules/vite/index.d.ts": EMPTY_DECLARATIONS,
    });
    const actual9 = yield* relativeEntries(packageDirectory);
    expect(actual9).toStrictEqual([
      { specifier: "oxlint", declarationsPath: "node_modules/oxlint/index.d.ts" },
      { specifier: "vite", declarationsPath: "node_modules/vite/index.d.ts" },
    ]);
  },
);

const leavesWorkspaceDependenciesToTheReposito = Effect.gen(
  function* leavesWorkspaceDependenciesToTheReposito() {
    const manifestText20 = yield* manifest({ dependencies: { "@repo/shared": "workspace:*" } });
    const manifestText21 = yield* manifest({ types: "./index.d.ts" });
    const packageDirectory = yield* directoryWith({
      "package.json": manifestText20,
      "node_modules/@repo/shared/package.json": manifestText21,
      "node_modules/@repo/shared/index.d.ts": EMPTY_DECLARATIONS,
    });
    const actual10 = yield* relativeEntries(packageDirectory);
    expect(actual10).toStrictEqual([]);
  },
);

const skipsPackagesThatShipNoDeclarationsOrAre = Effect.gen(
  function* skipsPackagesThatShipNoDeclarationsOrAre() {
    const manifestText22 = yield* manifest({
      dependencies: { untyped: "1.0.0", absent: "1.0.0", rootonly: "1.0.0" },
    });
    const manifestText23 = yield* manifest({ main: "./index" });
    const manifestText24 = yield* manifest({ types: "./index.d.ts" });
    const packageDirectory = yield* directoryWith({
      "package.json": manifestText22,
      "node_modules/untyped/package.json": manifestText23,
      "node_modules/rootonly/package.json": manifestText24,
      "node_modules/rootonly/index.d.ts": EMPTY_DECLARATIONS,
    });
    const actual11 = yield* relativeEntries(packageDirectory);
    expect(actual11).toStrictEqual([
      { specifier: "rootonly", declarationsPath: "node_modules/rootonly/index.d.ts" },
    ]);
  },
);

const sortsEntriesByPackageName = Effect.gen(function* sortsEntriesByPackageName() {
  const manifestText25 = yield* manifest({
    dependencies: { zod: "1.0.0", alpha: "1.0.0", mid: "1.0.0" },
  });
  const manifestText26 = yield* manifest({ types: "./index.d.ts" });
  const manifestText27 = yield* manifest({ types: "./index.d.ts" });
  const manifestText28 = yield* manifest({ types: "./index.d.ts" });
  const packageDirectory = yield* directoryWith({
    "package.json": manifestText25,
    "node_modules/zod/package.json": manifestText26,
    "node_modules/zod/index.d.ts": EMPTY_DECLARATIONS,
    "node_modules/alpha/package.json": manifestText27,
    "node_modules/alpha/index.d.ts": EMPTY_DECLARATIONS,
    "node_modules/mid/package.json": manifestText28,
    "node_modules/mid/index.d.ts": EMPTY_DECLARATIONS,
  });
  const specifiers = yield* relativeEntries(packageDirectory);
  expect(
    pipe(
      specifiers,
      Arr.map((entry) => entry.specifier),
    ),
  ).toStrictEqual(["alpha", "mid", "zod"]);
});

const hasNothingToOfferWithoutDependenciesOrWi = Effect.gen(
  function* hasNothingToOfferWithoutDependenciesOrWi() {
    const manifestText29 = yield* manifest({ name: "x" });
    const withoutDependencies = yield* directoryWith({ "package.json": manifestText29 });
    const withoutManifest = yield* directoryWith({ "README.md": "" });
    const actual12 = yield* dependencyEntries(withoutDependencies);
    expect(actual12).toStrictEqual([]);
    const actual13 = yield* dependencyEntries(withoutManifest);
    expect(actual13).toStrictEqual([]);
  },
);

export {
  readsTheRootTypesConditionOfAnExportMap,
  readsAnExportMapSpelledAsOnePathAsTheRoo,
  readsConditionsWrittenWithoutASubpathAsT,
  readsEveryPublishedSubpathAndLeavesWildc,
  letsTheTypesFieldNameTheRootWhenTheExpor,
  letsTheTypesFieldDecideWhenTheExportMapN,
  findsATypesConditionNestedUnderAnotherCo,
  pointsARuntimeOnlyMainEntryAtTheDeclarat,
  readsDevelopmentAndPeerDependenciesTheSa,
  leavesWorkspaceDependenciesToTheReposito,
  skipsPackagesThatShipNoDeclarationsOrAre,
  sortsEntriesByPackageName,
  hasNothingToOfferWithoutDependenciesOrWi,
};
