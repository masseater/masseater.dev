import { layer } from "@effect/vitest";
import { Effect, Array as Arr, pipe } from "effect";
import { expect } from "vite-plus/test";

import { fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { dependingOn, findingsIn, jsonOf } from "./findings.test.support.ts";

const lines = (...text: readonly string[]): string => pipe([...text, ""], Arr.join("\n"));

const reportsNamesThatModulesDeclareOneByOne = Effect.gen(
  function* reportsNamesThatModulesDeclareOneByOne() {
    const findings = yield* findingsIn({
      "src/checks/alpha.ts": lines('export const RULE = "alpha-check";'),
      "src/checks/beta.ts": lines('export const RULE = "beta-check";'),
      "src/rule-name.ts": lines('export type RuleName = "alpha-check" | "beta-check";'),
    });
    expect(findings).toStrictEqual(["src/rule-name.ts:1 hand-written-names"]);
  },
);

const acceptsNamesTypedWithTheList = Effect.gen(function* acceptsNamesTypedWithTheList() {
  const findings = yield* findingsIn({
    "src/checks/alpha.ts": lines(
      'import type { RuleName } from "../rule-name.ts";',
      'export const RULE: RuleName = "alpha-check";',
    ),
    "src/checks/beta.ts": lines(
      'import type { RuleName } from "../rule-name.ts";',
      'export const RULE: RuleName = "beta-check";',
    ),
    "src/rule-name.ts": lines('export type RuleName = "alpha-check" | "beta-check";'),
  });
  expect(findings).toStrictEqual([]);
});

const ignoresNamesUsedInsideFunctions = Effect.gen(function* ignoresNamesUsedInsideFunctions() {
  const findings = yield* findingsIn({
    "src/alpha.ts": lines('export const pick = () => ({ effort: "low" });'),
    "src/beta.ts": lines('export const other = () => ({ level: "high" });'),
    "src/priority.ts": lines('export type Priority = "high" | "low";'),
  });
  expect(findings).toStrictEqual([]);
});

const ignoresNamesInsideDataRecords = Effect.gen(function* ignoresNamesInsideDataRecords() {
  const findings = yield* findingsIn({
    "src/alpha.ts": lines('export const ITEMS = [{ effort: "low" }, { effort: "mid" }];'),
    "src/beta.ts": lines('export const ROWS = [{ level: "high" }];'),
    "src/priority.ts": lines('export type Priority = "high" | "low";'),
  });
  expect(findings).toStrictEqual([]);
});

const reportsAPartOfAnotherList = Effect.gen(function* reportsAPartOfAnotherList() {
  const findings = yield* findingsIn({
    "src/sort.ts": lines(
      'export type Direction = "asc" | "desc" | "none";',
      'export type Sorted = "asc" | "desc";',
    ),
  });
  expect(findings).toStrictEqual(["src/sort.ts:2 hand-written-names"]);
});

const acceptsASelectionFromAnotherList = Effect.gen(function* acceptsASelectionFromAnotherList() {
  const findings = yield* findingsIn({
    "src/sort.ts": lines(
      'export type Direction = "asc" | "desc" | "none";',
      'export type Sorted = Exclude<Direction, "none">;',
      'export type Early = Extract<Direction, "asc" | "desc">;',
    ),
  });
  expect(findings).toStrictEqual([]);
});

const reportsListsThatEnumerateADirectory = Effect.gen(
  function* reportsListsThatEnumerateADirectory() {
    const findings = yield* findingsIn({
      "src/apps/one/index.ts": lines("export const one = 1;"),
      "src/apps/two/index.ts": lines("export const two = 2;"),
      "src/apps.ts": lines('export const APPS = ["apps/one", "apps/two"] as const;'),
    });
    expect(findings).toStrictEqual(["src/apps.ts:1 hand-written-names"]);
  },
);

const acceptsNamedFilesAmongOtherEntries = Effect.gen(
  function* acceptsNamedFilesAmongOtherEntries() {
    const findings = yield* findingsIn({
      "Cargo.toml": lines("[workspace]"),
      "mise.toml": lines("[tools]"),
      "rustfmt.toml": lines("edition = 2024"),
      "taplo.toml": lines("[formatting]"),
      "src/inputs.ts": lines('export const INPUTS = ["Cargo.toml", "mise.toml"] as const;'),
    });
    expect(findings).toStrictEqual([]);
  },
);

const ignoresListsInModulesThatDoNotImportEachOther = Effect.gen(
  function* ignoresListsInModulesThatDoNotImportEachOther() {
    const findings = yield* findingsIn({
      "src/query.ts": lines('export type QueryConfig = "recommended" | "strict" | "flat";'),
      "src/router.ts": lines('export type RouterConfig = "recommended" | "flat";'),
    });
    expect(findings).toStrictEqual([]);
  },
);

const reportsTypesTheLanguageDeclares = Effect.gen(function* reportsTypesTheLanguageDeclares() {
  const findings = yield* findingsIn({
    "src/handles.ts": lines(
      'export const HANDLES = ["HTMLElement", "Worker", "ReadableStream"] as const;',
    ),
  });
  expect(findings).toStrictEqual(["src/handles.ts:1 hand-written-names"]);
});

const reportsTypesAPackageDeclares = Effect.gen(function* reportsTypesAPackageDeclares() {
  const manifest = yield* jsonOf({ name: "markup", types: "./index.d.ts" });
  const packageJson = yield* dependingOn("markup");
  const findings = yield* findingsIn({
    "node_modules/markup/package.json": manifest,
    "node_modules/markup/index.d.ts": lines(
      "export interface AnyNode { kind: string }",
      "export interface Fragment<Child> { children: Child[] }",
      "export declare function parse(text: string): AnyNode;",
    ),
    "package.json": packageJson,
    "src/skipped.ts": lines(
      'export const SKIPPED = [{ from: "package", package: "markup", name: ["AnyNode", "Fragment"] }];',
    ),
  });
  expect(findings).toStrictEqual(["src/skipped.ts:1 hand-written-names"]);
});

const acceptsTagsOfTheTypesAPackageDeclares = Effect.gen(
  function* acceptsTagsOfTheTypesAPackageDeclares() {
    const manifest = yield* jsonOf({ name: "tree", types: "./index.d.ts" });
    const packageJson = yield* dependingOn("tree");
    const findings = yield* findingsIn({
      "node_modules/tree/package.json": manifest,
      "node_modules/tree/index.d.ts": lines(
        'export interface Leaf { type: "Leaf" }',
        'export interface Branch { type: "Branch"; children: Leaf[] }',
        'export type Flow = "Stream" | "Batch";',
        "export interface Stream { size: number }",
        "export interface Batch { size: number }",
      ),
      "package.json": packageJson,
      "src/kinds.ts": lines(
        'export const KINDS = ["Leaf", "Branch"];',
        'export const FLOWS: readonly string[] = ["Stream", "Batch"];',
      ),
    });
    expect(findings).toStrictEqual([]);
  },
);

const reportsAListThatIsHalfOutsideTypes = Effect.gen(
  function* reportsAListThatIsHalfOutsideTypes() {
    const findings = yield* findingsIn({
      "src/handles.ts": lines(
        'export const HANDLES: readonly string[] = ["HTMLElement", "Worker", "Gadget", "Widget"];',
      ),
    });
    expect(findings).toStrictEqual(["src/handles.ts:1 hand-written-names"]);
  },
);

const acceptsNamesThatNoTypeDeclares = Effect.gen(function* acceptsNamesThatNoTypeDeclares() {
  const findings = yield* findingsIn({
    "src/levels.ts": lines(
      'export const LEVELS = ["Gentle", "Harsh", "parse"] as const;',
      'export const MIXED = ["HTMLElement", "gadget", "widget"] as const;',
    ),
  });
  expect(findings).toStrictEqual([]);
});

const acceptsAListThatNamesOneType = Effect.gen(function* acceptsAListThatNamesOneType() {
  const findings = yield* findingsIn({
    "src/mark.ts": lines('export type Mark = "Text" | "heading" | "quote";'),
  });
  expect(findings).toStrictEqual([]);
});

layer(fixtureLayer)("hand-written names", (it) => {
  it.effect(
    "reports names that modules declare one by one",
    () => reportsNamesThatModulesDeclareOneByOne,
  );
  it.effect("accepts names typed with the list", () => acceptsNamesTypedWithTheList);
  it.effect("ignores names used inside functions", () => ignoresNamesUsedInsideFunctions);
  it.effect("ignores names inside data records", () => ignoresNamesInsideDataRecords);
  it.effect("reports a part of another list", () => reportsAPartOfAnotherList);
  it.effect(
    "ignores lists in modules that do not import each other",
    () => ignoresListsInModulesThatDoNotImportEachOther,
  );
  it.effect("accepts a selection from another list", () => acceptsASelectionFromAnotherList);
  it.effect("reports lists that enumerate a directory", () => reportsListsThatEnumerateADirectory);
  it.effect("accepts named files among other entries", () => acceptsNamedFilesAmongOtherEntries);
});

layer(fixtureLayer)("hand-written names of outside types", (it) => {
  it.effect("reports types the language declares", () => reportsTypesTheLanguageDeclares);
  it.effect("reports types a package declares", () => reportsTypesAPackageDeclares);
  it.effect(
    "accepts tags of the types a package declares",
    () => acceptsTagsOfTheTypesAPackageDeclares,
  );
  it.effect("reports a list that is half outside types", () => reportsAListThatIsHalfOutsideTypes);
  it.effect("accepts names that no type declares", () => acceptsNamesThatNoTypeDeclares);
  it.effect("accepts a list that names one type", () => acceptsAListThatNamesOneType);
});
