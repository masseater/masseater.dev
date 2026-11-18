import { layer } from "@effect/vitest";
import { Effect, Schema } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { directoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { WIDEN_RANGES } from "./widened-ranges.ts";

type BeforePacking = (manifest: Readonly<Record<string, unknown>>) => unknown;

const isBeforePacking = (value: unknown): value is BeforePacking => typeof value === "function";

const HookModule = Schema.Struct({
  hooks: Schema.Struct({ beforePacking: Schema.declare(isBeforePacking) }),
});

const widensExactVersions = Effect.gen(function* widensExactVersions() {
  const files = yield* RepositoryFiles;
  const directory = yield* directoryWith({ "hook.mjs": WIDEN_RANGES });
  const file = files.join(directory, "hook.mjs");
  const loaded = yield* Effect.promise((): Promise<unknown> => import(file));
  const { hooks } = yield* Schema.decodeUnknownEffect(HookModule)(loaded);
  expect(
    hooks.beforePacking({
      name: "x",
      dependencies: {
        exact: "1.2.3",
        pre: "1.0.0-rc.5-ab785fc",
        range: ">=2.0.0",
        git: "github:a/b",
      },
      peerDependencies: { peer: "4.1.4" },
      optionalDependencies: { native: "1.2.3" },
    }),
  ).toStrictEqual({
    name: "x",
    dependencies: {
      exact: "^1.2.3",
      pre: "^1.0.0-rc.5-ab785fc",
      range: ">=2.0.0",
      git: "github:a/b",
    },
    peerDependencies: { peer: "^4.1.4" },
    optionalDependencies: { native: "1.2.3" },
  });
});

layer(fixtureLayer)("widened ranges", (it) => {
  it.effect(
    "widens exact dependencies and peers to caret ranges and leaves the rest",
    () => widensExactVersions,
  );
});
