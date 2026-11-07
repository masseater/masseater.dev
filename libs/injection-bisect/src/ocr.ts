import { Effect, Array as Arr, pipe } from "effect";
import { OEM, createWorker } from "tesseract.js";
import type { WorkerOptions } from "tesseract.js";

import type { Reader } from "./parser.ts";
import type { ReadError } from "./read-error.ts";
import { readErrorOf } from "./read-error.ts";

interface OcrOptions {
  readonly languages?: readonly string[];
  readonly worker?: Partial<WorkerOptions>;
}

const DEFAULT_LANGUAGES = ["jpn", "eng"] as const;

const PAGE_BREAK = "\n\n";

const ONE_AT_A_TIME = { concurrency: 1 } as const;

const recognizedText =
  ({ languages = DEFAULT_LANGUAGES, worker = {} }: OcrOptions) =>
  (images: readonly Uint8Array[]): Effect.Effect<string, ReadError> =>
    Effect.acquireUseRelease(
      Effect.tryPromise({
        try: () => createWorker([...languages], OEM.LSTM_ONLY, worker),
        catch: readErrorOf,
      }),
      (tesseract) =>
        Effect.forEach(
          images,
          (image) =>
            Effect.tryPromise({ try: () => tesseract.recognize(image), catch: readErrorOf }),
          ONE_AT_A_TIME,
        ).pipe(
          Effect.map((results) =>
            pipe(
              results,
              Arr.map(({ data }) => data.text),
              Arr.join(PAGE_BREAK),
            ),
          ),
        ),
      (tesseract) => Effect.promise(() => tesseract.terminate()),
    ).pipe(Effect.withSpan("injection-bisect.ocr"));

const imageReaderOf = (options: OcrOptions): Reader => ({
  format: "image",
  extensions: [".png", ".jpg", ".jpeg", ".webp", ".gif", ".bmp", ".tif", ".tiff"],
  read: (bytes) =>
    recognizedText(options)([bytes]).pipe(Effect.map((text) => ({ text, format: "plain" }))),
});

export { ONE_AT_A_TIME, PAGE_BREAK, imageReaderOf, recognizedText };
export type { OcrOptions };
