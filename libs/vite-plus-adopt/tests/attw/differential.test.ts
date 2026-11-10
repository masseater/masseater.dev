import { layer } from "@effect/vitest";
import { deepStrictEqual, throws } from "@effect/vitest/utils";
import { Effect, Layer, Option, Record as Rec } from "effect";
import { ModuleResolutionKind } from "typescript/sync";

import { checkPackage } from "#src/attw.ts";
import { createCompilerHostWrapperWith } from "#src/attw/compiler-hosts.ts";

import { asJson, expected, fixtureNamed, inputs, packageOf } from "./differential-data.ts";
import type { ExpectedLookupData, FixtureData } from "./differential-data.ts";

const matchesCheckPackage = (fixture: FixtureData): Effect.Effect<void> =>
  Effect.gen(function* test() {
    const result = yield* Effect.promise(() => checkPackage(packageOf(fixture)));
    deepStrictEqual(Option.some(asJson(result)), Rec.get(expected.packages, fixture.name));
  });

const matchesLookup = (lookup: ExpectedLookupData): Effect.Effect<void> =>
  Effect.sync(() => {
    const host = createCompilerHostWrapperWith(
      packageOf(fixtureNamed(lookup.fixture)),
      lookup.moduleResolution,
      "",
    );
    const { resolution, trace } = host.resolveModuleName(
      lookup.moduleName,
      lookup.containingFile,
      lookup.mode,
      lookup.noDtsResolution,
    );
    deepStrictEqual(
      {
        resolution: Option.fromNullishOr(resolution.resolvedModule).pipe(Option.map(asJson)),
        trace,
      },
      { resolution: Option.fromNullishOr(lookup.resolution), trace: lookup.trace },
    );
  });

const rejectsClassicResolution = Effect.sync(() => {
  throws(
    () => {
      createCompilerHostWrapperWith(
        packageOf(fixtureNamed("exports-patterns")),
        ModuleResolutionKind.Classic,
        "",
      );
    },
    new TypeError(`Unsupported module resolution kind: ${String(ModuleResolutionKind.Classic)}`),
  );
});

const coversEveryLookup = Effect.sync(() => {
  deepStrictEqual(
    expected.hostLookups.map(({ resolution: _resolution, trace: _trace, ...lookup }) => lookup),
    inputs.hostLookups,
  );
});

layer(Layer.empty)("checkPackage matches @arethetypeswrong/core 0.18.5 on TypeScript 5.6", (it) => {
  for (const fixture of inputs.fixtures) {
    it.effect(fixture.name, () => matchesCheckPackage(fixture));
  }
});

layer(Layer.empty)("module resolution through a compiler host matches TypeScript 5.6", (it) => {
  for (const [index, lookup] of expected.hostLookups.entries()) {
    it.effect(`lookup ${String(index)}: ${lookup.moduleName}`, () => matchesLookup(lookup));
  }
  it.effect("covers every lookup in the fixtures", () => coversEveryLookup);
  it.effect(
    "rejects a module resolution kind TypeScript 5.6 hosts never use",
    () => rejectsClassicResolution,
  );
});
