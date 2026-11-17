import { Array as Arr, Order, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { rustCrate, skill, workspace } from "#/entities/kind/index.ts";
import { makeLayout } from "#/entities/layout/index.ts";

import { LAYER_NAME, LOOSE_FILE, PLACEMENT, checkPlacement } from "./placement.ts";

const KINDS = [workspace(), rustCrate(), skill()];

const found = (files: readonly string[]): readonly (readonly [string, string])[] =>
  pipe(
    checkPlacement(makeLayout(KINDS)(files)),
    Arr.map(({ path, rule }) => [path, rule] as const),
    Arr.sortWith(([path]) => path, Order.String),
  );

test("accepts layered workspaces and crates", () => {
  expect(
    found([
      "libs/kit/package.json",
      "libs/kit/vite.config.ts",
      "libs/kit/bin/kit.ts",
      "libs/kit/src/app/index.ts",
      "libs/kit/src/features/run-kit/index.ts",
      "libs/kit/src/shared/lib/text.ts",
      "crates/core/Cargo.toml",
      "crates/core/build.rs",
      "crates/core/src/lib.rs",
      "crates/core/src/features.rs",
      "crates/core/src/features/sync_notes/mod.rs",
      "skills/write/SKILL.md",
      "skills/write/references/style.md",
    ]),
  ).toStrictEqual([]);
});

test("reports files outside the layout once per place", () => {
  expect(
    found([
      "libs/kit/package.json",
      "libs/kit/kit.ts",
      "libs/kit/src/index.ts",
      "libs/kit/src/utils/a.ts",
      "libs/kit/src/utils/b.ts",
      "crates/core/Cargo.toml",
      "crates/core/conformance/lib.rs",
      "crates/core/src/utils.rs",
      "skills/write/SKILL.md",
      "skills/write/notes.txt",
    ]),
  ).toStrictEqual([
    ["crates/core/conformance/lib.rs", PLACEMENT],
    ["crates/core/src/utils.rs", LAYER_NAME],
    ["libs/kit/kit.ts", PLACEMENT],
    ["libs/kit/src/index.ts", LOOSE_FILE],
    ["libs/kit/src/utils", LAYER_NAME],
    ["skills/write/notes.txt", PLACEMENT],
  ]);
});

test("gives each file to the innermost marker", () => {
  expect(
    found([
      "libs/kit/package.json",
      "libs/kit/src/app/index.ts",
      "libs/kit/native/Cargo.toml",
      "libs/kit/native/src/lib.rs",
    ]),
  ).toStrictEqual([]);
});
