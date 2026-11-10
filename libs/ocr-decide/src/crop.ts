import { Array as Arr, Effect, Option, pipe } from "effect";
import { convertIndexedToRgb, decode, encode, hasPngSignature } from "fast-png";
import type { BitDepth, PngDataArray } from "fast-png";
import type { Rectangle } from "tesseract.js";

import type { Box } from "./fragment.ts";
import { ImageError } from "./image-error.ts";

const CROP_MARGIN = 4;

const ORIGIN = 0;

const BYTE = 8;

const NOT_PNG = "the image is not a PNG";

interface Pixels {
  readonly width: number;
  readonly height: number;
  readonly channels: number;
  readonly depth: BitDepth;
  readonly data: PngDataArray;
}

type Region = Readonly<Rectangle>;

const failure = (cause: unknown): ImageError => ImageError.make({ reason: String(cause) });

const asPng = (image: Uint8Array): Effect.Effect<Uint8Array, ImageError> => {
  if (hasPngSignature(image)) {
    return Effect.succeed(image);
  }
  return Effect.fail(ImageError.make({ reason: NOT_PNG }));
};

const pixelsIn = (png: Uint8Array): Pixels => {
  const decoded = decode(png);
  const { width, height } = decoded;
  return Option.fromNullishOr(decoded.palette).pipe(
    Option.match({
      onNone: (): Pixels => decoded,
      onSome: (): Pixels => {
        const data = convertIndexedToRgb(decoded);
        return { width, height, data, depth: BYTE, channels: data.length / (width * height) };
      },
    }),
  );
};

const regionOf = (size: Readonly<{ width: number; height: number }>, box: Box): Region => {
  const left = Math.max(ORIGIN, box.x0 - CROP_MARGIN);
  const top = Math.max(ORIGIN, box.y0 - CROP_MARGIN);
  return {
    left,
    top,
    width: Math.min(size.width, box.x1 + CROP_MARGIN) - left,
    height: Math.min(size.height, box.y1 + CROP_MARGIN) - top,
  };
};

const cutterOf = (png: Uint8Array): Effect.Effect<(box: Box) => Uint8Array, ImageError> =>
  Effect.try({ try: () => pixelsIn(png), catch: failure }).pipe(
    Effect.filterOrFail(
      ({ depth }) => depth >= BYTE,
      ({ depth }) => ImageError.make({ reason: `a ${depth}-bit PNG is not supported` }),
    ),
    Effect.map((pixels) => (box: Box): Uint8Array => {
      const { channels, depth } = pixels;
      const { left, top, width, height } = regionOf(pixels, box);
      const rowLength = width * channels;
      const data = pixels.data.slice(ORIGIN, rowLength * height);
      const rows = Arr.makeBy(height, (row) => {
        const start = ((top + row) * pixels.width + left) * channels;
        return pixels.data.subarray(start, start + rowLength);
      });
      for (const [row, line] of rows.entries()) {
        data.set(line, row * rowLength);
      }
      return encode({ width, height, data, channels, depth });
    }),
  );

const cropPng =
  (image: Uint8Array) =>
  (boxes: readonly Box[]): Effect.Effect<readonly Uint8Array[], ImageError> =>
    asPng(image).pipe(
      Effect.flatMap(cutterOf),
      Effect.flatMap((cut) => Effect.try({ try: () => pipe(boxes, Arr.map(cut)), catch: failure })),
    );

export { asPng, cropPng };
