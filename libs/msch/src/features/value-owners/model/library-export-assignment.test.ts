import { layer } from "@effect/vitest";
import { Array as Arr, Effect, pipe } from "effect";
import { expect } from "vite-plus/test";

import { fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { dependingOn, findingsIn, jsonOf } from "./findings.test.support.ts";

const REMAP_MANIFEST = jsonOf({ name: "remap", types: "./index.d.cts" });

const readsLibrariesThatExportAFunctionDeclaration = Effect.gen(
  function* readsLibrariesThatExportAFunctionDeclaration() {
    const remapManifest = yield* REMAP_MANIFEST;
    const packageJson = yield* dependingOn("remap");
    const findings = yield* findingsIn({
      "node_modules/remap/package.json": remapManifest,
      "node_modules/remap/index.d.cts":
        'export = function remap(mode: "loose" | "strict"): void;\n',
      "package.json": packageJson,
      "src/a.ts": pipe(
        [
          'import remap = require("remap");',
          'type Mode = "strict" | "loose";',
          "export const run = (mode: Mode): void => remap(mode);",
          "",
        ],
        Arr.join("\n"),
      ),
    });
    expect(findings).toStrictEqual(["src/a.ts:2 library-value-set"]);
  },
);

layer(fixtureLayer)("export assignments", (it) => {
  it.effect(
    "reads a library whose export= is a function declaration instead of an alias",
    () => readsLibrariesThatExportAFunctionDeclaration,
  );
});
