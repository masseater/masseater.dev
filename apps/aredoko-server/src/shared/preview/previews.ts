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

/** @internal */
const imagePreview = Effect.fn("imagePreview")(function* imagePreview(path: string) {
  const buffer = yield* Effect.tryPromise({
    try: () =>
      sharp(path)
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

export { imagePreview, pixelsPreview };
export type { Pixels };
