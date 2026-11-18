import { Array as Arr, Option, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import type { NamedRef } from "#/features/audit-workflows/model/github.ts";

import { bestTag } from "./github-refs.ts";

const tags = (names: readonly (readonly [string, string])[]): readonly NamedRef[] =>
  pipe(
    names,
    Arr.map(([name, commit]) => ({ name, commit })),
  );

const MONOREPO = tags([
  ["allowlist-check/v1", "abcd"],
  ["allowlist-check/v1.0.0", "abcd"],
  ["restore/v1", "abcd"],
  ["restore/v1.0.0", "abcd"],
  ["save/v1", "abcd"],
  ["save/v1.0.0", "abcd"],
]);

const nameOf =
  (subpath: Option.Option<string>, commit: string) =>
  (from: readonly NamedRef[]): Option.Option<string> =>
    Option.map(bestTag(subpath)(commit)(from), (tag) => tag.name);

test.each([
  ["stash/save", "save/v1.0.0"],
  ["save", "save/v1.0.0"],
  ["stash/restore", "restore/v1.0.0"],
  ["restore", "restore/v1.0.0"],
  ["allowlist-check", "allowlist-check/v1.0.0"],
  ["pelican", "allowlist-check/v1.0.0"],
])("prefers tags under the subpath %s", (subpath, expected) => {
  expect(nameOf(Option.some(subpath), "abcd")(MONOREPO)).toStrictEqual(Option.some(expected));
});

test("prefers the longest plain tag", () => {
  const plain = tags([
    ["v1", "abcd"],
    ["v1.2.3", "abcd"],
    ["v2.0.0", "beef"],
  ]);
  expect(nameOf(Option.none(), "abcd")(plain)).toStrictEqual(Option.some("v1.2.3"));
  expect(nameOf(Option.some("sub"), "abcd")(plain)).toStrictEqual(Option.some("v1.2.3"));
  expect(nameOf(Option.none(), "dead")(plain)).toStrictEqual(Option.none());
});

test("prefers a tag without a slash when there is no subpath", () => {
  const mixed = tags([
    ["v1.0.0", "abcd"],
    ["some-action/v1.0.0", "abcd"],
  ]);
  expect(nameOf(Option.none(), "abcd")(mixed)).toStrictEqual(Option.some("v1.0.0"));
});
