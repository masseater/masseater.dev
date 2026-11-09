import { layer } from "@effect/vitest";
import { Effect, Schema, Array as Arr, Record as Rec, pipe } from "effect";
import { expect } from "vite-plus/test";

import { findingsIn, fixtureLayer } from "./repository.test.support.ts";

const stringifyUnknown = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const dependingOn = (...names: readonly string[]): Effect.Effect<string, Schema.SchemaError> =>
  stringifyUnknown({
    name: "fixture",
    dependencies: pipe(
      names,
      Arr.map((name) => [name, "1.0.0"] as const),
      Rec.fromEntries,
    ),
  });

const SORTER_MANIFEST = stringifyUnknown({ name: "sorter", types: "./index.d.ts" });

const sorterWith = (manifest: string): Readonly<Record<string, string>> => ({
  "node_modules/sorter/package.json": manifest,
  "node_modules/sorter/index.d.ts": pipe(
    [
      'export type Order = "asc" | "desc";',
      "export declare function sort(order: Order): void;",
      'export declare function move(direction: "up" | "down"): void;',
      "export interface Page { order: Order; limit: number; offset: number; cursor: string }",
      "export interface Contract { paths: any; ids: any; routes: unknown }",
      "export interface Style extends Page {}",
      "export declare function same<T>(left: T, right: T): void;",
      "export type Kind = 0 | 1 | 2 | 100;",
      "",
    ],
    Arr.join("\n"),
  ),
});

const BILLING_MANIFEST = stringifyUnknown({ name: "billing", types: "./index.d.ts" });

const billingWith = (manifest: string): Readonly<Record<string, string>> => ({
  "node_modules/billing/package.json": manifest,
  "node_modules/billing/index.d.ts": pipe(
    [
      "declare class Billing {}",
      "declare namespace Billing {",
      "  namespace Invoice {",
      '    type CollectionMethod = "charge_automatically" | "send_invoice";',
      "  }",
      "}",
      "export = Billing;",
      "",
    ],
    Arr.join("\n"),
  ),
});

const reportsSetsThatRestateAnExportedLibraryT = Effect.gen(
  function* reportsSetsThatRestateAnExportedLibraryT() {
    const sorterManifest = yield* SORTER_MANIFEST;
    const billingManifest = yield* BILLING_MANIFEST;
    const packageJson = yield* dependingOn("sorter", "billing");
    const findings = yield* findingsIn({
      ...sorterWith(sorterManifest),
      ...billingWith(billingManifest),
      "package.json": packageJson,
      "src/a.ts": pipe(
        [
          'import type { Order } from "sorter";',
          'import type Billing from "billing";',
          'export type Direction = "desc" | "asc";',
          'export type Method = "charge_automatically" | "send_invoice";',
          "export type Used = [Order, Billing];",
          "",
        ],
        Arr.join("\n"),
      ),
      "src/b.ts": 'export type Sorting = "asc" | "desc";\n',
    });
    expect(findings).toStrictEqual([
      "src/a.ts:3 library-value-set",
      "src/a.ts:4 library-value-set",
    ]);
  },
);

const namesTheLibrarySlotASetFlowsIntoEvenAnIn = Effect.gen(
  function* namesTheLibrarySlotASetFlowsIntoEvenAnIn() {
    const sorterManifest = yield* SORTER_MANIFEST;
    const packageJson = yield* dependingOn("sorter");
    const findings = yield* findingsIn({
      ...sorterWith(sorterManifest),
      "package.json": packageJson,
      "src/a.ts": pipe(
        [
          'import { move } from "sorter";',
          'type Step = "up" | "down";',
          "export const go = (step: Step): void => move(step);",
          "",
        ],
        Arr.join("\n"),
      ),
    });
    expect(findings).toStrictEqual(["src/a.ts:2 library-value-set"]);
  },
);

const acceptsSetsDerivedFromTheLibraryTypeAndL = Effect.gen(
  function* acceptsSetsDerivedFromTheLibraryTypeAndL() {
    const sorterManifest = yield* SORTER_MANIFEST;
    const packageJson = yield* dependingOn("sorter");
    const findings = yield* findingsIn({
      ...sorterWith(sorterManifest),
      "package.json": packageJson,
      "src/a.ts": pipe(
        [
          'import { sort, type Order } from "sorter";',
          'export type Ascending = Extract<Order, "asc">;',
          'sort("asc");',
          "",
        ],
        Arr.join("\n"),
      ),
    });
    expect(findings).toStrictEqual([]);
  },
);

const reportsObjectShapesCopiedFromALibraryTyp = Effect.gen(
  function* reportsObjectShapesCopiedFromALibraryTyp() {
    const sorterManifest = yield* SORTER_MANIFEST;
    const packageJson = yield* dependingOn("sorter");
    const findings = yield* findingsIn({
      ...sorterWith(sorterManifest),
      "package.json": packageJson,
      "src/a.ts": pipe(
        [
          'import type { Order, Page } from "sorter";',
          "export interface Copied { order: Order; limit: number; offset: number; cursor: string }",
          "export type Picked = { order: Order; limit: number; offset: number };",
          'export type Derived = Pick<Page, "order" | "limit" | "offset">;',
          "export interface Own { order: Order; limit: number; total: number }",
          `type Variables = Readonly<Record<\`--\${string}\`, string>>;`,
          'declare module "sorter" {',
          "  interface Style extends Partial<Variables> {}",
          "}",
          "",
        ],
        Arr.join("\n"),
      ),
    });
    expect(findings).toStrictEqual(["src/a.ts:2 library-shape", "src/a.ts:3 library-shape"]);
  },
);

const acceptsKeySelectionsAndLooseLibraryContr = Effect.gen(
  function* acceptsKeySelectionsAndLooseLibraryContr() {
    const sorterManifest = yield* SORTER_MANIFEST;
    const packageJson = yield* dependingOn("sorter");
    const findings = yield* findingsIn({
      ...sorterWith(sorterManifest),
      "package.json": packageJson,
      "src/a.ts": pipe(
        [
          'import type { Page } from "sorter";',
          "interface Entry { slug: string; category: string; title: string }",
          'export type Key = Pick<Entry, "slug" | "category">;',
          'export type Window = Omit<Page, "order" | "cursor">;',
          "",
        ],
        Arr.join("\n"),
      ),
      "src/b.ts": pipe(
        [
          'import type { Entry } from "./c.ts";',
          'export type Key = Pick<Entry, "slug" | "category">;',
          'export interface Routes { paths: "/" | "/feed"; ids: "root" | "feed"; routes: string }',
          "",
        ],
        Arr.join("\n"),
      ),
      "src/c.ts": "export interface Entry { slug: string; category: string; title: string }\n",
    });
    expect(findings).toStrictEqual([]);
  },
);

const ignoresGenericSlotsNumericCoincidencesA = Effect.gen(
  function* ignoresGenericSlotsNumericCoincidencesA() {
    const sorterManifest = yield* SORTER_MANIFEST;
    const packageJson = yield* dependingOn("sorter");
    const findings = yield* findingsIn({
      ...sorterWith(sorterManifest),
      "package.json": packageJson,
      "src/a.ts": pipe(
        [
          'import { same } from "sorter";',
          'type State = "open" | "done";',
          "export const check = (state: State): void => same(state, state);",
          "export const SCALE = [0, 100] as const;",
          "",
        ],
        Arr.join("\n"),
      ),
      "src/generated.ts": pipe(
        [
          "// @ts-nocheck",
          'export type Paths = "/" | "/feed";',
          'export type To = "/" | "/feed";',
          "",
        ],
        Arr.join("\n"),
      ),
    });
    expect(findings).toStrictEqual([]);
  },
);

layer(fixtureLayer)("dependency types", (it) => {
  it.effect(
    "reports sets that restate a type of a library the file imports",
    () => reportsSetsThatRestateAnExportedLibraryT,
  );
  it.effect(
    "names the library slot a set flows into, even an inline parameter type",
    () => namesTheLibrarySlotASetFlowsIntoEvenAnIn,
  );
  it.effect(
    "accepts sets derived from the library type and literals passed to it",
    () => acceptsSetsDerivedFromTheLibraryTypeAndL,
  );
  it.effect(
    "reports object shapes copied from a library type",
    () => reportsObjectShapesCopiedFromALibraryTyp,
  );
  it.effect(
    "accepts key selections and implementations of loose library contracts",
    () => acceptsKeySelectionsAndLooseLibraryContr,
  );
  it.effect(
    "ignores generic library slots, numeric coincidences and files without type checking",
    () => ignoresGenericSlotsNumericCoincidencesA,
  );
});
