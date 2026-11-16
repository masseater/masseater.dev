import { layer } from "@effect/vitest";
import { Array as Arr, Effect, Schema, pipe } from "effect";
import { expect } from "vite-plus/test";

import { fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { findingsIn } from "./findings.test.support.ts";

const stringifyUnknown = Schema.encodeEffect(Schema.fromJsonString(Schema.Unknown));

const acceptsShapesOtherPackagesAugmentInto = Effect.gen(
  function* acceptsShapesOtherPackagesAugmentInto() {
    const sorterManifest = yield* stringifyUnknown({ name: "sorter", types: "./index.d.ts" });
    const sectionsManifest = yield* stringifyUnknown({ name: "sections", types: "./index.d.ts" });
    const packageJson = yield* stringifyUnknown({
      name: "fixture",
      dependencies: { sorter: "1.0.0" },
    });
    const findings = yield* findingsIn({
      "node_modules/sorter/package.json": sorterManifest,
      "node_modules/sorter/index.d.ts": "export interface Page { limit: number; offset: number }\n",
      "node_modules/sections/package.json": sectionsManifest,
      "node_modules/sections/index.d.ts": pipe(
        [
          "export interface Sections { alpha?: string; beta?: number; gamma?: boolean }",
          'declare module "sorter" {',
          "  interface Page extends Sections {}",
          "}",
          "",
        ],
        Arr.join("\n"),
      ),
      "package.json": packageJson,
      "src/a.ts": pipe(
        [
          'import type { Page } from "sorter";',
          'import type {} from "sections";',
          "export interface Sections { alpha?: string; beta?: number; gamma?: boolean }",
          "export type Paged = Page;",
          "",
        ],
        Arr.join("\n"),
      ),
    });
    expect(findings).toStrictEqual([]);
  },
);

layer(fixtureLayer)("augmented library types", (it) => {
  it.effect(
    "accepts shapes that another package augments into a library type",
    () => acceptsShapesOtherPackagesAugmentInto,
  );
});
