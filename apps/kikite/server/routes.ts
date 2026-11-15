import { Effect, Option, Schema, Stream, String as Str } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import {
  CORRECTION_MODEL,
  QUESTION_MODEL,
  RESEARCH_MODEL,
  RESEARCH_TOOLING,
  SUMMARY_MODEL,
} from "#config";
import {
  CORRECTION_PATH,
  Correction,
  CorrectionRequest,
  ERROR_LABEL,
  QUESTION_PATH,
  QuestionRequest,
  RESEARCH_PATH,
  Research,
  ResearchRequest,
  SUMMARY_PATH,
  Summary,
  SummaryRequest,
} from "#protocol";

import { Generator } from "./generator.ts";
import { correctionPrompt, questionPrompt, researchPrompt, summaryPrompt } from "./prompts.ts";

type Failure = Readonly<{ _tag: string; message: string }>;
type Response = HttpServerResponse.HttpServerResponse;

const BAD_REQUEST = 400;
const BAD_GATEWAY = 502;
const CLOSING_BRACE = 1;

const decodeSummary = Schema.decodeEffect(Schema.fromJsonString(Summary));
const decodeResearch = Schema.decodeEffect(Schema.fromJsonString(Research));
const decodeCorrection = Schema.decodeEffect(Schema.fromJsonString(Correction));

const braces = (text: string): Option.Option<readonly [number, number]> =>
  Option.all([Str.indexOf("{")(text), Str.lastIndexOf("}")(text)]);

const jsonObjectIn = (text: string): string =>
  Option.match(braces(text), {
    onNone: () => text,
    onSome: ([start, end]) => Str.slice(start, end + CLOSING_BRACE)(text),
  });

const summarize = Effect.gen(function* summarize() {
  const request = yield* HttpServerRequest.schemaBodyJson(SummaryRequest);
  const generator = yield* Generator;
  const text = yield* Stream.mkString(
    generator.stream({ prompt: summaryPrompt(request), model: SUMMARY_MODEL }),
  );
  const summary = yield* decodeSummary(jsonObjectIn(text));
  return HttpServerResponse.jsonUnsafe(summary);
});

const research = Effect.gen(function* research() {
  const request = yield* HttpServerRequest.schemaBodyJson(ResearchRequest);
  const generator = yield* Generator;
  const text = yield* generator.research(
    { prompt: researchPrompt(request), model: RESEARCH_MODEL },
    RESEARCH_TOOLING,
  );
  const found = yield* decodeResearch(jsonObjectIn(text));
  return HttpServerResponse.jsonUnsafe(found);
});

const correct = Effect.gen(function* correct() {
  const request = yield* HttpServerRequest.schemaBodyJson(CorrectionRequest);
  const generator = yield* Generator;
  const text = yield* Stream.mkString(
    generator.stream({ prompt: correctionPrompt(request), model: CORRECTION_MODEL }),
  );
  const corrected = yield* decodeCorrection(jsonObjectIn(text));
  return HttpServerResponse.jsonUnsafe(corrected);
});

const errorLine = (failure: Readonly<{ message: string }>): Stream.Stream<string> =>
  Stream.make(`\n${ERROR_LABEL}: ${failure.message}`);

const ask = Effect.gen(function* ask() {
  const request = yield* HttpServerRequest.schemaBodyJson(QuestionRequest);
  const generator = yield* Generator;
  const text = generator
    .stream({ prompt: questionPrompt(request), model: QUESTION_MODEL })
    .pipe(Stream.catchTag("GenerationFailed", errorLine));
  return HttpServerResponse.stream(Stream.encodeText(text), {
    contentType: "text/plain; charset=utf-8",
    headers: { "cache-control": "no-store" },
  });
});

const rejected =
  (status: number) =>
  (failure: Failure): Effect.Effect<Response> =>
    Effect.succeed(HttpServerResponse.text(Str.trim(failure.message), { status }));

const badRequest = rejected(BAD_REQUEST);
const badGateway = rejected(BAD_GATEWAY);

const answerSummary = summarize.pipe(
  Effect.catchTags({
    SchemaError: badRequest,
    HttpServerError: badRequest,
    GenerationFailed: badGateway,
  }),
);

const answerResearch = research.pipe(
  Effect.catchTags({
    SchemaError: badRequest,
    HttpServerError: badRequest,
    GenerationFailed: badGateway,
  }),
);

const answerCorrection = correct.pipe(
  Effect.catchTags({
    SchemaError: badRequest,
    HttpServerError: badRequest,
    GenerationFailed: badGateway,
  }),
);

const answerQuestion = ask.pipe(
  Effect.catchTags({ SchemaError: badRequest, HttpServerError: badRequest }),
);

/** @internal */
export const routes = HttpRouter.addAll([
  HttpRouter.route("POST", SUMMARY_PATH, answerSummary),
  HttpRouter.route("POST", QUESTION_PATH, answerQuestion),
  HttpRouter.route("POST", RESEARCH_PATH, answerResearch),
  HttpRouter.route("POST", CORRECTION_PATH, answerCorrection),
]);
