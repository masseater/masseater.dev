import { Array, Effect, Option, Path, String, pipe } from "effect";

import { glbOf } from "./blend-glb.ts";
import { imagesOf } from "./blend-material.ts";
import { sceneOf } from "./blend-scene.ts";
import { openBlend } from "./blend-structs.ts";
import { texturesOf } from "./blend-textures.ts";
import { BlendUnreadable } from "./blend-unreadable.ts";
import { plainFile } from "./read-blend.ts";

const blendFile = Effect.fn("blendFile")(function* blendFile(path: string) {
  const plain = yield* plainFile(path);
  return yield* Effect.fromOption(openBlend(plain)).pipe(
    Effect.mapError((cause) => BlendUnreadable.make({ path, cause })),
  );
});

/** @internal */
export const blendImageNames = Effect.fn("blendImageNames")(function* blendImageNames(
  path: string,
) {
  const paths = yield* Path.Path;
  const file = yield* blendFile(path);
  return pipe(
    imagesOf(file),
    Array.filter(({ packed }) => Option.isNone(packed)),
    Array.map(({ filepath }) => paths.basename(pipe(filepath, String.replaceAll("\\", "/")))),
    Array.filter(String.isNonEmpty),
    Array.dedupe,
  );
});

/** @internal */
export const blendModel = Effect.fn("blendModel")(function* blendModel(path: string) {
  const file = yield* blendFile(path);
  const parts = sceneOf(file);
  const pngs = yield* texturesOf(path, parts);
  return yield* glbOf(parts, pngs);
});
