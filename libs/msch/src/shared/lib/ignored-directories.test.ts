import { layer } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vite-plus/test";

import { gitRepositoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { ignoredDirectories } from "./ignored-directories.ts";

const excludesIgnoredDirectories = Effect.gen(function* excludesIgnoredDirectories() {
  const root = yield* gitRepositoryWith({
    ".gitignore": "# build\nnode_modules\n/target/\n.cache/\n*.log\n!keep/\n",
    "apps/game/.gitignore": ".godot/\nbin/\n!/bin/\n/out/\n",
    "apps/game/bin/run.ts": "",
  });
  const ignored = yield* Effect.promise(() => ignoredDirectories(root));
  expect(ignored).toStrictEqual([
    { pattern: "!target", base: "workspace" },
    { pattern: "!target/**", base: "workspace" },
    { pattern: "!**/.cache", base: "workspace" },
    { pattern: "!**/.cache/**", base: "workspace" },
    { pattern: "!apps/game/**/.godot", base: "workspace" },
    { pattern: "!apps/game/**/.godot/**", base: "workspace" },
    { pattern: "!apps/game/out", base: "workspace" },
    { pattern: "!apps/game/out/**", base: "workspace" },
    { pattern: "!**/node_modules/.vite", base: "workspace" },
    { pattern: "!**/node_modules/.vite/**", base: "workspace" },
    { pattern: "!**/node_modules/.vite-temp", base: "workspace" },
    { pattern: "!**/node_modules/.vite-temp/**", base: "workspace" },
  ]);
});

layer(fixtureLayer)("ignored directories", (it) => {
  it.effect(
    "turns the directories each .gitignore names and the cache directories of Vite into exclusions of the directory and its contents and keeps any that hold listed files",
    () => excludesIgnoredDirectories,
  );
});
