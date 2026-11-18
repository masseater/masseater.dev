import type { GraphEdge } from "@r_masseater/wism";
import { Array as Arr, String as Str, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { rustCrate, skill, workspace } from "#/entities/kind/index.ts";
import { makeLayout } from "#/entities/layout/index.ts";
import type { Finding } from "#/shared/lib/finding.ts";

import {
  CROSS_SLICE,
  LAYER_IMPORT,
  LINK_TARGET,
  PUBLIC_API,
  WILDCARD_EXPORT,
  checkImports,
} from "./imports.ts";

const FILES: readonly string[] = [
  "libs/kit/package.json",
  "libs/kit/README.md",
  "libs/kit/src/app/index.ts",
  "libs/kit/src/features/run-kit/index.ts",
  "libs/kit/src/features/run-kit/model/run.ts",
  "libs/kit/src/features/read-kit/index.ts",
  "libs/kit/src/entities/job/index.ts",
  "libs/kit/src/entities/job/model/job.ts",
  "libs/kit/src/entities/job/@x/user.ts",
  "libs/kit/src/entities/user/index.ts",
  "libs/kit/src/shared/lib/text.ts",
  "libs/kit/src/shared/config/types.ts",
  "libs/kit/CHANGELOG.md",
  "crates/core/Cargo.toml",
  "crates/core/src/features/sync_notes/mod.rs",
  "crates/core/src/entities/note.rs",
  "crates/core/src/features/read_notes/mod.rs",
];

const layout = makeLayout([workspace(), rustCrate(), skill()])(FILES);

const file = (from: string, to: string, wildcard = false): GraphEdge => ({
  from,
  specifier: to,
  target: { type: "file", value: to },
  line: 1,
  column: 1,
  wildcard,
});

const module = (from: string, path: readonly string[]): GraphEdge => ({
  from,
  specifier: Arr.join(path, "::"),
  target: { type: "module", value: path },
  line: 1,
  column: 1,
  wildcard: false,
});

const check = (edges: readonly GraphEdge[]): readonly Finding[] => checkImports(edges)(layout);

const rules = (edges: readonly GraphEdge[]): readonly string[] =>
  pipe(
    check(edges),
    Arr.map(({ rule }) => rule),
  );

test("accepts imports down the layers through public APIs", () => {
  expect(
    rules([
      file("libs/kit/src/app/index.ts", "libs/kit/src/features/run-kit/index.ts"),
      file("libs/kit/src/features/run-kit/model/run.ts", "libs/kit/src/entities/job/index.ts"),
      file("libs/kit/src/features/run-kit/index.ts", "libs/kit/src/features/run-kit/model/run.ts"),
      file("libs/kit/src/entities/user/index.ts", "libs/kit/src/entities/job/@x/user.ts"),
      file("libs/kit/src/entities/job/model/job.ts", "libs/kit/src/shared/lib/text.ts"),
      file("libs/kit/README.md", "libs/kit/src/app/index.ts"),
      module("crates/core/src/features/sync_notes/mod.rs", ["entities", "note", "Note"]),
    ]),
  ).toStrictEqual([]);
});

test("reports imports against the layers", () => {
  expect(
    rules([
      file("libs/kit/src/entities/job/model/job.ts", "libs/kit/src/features/run-kit/index.ts"),
      file("libs/kit/src/features/run-kit/model/run.ts", "libs/kit/src/features/read-kit/index.ts"),
      file("libs/kit/src/app/index.ts", "libs/kit/src/entities/job/model/job.ts"),
      file("libs/kit/src/entities/job/index.ts", "libs/kit/src/entities/job/model/job.ts", true),
      file("libs/kit/README.md", "libs/kit/docs/missing.md"),
      module("crates/core/src/entities/note.rs", ["features", "sync_notes", "sync"]),
    ]),
  ).toStrictEqual([
    LAYER_IMPORT,
    CROSS_SLICE,
    PUBLIC_API,
    WILDCARD_EXPORT,
    LINK_TARGET,
    LAYER_IMPORT,
  ]);
});

test("allows cross imports only through the matching @x file", () => {
  expect(
    rules([
      file("libs/kit/src/entities/user/index.ts", "libs/kit/src/entities/job/@x/user.ts"),
      file("libs/kit/src/features/run-kit/model/run.ts", "libs/kit/src/entities/job/@x/user.ts"),
    ]),
  ).toStrictEqual([PUBLIC_API]);
});

test("reports slices of one layer that use each other", () => {
  expect(
    rules([
      file("libs/kit/src/features/read-kit/index.ts", "libs/kit/src/features/run-kit/index.ts"),
    ]),
  ).toStrictEqual([CROSS_SLICE]);
});

test("lets open segments be imported past their entry", () => {
  expect(
    rules([
      file("libs/kit/src/entities/user/index.ts", "libs/kit/src/shared/lib/text.ts"),
      file("libs/kit/src/entities/user/index.ts", "libs/kit/src/shared/config/types.ts"),
    ]),
  ).toStrictEqual([PUBLIC_API]);
});

test("reports wildcard exports only in entry files", () => {
  expect(
    rules([
      file("libs/kit/src/entities/job/index.ts", "libs/kit/src/entities/job/model/job.ts", true),
      file("libs/kit/src/entities/job/model/job.ts", "libs/kit/src/shared/lib/text.ts", true),
    ]),
  ).toStrictEqual([WILDCARD_EXPORT]);
});

test("checks Markdown links against files and directories", () => {
  expect(
    rules([
      file("libs/kit/README.md", "libs/kit/src"),
      file("libs/kit/README.md", "libs/kit/src/entities/job/index.ts"),
      file("libs/kit/README.md", "libs/kit/CHANGELOG.md"),
      file("libs/kit/README.md", "../outside.md"),
    ]),
  ).toStrictEqual([LINK_TARGET]);
});

test("ignores imports that leave the instance", () => {
  expect(
    rules([
      file("libs/kit/src/entities/job/model/job.ts", "crates/core/src/features/sync_notes/mod.rs"),
    ]),
  ).toStrictEqual([]);
});

test("checks Rust paths between slices and layers", () => {
  expect(
    rules([
      module("crates/core/src/features/sync_notes/mod.rs", ["features", "read_notes", "read"]),
      module("crates/core/src/features/sync_notes/mod.rs", ["features", "sync_notes", "inner"]),
      module("crates/core/src/entities/note.rs", ["app", "run"]),
      module("crates/core/src/entities/note.rs", ["std"]),
      module("crates/core/src/entities/note.rs", ["helpers", "run"]),
    ]),
  ).toStrictEqual([CROSS_SLICE, LAYER_IMPORT]);
});

test("reports where the import is written", () => {
  const upward: GraphEdge = {
    ...file("libs/kit/src/entities/job/model/job.ts", "libs/kit/src/app/index.ts"),
    specifier: "#/app/index.ts",
    line: 7,
    column: 21,
  };
  const found = check([upward]);
  expect(
    pipe(
      found,
      Arr.map(({ path, line, column, rule }) => ({ path, line, column, rule })),
    ),
  ).toStrictEqual([
    { path: "libs/kit/src/entities/job/model/job.ts", line: 7, column: 21, rule: LAYER_IMPORT },
  ]);
  expect(
    pipe(
      found,
      Arr.every(({ message }) => Str.includes("#/app/index.ts")(message)),
    ),
  ).toBe(true);
});
