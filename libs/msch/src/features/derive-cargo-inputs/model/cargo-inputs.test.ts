import { it } from "@effect/vitest";
import { Array as Arr, Effect, Predicate, Schema, pipe } from "effect";
import { expect } from "vite-plus/test";

import { cargoInputsOf } from "./cargo-inputs.ts";
import type { CargoInput } from "./cargo-inputs.ts";
import { CargoWorkspaceSchema } from "./cargo-metadata.ts";

const ROOT = "/repo";
const REGISTRY = "registry+https://github.com/rust-lang/crates.io-index";
const SHELL = `path+file://${ROOT}/libs/shell#shell@0.0.0`;
const NOTES = `path+file://${ROOT}/libs/notes#notes@0.0.0`;
const APP = `path+file://${ROOT}/apps/app/src-tauri#app@0.0.0`;
const SERDE = `${REGISTRY}#serde@1.0.0`;
const TAURI = `${REGISTRY}#tauri@2.0.0`;
const MANIFEST = `{"workspace":{"resolver":"3","members":["libs/shell"],"exclude":["patches"]},"profile":{"dev":{"debug":0,"package":{"serde":{"opt-level":3},"tauri@2.0.0":{"opt-level":3},"*":{"debug":1}}}}}`;
const NOTES_MANIFEST = `{"workspace":{"resolver":"3"},"profile":{"dev":{"debug":0,"package":{"serde":{"opt-level":3},"*":{"debug":1}}}}}`;
const EMPTY_MANIFEST = "{}";

const FIXTURE = `{
  "metadata": {
    "packages": [
      { "id": "${SHELL}", "name": "shell", "manifest_path": "${ROOT}/libs/shell/Cargo.toml", "source": null },
      { "id": "${NOTES}", "name": "notes", "manifest_path": "${ROOT}/libs/notes/Cargo.toml", "source": null },
      { "id": "${APP}", "name": "app", "manifest_path": "${ROOT}/apps/app/src-tauri/Cargo.toml", "source": null },
      { "id": "${SERDE}", "name": "serde", "manifest_path": "${ROOT}/.pnpm/crates/serde-1.0.0/Cargo.toml", "source": "${REGISTRY}" },
      { "id": "${TAURI}", "name": "tauri", "manifest_path": "${ROOT}/.pnpm/crates/tauri-2.0.0/Cargo.toml", "source": "${REGISTRY}" }
    ],
    "resolve": {
      "nodes": [
        { "id": "${SHELL}", "deps": [{ "pkg": "${SERDE}" }] },
        { "id": "${NOTES}", "deps": [{ "pkg": "${SHELL}" }] },
        { "id": "${APP}", "deps": [{ "pkg": "${NOTES}" }, { "pkg": "${TAURI}" }] },
        { "id": "${SERDE}", "deps": [] },
        { "id": "${TAURI}", "deps": [{ "pkg": "${SERDE}" }] }
      ]
    },
    "workspace_members": ["${SHELL}", "${NOTES}", "${APP}"],
    "workspace_root": "${ROOT}"
  },
  "manifest": "{}",
  "ignored": [
    { "pattern": "!.pnpm", "base": "workspace" },
    { "pattern": "!**/.cache", "base": "workspace" },
    { "pattern": "!apps/app/src-tauri/gen", "base": "workspace" },
    { "pattern": "!apps/other/out", "base": "workspace" },
    { "pattern": "!libs/notes/reference", "base": "workspace" }
  ]
}`;

const decodeWorkspace = Schema.decodeUnknownEffect(Schema.fromJsonString(CargoWorkspaceSchema));

const patternsOf = (inputs: readonly CargoInput[]): readonly string[] =>
  pipe(
    inputs,
    Arr.filter(
      (input): input is Extract<CargoInput, { readonly pattern: string }> => "pattern" in input,
    ),
    Arr.map(({ pattern }) => pattern),
    Arr.filter(Predicate.isString),
  );

const derive = Effect.fn("derive")(function* derive(directory: string, extras: readonly string[]) {
  const workspace = yield* decodeWorkspace(FIXTURE);
  return cargoInputsOf({ workspace, directory: `${ROOT}/${directory}`, extras });
});

it.effect("keys a crate on its own path dependencies and the ids of its registry closure", () =>
  Effect.gen(function* keysOnClosure() {
    const derived = yield* derive("libs/notes", []);
    expect(patternsOf(derived.inputs)).toStrictEqual([
      "libs/notes/**",
      "libs/shell/**",
      "node_modules/.cache/msch/cargo-inputs/libs__notes.lock",
      "rust-toolchain.toml",
      ".cargo/**",
      "!libs/notes/reference",
      "!libs/notes/**/node_modules/**",
      "!libs/notes/**/dist/**",
      "!libs/shell/**/node_modules/**",
      "!libs/shell/**/dist/**",
    ]);
    expect(derived.closure).toBe(`${SERDE}\n${EMPTY_MANIFEST}`);
  }),
);

it.effect("leaves out crates that only other crates depend on", () =>
  Effect.gen(function* leavesOutDependents() {
    const derived = yield* derive("libs/shell", []);
    expect(patternsOf(derived.inputs)).not.toContain("libs/notes/**");
    expect(derived.closure).toBe(`${SERDE}\n${EMPTY_MANIFEST}`);
  }),
);

it.effect("covers the crates under an app directory and only the ignored directories in them", () =>
  Effect.gen(function* coversAppCrates() {
    const derived = yield* derive("apps/app", ["!src-tauri/permissions/**"]);
    const patterns = patternsOf(derived.inputs);
    expect(patterns).toContain("apps/app/src-tauri/**");
    expect(patterns).toContain("!apps/app/src-tauri/gen");
    expect(patterns).toContain("!apps/app/src-tauri/permissions/**");
    expect(patterns).not.toContain("!apps/other/out");
    expect(patterns).not.toContain("!.pnpm");
    expect(derived.closure).toBe(`${SERDE}\n${TAURI}\n${EMPTY_MANIFEST}`);
  }),
);

it.effect("keeps an ignored directory that an extra input asks for", () =>
  Effect.gen(function* keepsExtras() {
    const derived = yield* derive("libs/notes", ["reference/**"]);
    const patterns = patternsOf(derived.inputs);
    expect(patterns).toContain("libs/notes/reference/**");
    expect(patterns).not.toContain("!libs/notes/reference");
  }),
);

it.effect(
  "keys a crate on the root manifest without the member lists and other crates' profiles",
  () =>
    Effect.gen(function* keysOnManifest() {
      const workspace = yield* decodeWorkspace(FIXTURE);
      const derived = cargoInputsOf({
        workspace: { ...workspace, manifest: MANIFEST },
        directory: `${ROOT}/libs/notes`,
        extras: [],
      });
      expect(patternsOf(derived.inputs)).not.toContain("Cargo.toml");
      expect(derived.closure).toBe(`${SERDE}\n${NOTES_MANIFEST}`);
    }),
);
