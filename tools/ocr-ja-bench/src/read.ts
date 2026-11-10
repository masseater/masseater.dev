import { NodeServices } from "@effect/platform-node";
import { ModelApi, readFragments } from "@r_masseater/ocr-decide";
import {
  Context,
  Duration,
  Effect,
  FileSystem,
  Layer,
  Match,
  Schema,
  Array as Arr,
  pipe,
} from "effect";

import type { Engine } from "./engines.ts";
import type { Page } from "./page.ts";
import type { Reading } from "./results.ts";

const INSTRUCTIONS =
  "この画像に写っている文字を、人が読む順にすべて書き写してください。説明や要約はせず、書かれている文字だけを、行ごとに改行して text に入れてください。";

const TEXT_SCHEMA = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
  additionalProperties: false,
} as const;

const ONE_AT_A_TIME = { concurrency: 1 } as const;

const VLM_CONCURRENCY = { concurrency: 4 } as const;

const NO_COST = 0;

const TextPartSchema = Schema.Struct({ text: Schema.String });

const TextAnswerSchema = Schema.fromJsonString(
  Schema.Union([TextPartSchema, Schema.Array(TextPartSchema)]),
);

const textOf = (answer: typeof TextAnswerSchema.Type): string => {
  if ("text" in answer) {
    return answer.text;
  }
  return pipe(
    answer,
    Arr.map(({ text }) => text),
    Arr.join("\n"),
  );
};

type Record = (reading: Reading) => Effect.Effect<void>;

interface ReadRequest {
  readonly engine: Engine;
  readonly pages: readonly Page[];
  readonly record: Record;
}

class Reader extends Context.Service<
  Reader,
  { readonly read: (request: ReadRequest) => Effect.Effect<void> }
>()("@ocr-decide/ja-bench/read/Reader") {}

const failed = (id: string, reason: string): Reading => ({ id, status: "failed", reason });

const throughTesseract = ({
  fs,
  page,
}: Readonly<{ fs: FileSystem.FileSystem; page: Page }>): Effect.Effect<Reading> =>
  fs.readFile(page.image).pipe(
    Effect.flatMap((image) => readFragments({ image })),
    Effect.timed,
    Effect.match({
      onFailure: (error) => failed(page.id, error.message),
      onSuccess: ([duration, fragments]): Reading => ({
        id: page.id,
        status: "done",
        text: pipe(
          fragments,
          Arr.map(({ text }) => text),
          Arr.join("\n"),
        ),
        seconds: Duration.toSeconds(duration),
        costUsd: NO_COST,
      }),
    }),
    Effect.withSpan("ocr-ja-bench.tesseract", { attributes: { id: page.id } }),
  );

const throughVlm = ({
  fs,
  api,
  model,
  page,
}: Readonly<{
  fs: FileSystem.FileSystem;
  api: ModelApi["Service"];
  model: string;
  page: Page;
}>): Effect.Effect<Reading> =>
  Effect.gen(function* askModel() {
    const png = yield* fs.readFile(page.image);
    const [duration, generated] = yield* api
      .generateJson({
        model,
        parts: [
          { type: "text", text: INSTRUCTIONS },
          { type: "png", png },
        ],
        jsonSchema: TEXT_SCHEMA,
      })
      .pipe(Effect.timed);
    const answer = yield* Schema.decodeEffect(TextAnswerSchema)(generated.content);
    return {
      text: textOf(answer),
      seconds: Duration.toSeconds(duration),
      costUsd: generated.costUsd,
    };
  }).pipe(
    Effect.match({
      onFailure: (error) => failed(page.id, error.message),
      onSuccess: (done): Reading => ({ id: page.id, status: "done", ...done }),
    }),
    Effect.withSpan("ocr-ja-bench.vlm", { attributes: { model, id: page.id } }),
  );

const makeReader = Effect.gen(function* makeReader() {
  const fs = yield* FileSystem.FileSystem;
  const api = yield* ModelApi;
  return Reader.of({
    read: ({ engine, pages, record }) =>
      Match.value(engine).pipe(
        Match.when({ kind: "recorded" }, () => Effect.void),
        Match.when({ kind: "tesseract" }, () =>
          Effect.forEach(
            pages,
            (page) => throughTesseract({ fs, page }).pipe(Effect.flatMap(record)),
            ONE_AT_A_TIME,
          ),
        ),
        Match.when({ kind: "vlm" }, ({ id }) =>
          Effect.forEach(
            pages,
            (page) => throughVlm({ fs, api, model: id, page }).pipe(Effect.flatMap(record)),
            VLM_CONCURRENCY,
          ),
        ),
        Match.exhaustive,
        Effect.asVoid,
      ),
  });
});

const readerLayer = Layer.effect(Reader, makeReader).pipe(Layer.provide(NodeServices.layer));

export { Reader, readerLayer };
