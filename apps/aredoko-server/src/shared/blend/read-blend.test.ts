import { NodeServices } from "@effect/platform-node";
import { expect, layer } from "@effect/vitest";
import { Effect, Option, Path } from "effect";
import sharp from "sharp";

import { blendPreview } from "./read-blend.ts";

const THUMBNAIL_SIDE = 128;
const NO_SIZE = [Number.NaN, Number.NaN] as const;

const fixturePath = Effect.gen(function* fixturePath() {
  const path = yield* Path.Path;
  return path.join(import.meta.dirname, "fixtures", "cube.blend");
});

const sizeOf = Effect.fn("sizeOf")(function* sizeOf(png: Uint8Array) {
  const { width, height } = yield* Effect.promise(() => sharp(png).metadata());
  return [width, height] as const;
});

const sizeOrNone = (
  png: Option.Option<Uint8Array>,
): Effect.Effect<readonly [number | undefined, number | undefined]> =>
  Option.match(png, { onNone: () => Effect.succeed(NO_SIZE), onSome: sizeOf });

layer(NodeServices.layer)("blendPreview", (it) => {
  it.effect("reads the thumbnail Blender saved in a compressed .blend", () =>
    Effect.gen(function* test() {
      const fixture = yield* fixturePath;
      const png = yield* blendPreview(fixture);
      const size = yield* sizeOrNone(png);
      expect(size).toStrictEqual([THUMBNAIL_SIDE, THUMBNAIL_SIDE]);
    }),
  );
});
