import { Array as Arr, Option, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { rustCrate, skill, workspace } from "#/entities/kind/@x/layout.ts";
import type { Kind } from "#/entities/kind/@x/layout.ts";

import { makeLayout } from "./layout.ts";
import type { Position } from "./position.ts";

const FILES: readonly string[] = [
  "package.json",
  "src/app/index.ts",
  "libs/kit/package.json",
  "libs/kit/src/features/auth/login/index.ts",
  "libs/kit/src/features/auth/login/model/run.ts",
  "libs/kit/src/entities/job/index.ts",
  "libs/kit/src/shared/lib/text.ts",
  "libs/kit/native/Cargo.toml",
  "libs/kit/native/src/lib.rs",
  "libs/kit/native/src/features/sync_notes/mod.rs",
  "libs/kit/native/src/shared/text.rs",
  "skills/write/SKILL.md",
];

const KINDS: readonly Kind[] = [workspace(), rustCrate(), skill()];

const layout = makeLayout(KINDS)(FILES);

const layer = (name: string, slice?: string, inner?: string): Position => ({
  type: "layer",
  layer: name,
  slice: Option.fromNullishOr(slice),
  inner: Option.fromNullishOr(inner),
});

const positions = (path: string): readonly (readonly [string, Position])[] =>
  pipe(
    layout.located(path),
    Arr.map(({ instance, position }) => [instance.dir, position] as const),
  );

test("finds markers at the root and in nested directories", () => {
  expect(
    pipe(
      layout.instances,
      Arr.map(({ kind, dir }) => [kind.name, dir]),
    ),
  ).toStrictEqual([
    ["workspace", ""],
    ["workspace", "libs/kit"],
    ["crate", "libs/kit/native"],
    ["skill", "skills/write"],
  ]);
});

test("places files in layers, slices and segments", () => {
  expect(positions("src/app/index.ts")).toStrictEqual([["", layer("app")]]);
  expect(positions("libs/kit/src/entities/job/index.ts")).toStrictEqual([
    ["libs/kit", layer("entities", "job", "index.ts")],
  ]);
  expect(positions("libs/kit/src/shared/lib/text.ts")).toStrictEqual([
    ["libs/kit", layer("shared", "lib", "text.ts")],
  ]);
});

test("treats a directory with an entry file as a grouped slice", () => {
  expect(positions("libs/kit/src/features/auth/login/model/run.ts")).toStrictEqual([
    ["libs/kit", layer("features", "auth/login", "model/run.ts")],
  ]);
});

test("places Rust modules by file and directory", () => {
  expect(positions("libs/kit/native/src/lib.rs")).toStrictEqual([
    ["libs/kit/native", { type: "root" }],
  ]);
  expect(positions("libs/kit/native/src/features/sync_notes/mod.rs")).toStrictEqual([
    ["libs/kit/native", layer("features", "sync_notes", "mod.rs")],
  ]);
  expect(positions("libs/kit/native/src/shared/text.rs")).toStrictEqual([
    ["libs/kit/native", layer("shared", "text")],
  ]);
  expect(positions("libs/kit/native/src/features.rs")).toStrictEqual([
    ["libs/kit/native", layer("features")],
  ]);
  expect(positions("libs/kit/native/src/util.rs")).toStrictEqual([
    ["libs/kit/native", { type: "unknownLayer", layer: "util" }],
  ]);
});

test("tells loose, outside and ignored files apart", () => {
  expect(positions("libs/kit/src/index.ts")).toStrictEqual([["libs/kit", { type: "loose" }]]);
  expect(positions("libs/kit/src/utils/a.ts")).toStrictEqual([
    ["libs/kit", { type: "unknownLayer", layer: "utils" }],
  ]);
  expect(positions("libs/kit/bin/kit.ts")).toStrictEqual([["libs/kit", { type: "outside" }]]);
  expect(positions("libs/kit/README.md")).toStrictEqual([["libs/kit", { type: "ignored" }]]);
  expect(positions("skills/write/SKILL.md")).toStrictEqual([["skills/write", { type: "ignored" }]]);
});

test("limits a kind to its paths", () => {
  const limited = makeLayout([workspace({ paths: ["libs/*"] })])(FILES);
  expect(
    pipe(
      limited.instances,
      Arr.map(({ dir }) => dir),
    ),
  ).toStrictEqual(["libs/kit"]);
  expect(limited.located("src/app/index.ts")).toStrictEqual([]);
});

test("knows which files and directories exist", () => {
  expect(
    pipe(
      [
        "libs/kit/src/entities/job/index.ts",
        "libs/kit/src/entities",
        "",
        "libs/kit/src/entities/user",
      ],
      Arr.map(layout.exists),
    ),
  ).toStrictEqual([true, true, true, false]);
});
