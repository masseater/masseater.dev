import { layer } from "@effect/vitest";
import { Array as Arr, Effect, String as Str, pipe } from "effect";
import { expect } from "vite-plus/test";

import { RepositoryFiles } from "#/shared/lib/repository-files.ts";
import { fixtureLayer, gitRepositoryWith } from "#/shared/lib/repository.test.support.ts";

import { checkRustModules } from "./rust-modules.ts";

const CRATE = '[package]\nname = "kit"\n';

const locationsIn = Effect.fn("locationsIn")(function* locationsIn(
  contents: Readonly<Record<string, string>>,
) {
  const root = yield* gitRepositoryWith({ "kit/Cargo.toml": CRATE, ...contents });
  const files = yield* RepositoryFiles;
  const problems = yield* checkRustModules(root);
  const locations = pipe(
    problems,
    Arr.map(({ file, line, rule }) => `${rule} ${files.relative(root, file)}:${String(line)}`),
  );
  return Arr.sort(locations, Str.Order);
});

const acceptsLayeredCrates = Effect.gen(function* acceptsLayeredCrates() {
  const found = yield* locationsIn({
    "kit/build.rs": "fn main() {}\n",
    "kit/benches/render.rs": "fn main() {}\n",
    "kit/src/main.rs":
      "#![forbid(unsafe_code)]\nmod app;\nmod features;\nmod entities;\nmod shared;\nfn main() { app::run(); }\n",
    "kit/src/app/mod.rs": "mod entrypoint;\npub use entrypoint::run;\n",
    "kit/src/app/entrypoint.rs":
      "use crate::features::sync_notes::sync;\npub fn run() { sync(); crate::shared::lib::log(); }\n",
    "kit/src/features/mod.rs": "pub mod sync_notes;\n",
    "kit/src/features/sync_notes/mod.rs":
      "mod model;\npub use model::sync;\n#[cfg(test)]\nmod tests;\n",
    "kit/src/features/sync_notes/model.rs":
      "use super::super::super::entities::note::Note;\nuse crate::{entities::note, shared::lib};\npub fn sync() { lib::log(); let _ = Note; let _ = note::Note; }\n#[cfg(test)]\nmod tests { use super::*; }\n",
    "kit/src/features/sync_notes/tests.rs": "use super::sync;\n#[test]\nfn syncs() { sync(); }\n",
    "kit/src/entities/mod.rs": "pub mod note;\n",
    "kit/src/entities/note.rs": "pub struct Note;\n",
    "kit/src/shared/mod.rs": "pub mod lib;\npub mod config;\n",
    "kit/src/shared/lib.rs": "pub fn log() { crate::shared::config::level(); }\n",
    "kit/src/shared/config.rs": "pub fn level() {}\n",
    "kit/tests/no_alloc.rs":
      "#[global_allocator]\nstatic A: std::alloc::System = std::alloc::System;\n",
  });
  expect(found).toStrictEqual([]);
});

const reportsUnlayeredCrates = Effect.gen(function* reportsUnlayeredCrates() {
  const found = yield* locationsIn({
    "kit/conformance/lib.rs": "pub fn a() {}\n",
    "kit/src/lib.rs": "mod utils;\npub fn helper() {}\nmod features { }\n",
    "kit/src/utils.rs": "pub fn a() {}\n",
    "kit/src/features/mod.rs": "pub mod sync;\npub fn stray() {}\n",
    "kit/src/features/sync/mod.rs": "pub mod model;\n",
    "kit/src/features/sync/model.rs": "pub fn a() {}\n",
    "kit/tests/parity.rs": "#[test]\nfn parity() {}\n",
  });
  expect(found).toStrictEqual([
    "colocated-test kit/tests/parity.rs:1",
    "feature-slice-name kit/src/features/sync:1",
    "layered-source kit/src/features/mod.rs:2",
    "layered-source kit/src/lib.rs:1",
    "layered-source kit/src/lib.rs:2",
    "layered-source kit/src/lib.rs:3",
    "public-entry kit/src/features/sync/mod.rs:1",
  ]);
});

layer(fixtureLayer)("rust modules", (it) => {
  it.effect("accepts crates whose modules sit in FSD layers", () => acceptsLayeredCrates);
  it.effect(
    "reports code in crate and layer roots, public inner modules, misnamed feature slices and separate tests",
    () => reportsUnlayeredCrates,
  );
});
