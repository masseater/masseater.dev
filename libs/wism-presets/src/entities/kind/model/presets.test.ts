import { Array as Arr, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { FSD_LAYERS, rustCrate, skill, workspace } from "./presets.ts";

test("adds paths only when they are given", () => {
  expect(workspace()).not.toHaveProperty("paths");
  expect(workspace({ paths: ["libs/*"] })).toHaveProperty("paths", ["libs/*"]);
  expect(rustCrate({ paths: ["crates/*"] })).toHaveProperty("paths", ["crates/*"]);
  expect(skill({ paths: ["skills/*"] })).toHaveProperty("paths", ["skills/*"]);
});

test("names each kind by its marker file", () => {
  expect(
    pipe(
      [workspace(), rustCrate(), skill()],
      Arr.map(({ name, marker }) => [name, marker]),
    ),
  ).toStrictEqual([
    ["workspace", "package.json"],
    ["crate", "Cargo.toml"],
    ["skill", "SKILL.md"],
  ]);
});

test("lays out workspaces and crates in the FSD layers", () => {
  expect(FSD_LAYERS).toStrictEqual(["app", "pages", "widgets", "features", "entities", "shared"]);
  expect(workspace()).toHaveProperty("layers.order", FSD_LAYERS);
  expect(rustCrate()).toHaveProperty("layers.moduleFiles", true);
  expect(skill()).not.toHaveProperty("layers");
  expect(workspace({ paths: ["libs/*"] })).toHaveProperty("paths", ["libs/*"]);
});
