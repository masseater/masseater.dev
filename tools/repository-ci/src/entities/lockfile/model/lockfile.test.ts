import { Record as Rec, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { sameResolution } from "./lockfile.ts";
import type { Resolution } from "./lockfile.ts";

const lock = (
  packages: Readonly<Record<string, readonly [string, string]>>,
  overrides: Readonly<Record<string, string>> = {},
): Resolution => ({
  overrides,
  importers: {
    "apps/a": { dependencies: { left: "1.0.0" } },
    "apps/b": { dependencies: { right: "2.0.0", shared: "link:../../libs/shared" } },
  },
  packages: pipe(
    packages,
    Rec.map(([name, version]) => ({ dependencies: { [name]: version } })),
  ),
});

const before = lock({ "left@1.0.0": ["deep", "1.0.0"], "right@2.0.0": ["leaf", "1.0.0"] });

test("a bump that only another importer reaches leaves this importer unchanged", () => {
  const after = lock({ "left@1.0.0": ["deep", "1.0.0"], "right@2.0.0": ["leaf", "2.0.0"] });
  expect(sameResolution({ before, after, directories: ["apps/a"] })).toBe(true);
  expect(sameResolution({ before, after, directories: ["apps/b"] })).toBe(false);
});

test("a bump of a transitive dependency changes the importers that reach it", () => {
  const after = lock({ "left@1.0.0": ["deep", "1.0.1"], "right@2.0.0": ["leaf", "1.0.0"] });
  expect(sameResolution({ before, after, directories: ["apps/a"] })).toBe(false);
  expect(sameResolution({ before, after, directories: ["apps/b"] })).toBe(true);
});

test("an importer missing from both lockfiles counts as unchanged", () => {
  expect(sameResolution({ before, after: before, directories: ["apps/none"] })).toBe(true);
});

test("a change in the overrides changes every importer", () => {
  const after = lock(
    { "left@1.0.0": ["deep", "1.0.0"], "right@2.0.0": ["leaf", "1.0.0"] },
    { left: "2.0.0" },
  );
  expect(sameResolution({ before, after, directories: ["apps/a"] })).toBe(false);
});
