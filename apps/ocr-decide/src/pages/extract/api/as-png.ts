import { Effect, Schema } from "effect";

const PNG = "image/png";

const LONGEST_SIDE = 2000;

const ORIGIN = 0;

const FULL_SIZE = 1;

const taggedError = Schema.TaggedError;

class PictureError extends taggedError<PictureError, { readonly brand: unique symbol }>()(
  "PictureError",
  {
    reason: Schema.String,
  },
) {}

interface Loaded {
  readonly bytes: Uint8Array<ArrayBuffer>;
  readonly type: string;
}

const failure = (cause: unknown): PictureError => PictureError.make({ reason: String(cause) });

const sizeOf = ({
  width,
  height,
}: Readonly<{ width: number; height: number }>): Readonly<{ width: number; height: number }> => {
  const scale = Math.min(FULL_SIZE, LONGEST_SIDE / Math.max(width, height));
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

const drawn = (bitmap: ImageBitmap): Effect.Effect<OffscreenCanvas, PictureError> => {
  const { width, height } = sizeOf(bitmap);
  const canvas = new OffscreenCanvas(width, height);
  return Effect.fromNullishOr(canvas.getContext("2d")).pipe(
    Effect.mapBoth({
      onFailure: failure,
      onSuccess: (context) => {
        context.drawImage(bitmap, ORIGIN, ORIGIN, width, height);
        return canvas;
      },
    }),
  );
};

const redrawn = (bytes: Uint8Array<ArrayBuffer>): Effect.Effect<Uint8Array, PictureError> =>
  Effect.acquireUseRelease(
    Effect.tryPromise({ try: () => createImageBitmap(new Blob([bytes])), catch: failure }),
    drawn,
    (bitmap) =>
      Effect.sync(() => {
        bitmap.close();
      }),
  ).pipe(
    Effect.flatMap((canvas) =>
      Effect.tryPromise({ try: () => canvas.convertToBlob({ type: PNG }), catch: failure }),
    ),
    Effect.flatMap((png) => Effect.tryPromise({ try: () => png.arrayBuffer(), catch: failure })),
    Effect.map((buffer) => new Uint8Array(buffer)),
  );

const asPng = ({ bytes, type }: Loaded): Effect.Effect<Uint8Array, PictureError> => {
  if (type === PNG) {
    return Effect.succeed(bytes);
  }
  return redrawn(bytes);
};

export { asPng };
