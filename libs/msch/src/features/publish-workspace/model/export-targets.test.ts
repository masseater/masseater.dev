import { layer as nodeServicesLayer } from "@effect/platform-node/NodeServices";
import { layer } from "@effect/vitest";
import { Effect, Exit, Layer } from "effect";
import { describe, expect, test } from "vite-plus/test";

import { directoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { checkExportTargets, exportTargetsOf } from "./export-targets.ts";

describe("export targets", () => {
  test("lists every file the published exports point to, through nested conditions", () => {
    const exports = {
      ".": { types: "./dist/index.d.mts", default: "./dist/index.mjs" },
      "./node": { import: { types: "./dist/node.d.mts", default: "./dist/node.mjs" } },
      "./cli": "./dist/cli.mjs",
      "./package.json": "./package.json",
    };
    expect(exportTargetsOf(exports)).toStrictEqual([
      "./dist/index.d.mts",
      "./dist/index.mjs",
      "./dist/node.d.mts",
      "./dist/node.mjs",
      "./dist/cli.mjs",
      "./package.json",
    ]);
  });

  test("skips subpath patterns, which name no single file", () => {
    expect(exportTargetsOf({ "./presets/*": "./presets/*", ".": "./index.js" })).toStrictEqual([
      "./index.js",
    ]);
  });

  test("accepts exports written as one string or as an array of fallbacks", () => {
    expect(exportTargetsOf("./dist/index.js")).toStrictEqual(["./dist/index.js"]);
    expect(exportTargetsOf({ ".": ["./dist/a.js", "./dist/b.js"] })).toStrictEqual([
      "./dist/a.js",
      "./dist/b.js",
    ]);
  });
});

const PUBLISHED =
  '{"name":"x","exports":{".":"./src/app/index.ts"},"publishConfig":{"exports":{".":{"types":"./dist/index.d.ts","default":"./dist/index.js"}}}}';

const failsWhenTheBuildWroteOtherNames = Effect.gen(function* failsWhenTheBuildWroteOtherNames() {
  const directory = yield* directoryWith({
    "package.json": PUBLISHED,
    "dist/index.d.mts": "",
    "dist/index.mjs": "",
  });
  const exit = yield* Effect.exit(checkExportTargets(directory));
  expect(Exit.isFailure(exit)).toBe(true);
  expect(String(exit)).toContain("./dist/index.d.ts, ./dist/index.js");
});

const passesWhenEveryTargetExists = Effect.gen(function* passesWhenEveryTargetExists() {
  const directory = yield* directoryWith({
    "package.json": PUBLISHED,
    "dist/index.d.ts": "",
    "dist/index.js": "",
  });
  const exit = yield* Effect.exit(checkExportTargets(directory));
  expect(Exit.isSuccess(exit)).toBe(true);
});

layer(Layer.merge(fixtureLayer, nodeServicesLayer))("published export files", (it) => {
  it.effect(
    "fails when publishConfig.exports names files the build did not write",
    () => failsWhenTheBuildWroteOtherNames,
  );
  it.effect("passes when every published export file exists", () => passesWhenEveryTargetExists);
});
