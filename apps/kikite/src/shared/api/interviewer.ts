import { Effect, Schema, Stream } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import {
  QUESTION_PATH,
  QuestionRequest,
  SUMMARY_PATH,
  Summary,
  SummaryRequest,
} from "#/shared/api/protocol.ts";
import type { InterviewSummary, QuestionBody, SummaryBody } from "#/shared/api/protocol.ts";

const taggedError = Schema.TaggedError;

/** @internal */
export class InterviewerFailed extends taggedError<
  InterviewerFailed,
  { readonly brand: unique symbol }
>()("InterviewerFailed", { message: Schema.String }) {}

const failed = (cause: unknown): InterviewerFailed =>
  InterviewerFailed.make({ message: String(cause) });

/** @internal */
export const send = Effect.fn("kikite.send")(function* send(
  request: HttpClientRequest.HttpClientRequest,
) {
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.mapRequest(HttpClientRequest.prependUrl(globalThis.location.origin)),
    HttpClient.filterStatusOk,
  );
  return yield* client.execute(request);
});

/** @internal */
export const requestSummary = (
  body: SummaryBody,
): Effect.Effect<InterviewSummary, InterviewerFailed, HttpClient.HttpClient> =>
  HttpClientRequest.post(SUMMARY_PATH).pipe(
    HttpClientRequest.schemaBodyJson(SummaryRequest)(body),
    Effect.flatMap(send),
    Effect.flatMap(HttpClientResponse.schemaBodyJson(Summary)),
    Effect.mapError(failed),
  );

/** @internal */
export const questionText = (
  body: QuestionBody,
): Stream.Stream<string, InterviewerFailed, HttpClient.HttpClient> =>
  HttpClientRequest.post(QUESTION_PATH).pipe(
    HttpClientRequest.schemaBodyJson(QuestionRequest)(body),
    Effect.flatMap(send),
    Effect.map((response) => response.stream),
    Stream.unwrap,
    Stream.decodeText,
    Stream.scan(
      () => "",
      (text: string, chunk: string) => `${text}${chunk}`,
    ),
    Stream.mapError(failed),
  );
