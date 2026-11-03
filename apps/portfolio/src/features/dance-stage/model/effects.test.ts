import { Array as Arr, Record as Rec, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { techniqueList } from "#/entities/technique";

const shaders = import.meta.glob("../shaders/*.frag");

test("すべての手法にセイキンダンス版の効果がある", () => {
  expect(
    pipe(
      techniqueList,
      Arr.map(({ slug }) => `../shaders/${slug}.frag`),
      Arr.filter((path) => !Rec.has(shaders, path)),
    ),
  ).toStrictEqual([]);
});
