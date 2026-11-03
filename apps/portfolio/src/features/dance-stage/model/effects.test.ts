import { Array as Arr, Option, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { techniqueList } from "#/entities/technique";

import { findEffect } from "./effects";

test("すべての手法にセイキンダンス版の効果がある", () => {
  expect(
    pipe(
      techniqueList,
      Arr.map(({ slug }) => slug),
      Arr.filter((slug) => Option.isNone(findEffect(slug))),
    ),
  ).toStrictEqual([]);
});
