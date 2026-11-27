import { Array as Arr, Effect, Option, Schedule, Schema, pipe } from "effect";
import type { Redacted } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";

import { AnswerSchema } from "#/entities/decision/index.ts";
import type { DecisionResponse, WireRequest } from "#/entities/decision/index.ts";

const FIRST_REDIRECT = 300;
const RETRY_INITIAL_MS = 10;
const RETRY_EXPONENT = 2;

const Decisions = Schema.Struct({
  model: Schema.String,
  answers: Schema.Record(Schema.String, AnswerSchema),
});

const Envelope = Schema.Struct({ result: Decisions });

const ErrorMessage = Schema.Struct({ message: Schema.String });

const ErrorBody = Schema.Union([
  Schema.Struct({ errors: Schema.NonEmptyArray(ErrorMessage) }),
  Schema.Struct({ detail: ErrorMessage }),
]);

const decodeErrorBody = Schema.decodeUnknownOption(ErrorBody);

const messageOfBody = (body: unknown): string =>
  Option.match(decodeErrorBody(body), {
    onNone: () => "request failed",
    onSome: (decoded) => {
      if ("detail" in decoded) {
        return decoded.detail.message;
      }
      return pipe(
        decoded.errors,
        Arr.map(({ message }) => message),
        Arr.join("; "),
      );
    },
  });

const failureOf = (response: HttpClientResponse.HttpClientResponse): Effect.Effect<never, string> =>
  response.json.pipe(
    Effect.option,
    Effect.flatMap((body) =>
      Effect.fail(
        `http ${String(response.status)}: ${body.pipe(Option.getOrUndefined, messageOfBody)}`,
      ),
    ),
  );

/** @internal */
export interface SystemOneCall {
  readonly url: string;
  readonly model: string;
  readonly token: Redacted.Redacted;
  readonly headers: Readonly<Record<string, string>>;
  readonly envelope: boolean;
}

const decodeEnvelope = HttpClientResponse.schemaBodyJson(Envelope);

const decodeDecisions = HttpClientResponse.schemaBodyJson(Decisions);

const invalid = ({ message }: Readonly<{ message: string }>): string =>
  `invalid response: ${message}`;

const decisionsOf = (
  response: HttpClientResponse.HttpClientResponse,
  envelope: boolean,
): Effect.Effect<typeof Decisions.Type, string> => {
  if (envelope) {
    return decodeEnvelope(response).pipe(
      Effect.mapBoth({ onSuccess: ({ result }) => result, onFailure: invalid }),
    );
  }
  return decodeDecisions(response).pipe(Effect.mapError(invalid));
};

/** @internal */
export const sendSystemOne = Effect.fn("sendSystemOne")(function* sendSystemOne(
  call: SystemOneCall,
  wire: WireRequest,
) {
  const client = (yield* HttpClient.HttpClient).pipe(
    HttpClient.retryTransient({
      retryOn: "response-only",
      schedule: Schedule.exponential(RETRY_INITIAL_MS, RETRY_EXPONENT),
    }),
  );
  const response = yield* HttpClientRequest.post(call.url).pipe(
    HttpClientRequest.bearerToken(call.token),
    HttpClientRequest.setHeaders(call.headers),
    HttpClientRequest.bodyJsonUnsafe({
      model: call.model,
      state: wire.state,
      questions: wire.questions,
    }),
    client.execute,
    Effect.mapError(({ message }) => `network: ${message}`),
  );
  if (response.status >= FIRST_REDIRECT) {
    return yield* failureOf(response);
  }
  const decisions = yield* decisionsOf(response, call.envelope);
  return { model: decisions.model, answers: decisions.answers } satisfies DecisionResponse;
});
