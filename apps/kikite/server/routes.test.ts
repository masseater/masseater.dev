import { describe, expect, it } from "@effect/vitest";
import { Array as Arr, Effect, Layer, Option, Schema, Stream, pipe } from "effect";
import type { Cause } from "effect";
import { HttpRouter } from "effect/http";

import {
  CORRECTION_PATH,
  CorrectionRequest,
  QUESTION_PATH,
  QuestionRequest,
  RESEARCH_PATH,
  ResearchRequest,
  SUMMARY_PATH,
  SummaryRequest,
} from "#protocol";
import type { CorrectionBody, QuestionBody, ResearchBody, SummaryBody } from "#protocol";

import { GenerationFailed } from "./generation-failed.ts";
import { Generator } from "./generator.ts";
import { routes } from "./routes.ts";

type Generation = (typeof Generator.Service)["stream"] extends (generation: infer Input) => unknown
  ? Input
  : never;
type Reply = (generation: Generation) => Stream.Stream<string, GenerationFailed>;
type Scripted = Readonly<{ generations: Generation[]; layer: Layer.Layer<Generator> }>;
type Answer = Readonly<{ status: number; text: string }>;

const OK = 200;
const BAD_REQUEST = 400;
const QUESTION: QuestionBody = {
  summary: Option.none(),
  recent: "本人: メモが散らかっている",
  asked: [],
  leads: [{ topic: "メモの整理術", detail: "置き場を 1 つに決める", source: "" }],
};

const RESEARCH: ResearchBody = {
  summary: { theme: "メモの置き場", points: ["散らかる"], open: [], next: [] },
  recent: "本人: メモが散らかっている",
  known: [],
  memory: ["前回のテーマ: 3D 酔い"],
};

const CORRECTION: CorrectionBody = {
  context: "テーマ: 文字起こし",
  lines: [{ id: 3, text: "右にオゾンコシが出る" }],
};

const SUMMARY: SummaryBody = {
  previous: Option.none(),
  transcript: "本人: メモが散らかっている",
};

const questionJson = Schema.encodeEffect(Schema.fromJsonString(QuestionRequest))(QUESTION);
const summaryJson = Schema.encodeEffect(Schema.fromJsonString(SummaryRequest))(SUMMARY);
const researchJson = Schema.encodeEffect(Schema.fromJsonString(ResearchRequest))(RESEARCH);
const correctionJson = Schema.encodeEffect(Schema.fromJsonString(CorrectionRequest))(CORRECTION);

const scripted = (reply: Reply, found = ""): Scripted => {
  const generations: Generation[] = [];
  const layer = Layer.succeed(
    Generator,
    Generator.of({
      stream: (generation) => {
        generations.push(generation);
        return reply(generation);
      },
      research: (generation) => {
        generations.push(generation);
        return Effect.succeed(found);
      },
    }),
  );
  return { generations, layer };
};

const answerOf = (response: Response): Effect.Effect<Answer> =>
  Effect.map(
    Effect.promise(() => response.text()),
    (text) => ({ status: response.status, text }),
  );

const post = (layer: Layer.Layer<Generator>, path: string, body: string): Effect.Effect<Answer> =>
  Effect.acquireUseRelease(
    Effect.sync(() =>
      HttpRouter.toWebHandler(routes.pipe(Layer.provideMerge(layer)), { disableLogger: true }),
    ),
    ({ handler }) =>
      pipe(
        Effect.promise(() =>
          handler(
            new Request(`http://localhost${path}`, {
              method: "POST",
              headers: { "content-type": "application/json" },
              body,
            }),
          ),
        ),
        Effect.flatMap(answerOf),
      ),
    ({ dispose }) => Effect.promise(dispose),
  );

const firstOf = (
  generations: readonly Generation[],
): Effect.Effect<Generation, Cause.NoSuchElementError> => Effect.fromOption(Arr.head(generations));

const streamsQuestion = Effect.gen(function* streamsQuestion() {
  const { generations, layer } = scripted(() =>
    Stream.make("方針: concrete\n根拠: 「散らかっている」", "\n質問: どこに？"),
  );
  const body = yield* questionJson;
  const response = yield* post(layer, QUESTION_PATH, body);
  expect(response).toStrictEqual({
    status: OK,
    text: "方針: concrete\n根拠: 「散らかっている」\n質問: どこに？",
  });
  const generation = yield* firstOf(generations);
  expect(generation.model).toBe("opus");
  expect(generation.prompt.system).toContain("find（テーマを探す）");
  expect(generation.prompt.user).toContain("メモが散らかっている");
  expect(generation.prompt.user).toContain("メモの整理術 / 置き場を 1 つに決める");
});

const appendsFailure = Effect.gen(function* appendsFailure() {
  const { layer } = scripted(() => Stream.fail(GenerationFailed.make({ message: "401" })));
  const body = yield* questionJson;
  const response = yield* post(layer, QUESTION_PATH, body);
  expect(response.text).toBe("\nエラー: 401");
});

const decodesSummary = Effect.gen(function* decodesSummary() {
  const { generations, layer } = scripted(() =>
    Stream.make(
      '```json\n{"theme":"メモの置き場","points":["散らかる"],"open":[],"next":["見返す頻度"]}\n```',
    ),
  );
  const body = yield* summaryJson;
  const response = yield* post(layer, SUMMARY_PATH, body);
  expect(response).toStrictEqual({
    status: OK,
    text: '{"theme":"メモの置き場","points":["散らかる"],"open":[],"next":["見返す頻度"]}',
  });
  const generation = yield* firstOf(generations);
  expect(generation.model).toBe("opus");
});

const decodesResearch = Effect.gen(function* decodesResearch() {
  const { generations, layer } = scripted(
    () => Stream.empty,
    '調べました。\n{"leads":[{"topic":"VR 酔い対策","detail":"視野を狭めると酔いにくい","source":"https://example.com"}]}',
  );
  const body = yield* researchJson;
  const response = yield* post(layer, RESEARCH_PATH, body);
  expect(response).toStrictEqual({
    status: OK,
    text: '{"leads":[{"topic":"VR 酔い対策","detail":"視野を狭めると酔いにくい","source":"https://example.com"}]}',
  });
  const generation = yield* firstOf(generations);
  expect(generation.prompt.user).toContain("前回のテーマ: 3D 酔い");
});

const decodesCorrection = Effect.gen(function* decodesCorrection() {
  const { generations, layer } = scripted(() =>
    Stream.make('{"lines":[{"id":3,"text":"右に文字起こしが出る"}]}'),
  );
  const body = yield* correctionJson;
  const response = yield* post(layer, CORRECTION_PATH, body);
  expect(response).toStrictEqual({
    status: OK,
    text: '{"lines":[{"id":3,"text":"右に文字起こしが出る"}]}',
  });
  const generation = yield* firstOf(generations);
  expect(generation.model).toBe("sonnet");
});

const rejectsBody = Effect.gen(function* rejectsBody() {
  const { generations, layer } = scripted(() => Stream.empty);
  const response = yield* post(layer, QUESTION_PATH, '{"recent":1}');
  expect(response.status).toBe(BAD_REQUEST);
  expect(generations).toStrictEqual([]);
});

describe("routes", () => {
  it.effect(
    "streams the question with every strategy for the model to pick",
    () => streamsQuestion,
  );
  it.effect("appends the failure to the question stream", () => appendsFailure);
  it.effect("decodes the summary out of the generated text", () => decodesSummary);
  it.effect("decodes the leads the researcher found", () => decodesResearch);
  it.effect("decodes the corrected transcript", () => decodesCorrection);
  it.effect("rejects a body that is not a question request", () => rejectsBody);
});
