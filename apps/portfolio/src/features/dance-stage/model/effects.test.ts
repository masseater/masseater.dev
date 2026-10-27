import { Array as Arr, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { techniqueList } from "#/entities/technique";

import { hasEffect } from "./effects";

test("すべての手法にセイキンダンス版の効果がある", () => {
  expect(
    pipe(
      techniqueList,
      Arr.filter(({ slug }) => !hasEffect(slug)),
      Arr.map(({ slug }) => slug),
    ),
  ).toStrictEqual([]);
});
