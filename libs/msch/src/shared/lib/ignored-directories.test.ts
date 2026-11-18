import { layer } from "@effect/vitest";
import { Effect } from "effect";
import { expect } from "vite-plus/test";

import { gitRepositoryWith, fixtureLayer } from "#/shared/lib/repository.test.support.ts";

import { collectPlacedIgnoredDirectories, ignoredDirectories } from "./ignored-directories.ts";

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

const excludesEveryNamedDirectory = Effect.gen(function* excludesEveryNamedDirectory() {
  const root = yield* gitRepositoryWith({
    ".gitignore": "/target/\n",
    "apps/game/.gitignore": "bin/\n",
    "apps/game/src/run.ts": "",
  });
  const ignored = yield* Effect.promise(() => ignoredDirectories(root));
  expect(ignored).toStrictEqual([
    { pattern: "!target", base: "workspace" },
    { pattern: "!target/**", base: "workspace" },
    { pattern: "!apps/game/**/bin", base: "workspace" },
    { pattern: "!apps/game/**/bin/**", base: "workspace" },
    { pattern: "!**/node_modules/.vite", base: "workspace" },
    { pattern: "!**/node_modules/.vite/**", base: "workspace" },
    { pattern: "!**/node_modules/.vite-temp", base: "workspace" },
    { pattern: "!**/node_modules/.vite-temp/**", base: "workspace" },
  ]);
});

const placesAnywhereRules = Effect.gen(function* placesAnywhereRules() {
  const root = yield* gitRepositoryWith({
    ".gitignore": "/target/\n.cache/\n**/src-tauri/cuda/\n**/shots-*/raw/\n",
    "apps/game/.gitignore": ".godot/\n",
    "apps/game/src-tauri/src/main.rs": "",
    "apps/viewer/src-tauri/Cargo.toml": "",
    "libs/engine/src/lib.rs": "",
  });
  const ignored = yield* collectPlacedIgnoredDirectories(root);
  expect(ignored).toStrictEqual([
    { pattern: "!target", base: "workspace" },
    { pattern: "!target/**", base: "workspace" },
    { pattern: "!apps/game/src-tauri/cuda", base: "workspace" },
    { pattern: "!apps/game/src-tauri/cuda/**", base: "workspace" },
    { pattern: "!apps/viewer/src-tauri/cuda", base: "workspace" },
    { pattern: "!apps/viewer/src-tauri/cuda/**", base: "workspace" },
    { pattern: "!apps/game/**/.godot", base: "workspace" },
    { pattern: "!apps/game/**/.godot/**", base: "workspace" },
  ]);
});

layer(fixtureLayer)("ignored directories", (it) => {
  it.effect(
    "places a rule for any depth under each listed directory its parent names and drops the rules that name no parent",
    () => placesAnywhereRules,
  );
  it.effect(
    "excludes every named directory when none of them holds a listed file",
    () => excludesEveryNamedDirectory,
  );
  it.effect(
    "turns the directories each .gitignore names and the cache directories of Vite into exclusions of the directory and its contents and keeps any that hold listed files",
    () => excludesIgnoredDirectories,
  );
});
