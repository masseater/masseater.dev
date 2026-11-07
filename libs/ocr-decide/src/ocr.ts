import { Effect, Array as Arr, String as Str, pipe } from "effect";
import type { WorkerOptions } from "tesseract.js";

import type { Fragment } from "./fragment.ts";
import { OcrError } from "./ocr-error.ts";

interface OcrRequest {
  readonly image: Uint8Array;
}

interface OcrOptions {
  readonly languages?: readonly string[];
  readonly worker?: Partial<WorkerOptions>;
}

const DEFAULT_LANGUAGES = ["jpn", "eng"] as const;

const PERCENT = 100;

const BLOCKS = { blocks: true } as const;

const SPACE_BETWEEN_CJK =
  /(?<=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー])\s+(?=[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}ー])/gu;

const failure = (cause: unknown): OcrError => OcrError.make({ reason: String(cause) });

const readFragments = ({
  image,
  languages = DEFAULT_LANGUAGES,
  worker = {},
}: OcrRequest & OcrOptions): Effect.Effect<readonly Fragment[], OcrError> =>
  Effect.acquireUseRelease(
    Effect.tryPromise({ try: () => import("tesseract.js"), catch: failure }).pipe(
      Effect.flatMap(({ OEM, createWorker }) =>
        Effect.tryPromise({
          try: () => createWorker([...languages], OEM.LSTM_ONLY, worker),
          catch: failure,
        }),
      ),
    ),
    (tesseract) =>
      Effect.tryPromise({ try: () => tesseract.recognize(image, {}, BLOCKS), catch: failure }),
    (tesseract) => Effect.promise(() => tesseract.terminate()),
  ).pipe(
    Effect.map(({ data }) =>
      pipe(
        data.blocks ?? [],
        Arr.flatMap((block) => block.paragraphs),
        Arr.flatMap((paragraph) => paragraph.lines),
        Arr.map((line) => ({
          text: pipe(line.text, Str.trim, Str.replaceAll(SPACE_BETWEEN_CJK, "")),
          confidence: line.confidence / PERCENT,
          box: line.bbox,
        })),
        Arr.filter(({ text }) => text !== ""),
      ),
    ),
    Effect.withSpan("ocr-decide.ocr"),
  );

export { readFragments };
export type { OcrOptions, OcrRequest };
