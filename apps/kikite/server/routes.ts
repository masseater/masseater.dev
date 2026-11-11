import { Effect, Option, Schema, Stream, String as Str } from "effect";
import { HttpRouter, HttpServerRequest, HttpServerResponse } from "effect/http";

import { QUESTION_MODEL, SUMMARY_MODEL } from "#config";
import {
  ERROR_LABEL,
  QUESTION_PATH,
  QuestionRequest,
  SUMMARY_PATH,
  Summary,
  SummaryRequest,
} from "#protocol";

import { Generator } from "./generator.ts";
import { questionPrompt, summaryPrompt } from "./prompts.ts";

type Failure = Readonly<{ _tag: string; message: string }>;
type Response = HttpServerResponse.HttpServerResponse;

const BAD_REQUEST = 400;
const BAD_GATEWAY = 502;
const CLOSING_BRACE = 1;

const decodeSummary = Schema.decodeEffect(Schema.fromJsonString(Summary));

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

const answerQuestion = ask.pipe(
  Effect.catchTags({ SchemaError: badRequest, HttpServerError: badRequest }),
);

const routes = HttpRouter.addAll([
  HttpRouter.route("POST", SUMMARY_PATH, answerSummary),
  HttpRouter.route("POST", QUESTION_PATH, answerQuestion),
]);

/** @internal */
export { routes };
