import { Effect } from "effect";
import sharp from "sharp";

import { PreviewFailed } from "./preview-failed.ts";

const PREVIEW_SIDE = 512;
const CHANNELS = 4;

interface Pixels {
  readonly width: number;
  readonly height: number;
  readonly rgba: Uint8Array;
}

const fitted = Effect.fn("fitted")(function* fitted(path: string, input: string | Uint8Array) {
  const buffer = yield* Effect.tryPromise({
    try: () =>
      sharp(input)
        .rotate()
        .resize({
          width: PREVIEW_SIDE,
          height: PREVIEW_SIDE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png()
        .toBuffer(),
    catch: (cause) => PreviewFailed.make({ path, cause }),
  });
  return Uint8Array.from(buffer);
});

/** @internal */
const imagePreview = Effect.fn("imagePreview")(function* imagePreview(path: string) {
  return yield* fitted(path, path);
});

/** @internal */
const normalizePng = Effect.fn("normalizePng")(function* normalizePng(
  path: string,
  image: Uint8Array,
) {
  return yield* fitted(path, image);
});

/** @internal */
const pixelsPreview = Effect.fn("pixelsPreview")(function* pixelsPreview(
  path: string,
  { width, height, rgba }: Pixels,
) {
  const buffer = yield* Effect.tryPromise({
    try: () =>
      sharp(rgba, { raw: { width, height, channels: CHANNELS } })
        .flip()
        .png()
        .toBuffer(),
    catch: (cause) => PreviewFailed.make({ path, cause }),
  });
  return Uint8Array.from(buffer);
});

export { imagePreview, normalizePng, pixelsPreview };
export type { Pixels };
