import { Array as Arr, Record as Rec, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { techniqueList } from "#/entities/technique";

const shaders = import.meta.glob("../shaders/*.frag");

test("すべての手法にセイキンダンス版の効果がある", () => {
  expect(
    pipe(
      techniqueList,
      Arr.map(({ slug }) => slug),
      Arr.filter((slug) => !Rec.has(shaders, `../shaders/${slug}.frag`)),
    ),
  ).toStrictEqual([]);
});
