import { Array as Arr, Effect, Schema, pipe } from "effect";
import { decode, encode } from "fast-png";
import { expect, test } from "vite-plus/test";

import { INVOICE_FIELDS } from "./fields.ts";
import type { Fragment } from "./fragment.ts";
import { extractFromImage, rereadLowConfidence } from "./generate.ts";
import { ImageError } from "./image-error.ts";
import { ModelApi } from "./model-api.ts";
import type { Part } from "./model-api.ts";

const SIZE = { width: 2, height: 2 } as const;

const WHOLE = { x0: 0, y0: 0, x1: SIZE.width, y1: SIZE.height } as const;

const UNSURE: readonly Fragment[] = [{ text: "合計", confidence: 0.1, box: WHOLE }];

const JPEG = Uint8Array.from(Buffer.from("/9j/4AAQSkZJRgABAQAAAQABAAA=", "base64"));

const STEP = 15_000;

const FIRST = 1;

const DEEP = Arr.makeBy(SIZE.width * SIZE.height, (index) => (index + FIRST) * STEP);

const DEEP_SAMPLES = Uint16Array.from(DEEP);

const DEEP_PNG = encode({ ...SIZE, data: DEEP_SAMPLES, channels: 1, depth: 16 });

const FULL = 255;

const NONE = 0;

const RED = [FULL, NONE, NONE];

const BLUE = [NONE, NONE, FULL];

const INDEX = { red: 0, blue: 1 } as const;

const INDEXES = Uint8Array.from([INDEX.red, INDEX.blue, INDEX.blue, INDEX.red]);

const INDEXED_PNG = encode({
  ...SIZE,
  data: INDEXES,
  channels: 1,
  depth: 8,
  palette: [RED, BLUE],
});

const NO_COST = 0;

const LinesJson = Schema.fromJsonString(Schema.Struct({ lines: Schema.Array(Schema.String) }));

const samplesOf = (samples: readonly number[]): string =>
  pipe(
    samples,
    Arr.map((sample) => `${sample}`),
    Arr.join(" "),
  );

const seenIn = (part: Part): readonly string[] => {
  if (part.type === "text") {
    return [];
  }
  const { depth, channels, data } = decode(part.png);
  return [`${depth} bit, ${channels} channels, ${samplesOf([...data])}`];
};

const contentOf = (parts: readonly Part[]): Effect.Effect<string> => {
  const lines = pipe(parts, Arr.flatMap(seenIn));
  return Effect.orDie(Schema.encodeEffect(LinesJson)({ lines }));
};

const echo = ModelApi.of({
  choose: () => Effect.die("unused"),
  probability: () => Effect.die("unused"),
  generateJson: ({ parts }) =>
    Effect.map(contentOf(parts), (content) => ({ content, costUsd: NO_COST })),
});

const reread = (image: Uint8Array): Effect.Effect<readonly string[], ImageError> =>
  rereadLowConfidence({ image, fragments: UNSURE }).pipe(
    Effect.map(({ fragments }) =>
      pipe(
        fragments,
        Arr.map(({ text }) => text),
      ),
    ),
    Effect.provideService(ModelApi, echo),
    Effect.catchTag("ModelError", Effect.die),
  );

const failureOf = <Value, Failure>(effect: Effect.Effect<Value, Failure>): Promise<Failure> =>
  Effect.runPromise(Effect.flip(effect));

test("fails with ImageError instead of throwing when the image is not a PNG", () =>
  expect(failureOf(reread(JPEG))).resolves.toBeInstanceOf(ImageError));

test("keeps 16-bit samples in the line it cuts out", () =>
  expect(Effect.runPromise(reread(DEEP_PNG))).resolves.toEqual([
    `16 bit, 1 channels, ${samplesOf(DEEP)}`,
  ]));

test("turns palette indexes into colours in the line it cuts out", () =>
  expect(Effect.runPromise(reread(INDEXED_PNG))).resolves.toEqual([
    `8 bit, 3 channels, ${samplesOf([...RED, ...BLUE, ...BLUE, ...RED])}`,
  ]));

test("does not send an image that is not a PNG to the model as image/png", () => {
  const extracted = extractFromImage({ image: JPEG, fields: INVOICE_FIELDS }).pipe(
    Effect.provideService(ModelApi, echo),
  );
  return expect(failureOf(extracted)).resolves.toBeInstanceOf(ImageError);
});
