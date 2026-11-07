import { Array as Arr, Effect, Option, Schema, Record as Rec, String as Str, pipe } from "effect";
import { decode, encode } from "fast-png";

import { MISSING } from "./fragment.ts";
import type { Box, Extraction, Field, FieldValue, Fragment } from "./fragment.ts";
import { ModelApi } from "./model-api.ts";
import type { Part } from "./model-api.ts";
import { ModelError } from "./model-error.ts";

const DEFAULT_GENERATOR_MODEL = "google/gemini-3.5-flash-lite";

const REREAD_BELOW = 0.8;

const CROP_MARGIN = 4;

const BIT_DEPTH = 8;

const NOTHING_REREAD = 0;

const ORIGIN = 0;

const FIRST_LINE = 1;

const text = (value: string): Part => ({ type: "text", text: value });

const png = (value: Uint8Array): Part => ({ type: "png", png: value });

const askJson = <Codec extends Schema.Codec<unknown, string>>({
  model,
  parts,
  schema,
  jsonSchema,
}: Readonly<{
  model: string;
  parts: readonly Part[];
  schema: Codec;
  jsonSchema: object;
}>): Effect.Effect<
  Readonly<{ output: Codec["Type"]; costUsd: number }>,
  ModelError,
  ModelApi | Codec["DecodingServices"]
> =>
  Effect.gen(function* generateAndDecode() {
    const api = yield* ModelApi;
    const { content, costUsd } = yield* api.generateJson({ model, parts, jsonSchema });
    const output = yield* Schema.decodeEffect(schema)(content).pipe(
      Effect.mapError((error) => ModelError.make({ reason: error.message })),
    );
    return { output, costUsd };
  });

interface Region {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

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

const crop = (image: Uint8Array, box: Box): Uint8Array => {
  const decoded = decode(image);
  const { channels } = decoded;
  const { left, top, width, height } = regionOf(decoded, box);
  const rowLength = width * channels;
  const data = new Uint8Array(rowLength * height);
  const rows = Arr.makeBy(height, (row) => {
    const start = ((top + row) * decoded.width + left) * channels;
    return decoded.data.subarray(start, start + rowLength);
  });
  for (const [row, pixels] of rows.entries()) {
    data.set(pixels, row * rowLength);
  }
  return encode({ width, height, data, channels, depth: BIT_DEPTH });
};

const LinesSchema = Schema.fromJsonString(Schema.Struct({ lines: Schema.Array(Schema.String) }));

const LINES_JSON_SCHEMA = {
  type: "object",
  properties: { lines: { type: "array", items: { type: "string" } } },
  required: ["lines"],
  additionalProperties: false,
} as const;

const REREAD_PROMPT =
  "帳票の画像から切り出した行を順に渡す。それぞれの行に書かれている文字を、画像のとおりに書き起こして lines に同じ順で入れる。";

interface Reread {
  readonly fragments: readonly Fragment[];
  readonly costUsd: number;
  readonly reread: number;
}

const withRereadLines = (
  fragments: readonly Fragment[],
  targets: readonly Readonly<{ index: number }>[],
  lines: readonly string[],
): readonly Fragment[] => {
  const replaced = new Map(
    pipe(
      targets,
      Arr.map(({ index }, position) => [index, lines[position]] as const),
    ),
  );
  return pipe(
    fragments,
    Arr.map((fragment, index) =>
      Option.fromNullishOr(replaced.get(index)).pipe(
        Option.match({
          onNone: () => fragment,
          onSome: (read) => ({ ...fragment, text: read }),
        }),
      ),
    ),
  );
};

const rereadLowConfidence = ({
  image,
  fragments,
  model = DEFAULT_GENERATOR_MODEL,
}: Readonly<{
  image: Uint8Array;
  fragments: readonly Fragment[];
  model?: string;
}>): Effect.Effect<Reread, ModelError, ModelApi> => {
  const targets = pipe(
    fragments,
    Arr.map((fragment, index) => ({ fragment, index })),
    Arr.filter(({ fragment }) => fragment.confidence < REREAD_BELOW),
  );
  if (targets.length === NOTHING_REREAD) {
    return Effect.succeed({ fragments, costUsd: NOTHING_REREAD, reread: NOTHING_REREAD });
  }
  const prompts = pipe(
    targets,
    Arr.flatMap(({ fragment }, position) => [
      text(`${position + FIRST_LINE} 行目（OCR では「${fragment.text}」）`),
      png(crop(image, fragment.box)),
    ]),
  );
  return askJson({
    model,
    schema: LinesSchema,
    jsonSchema: LINES_JSON_SCHEMA,
    parts: [text(REREAD_PROMPT), ...prompts],
  }).pipe(
    Effect.map(({ output, costUsd }) => ({
      fragments: withRereadLines(fragments, targets, output.lines),
      costUsd,
      reread: targets.length,
    })),
    Effect.withSpan("ocr-decide.reread", { attributes: { model, lines: targets.length } }),
  );
};

const extractPrompt = (fields: readonly Field[]): string =>
  pipe(
    [
      "帳票の画像から次の項目を読み取り、帳票に書かれているとおりの文字列で返す。見つからない項目は null にする。",
      ...pipe(
        fields,
        Arr.map((field) => `${field.id}: ${field.label}（${field.description}）`),
      ),
    ],
    Arr.join("\n"),
  );

const extractJsonSchema = (fields: readonly Field[]): object => ({
  type: "object",
  properties: Rec.fromEntries(
    pipe(
      fields,
      Arr.map((field) => [field.id, { type: ["string", "null"], description: field.label }]),
    ),
  ),
  required: pipe(
    fields,
    Arr.map(({ id }) => id),
  ),
  additionalProperties: false,
});

const ExtractedSchema = Schema.fromJsonString(
  Schema.Record(Schema.String, Schema.NullOr(Schema.String)),
);

const toValue = (value: Option.Option<string>): FieldValue =>
  value.pipe(
    Option.filter((read) => Str.trim(read) !== ""),
    Option.match({
      onNone: () => MISSING,
      onSome: (read): FieldValue => ({ status: "found", text: read }),
    }),
  );

const extractFromImage = ({
  image,
  fields,
  model = DEFAULT_GENERATOR_MODEL,
}: Readonly<{
  image: Uint8Array;
  fields: readonly Field[];
  model?: string;
}>): Effect.Effect<Extraction, ModelError, ModelApi> =>
  askJson({
    model,
    schema: ExtractedSchema,
    jsonSchema: extractJsonSchema(fields),
    parts: [text(extractPrompt(fields)), png(image)],
  }).pipe(
    Effect.map(({ output, costUsd }) => ({
      values: Rec.fromEntries(
        pipe(
          fields,
          Arr.map(({ id }) => [id, toValue(Option.fromNullishOr(output[id]))]),
        ),
      ),
      costUsd,
    })),
    Effect.withSpan("ocr-decide.extract", { attributes: { model } }),
  );

export { DEFAULT_GENERATOR_MODEL, REREAD_BELOW, extractFromImage, rereadLowConfidence };
export type { Reread };
