import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import type { StoreFailed } from "#/entities/session/model/store-failed.ts";
import { ResearchAsk, ResearchRequest, SessionRecord } from "#protocol";
import type { InterviewSummary } from "#protocol";

import { recentRecords } from "./session-store.ts";

const decodeAsk = Schema.decodeUnknownEffect(Schema.fromJsonString(ResearchAsk));
const decodeRecord = Schema.decodeUnknownEffect(Schema.fromJsonString(SessionRecord));
const encodeRequest = Schema.encodeEffect(Schema.fromJsonString(ResearchRequest));

const memoryLine = ({ theme, points }: InterviewSummary): string =>
  pipe(points, Arr.join("、"), (said) => `${theme}: ${said}`);

const summaryIn = (record: string): Effect.Effect<Option.Option<InterviewSummary>> =>
  decodeRecord(record).pipe(
    Effect.map(({ summary }) => summary),
    Effect.orElseSucceed(Option.none<InterviewSummary>),
  );

const memory = recentRecords.pipe(
  Effect.flatMap(Effect.forEach(summaryIn)),
  Effect.map(Arr.getSomes),
  Effect.map(Arr.filter(({ theme }) => theme !== "")),
  Effect.map(Arr.map(memoryLine)),
);

const withMemory = Effect.fn("kikite.researchMemory")(function* withMemory(request: Request) {
  const text = yield* Effect.promise(() => request.text());
  const ask = yield* decodeAsk(text);
  const remembered = yield* memory;
  const body = yield* encodeRequest({ ...ask, memory: remembered });
  return new Request(request.url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
  });
}) satisfies (request: Request) => Effect.Effect<Request, Schema.SchemaError | StoreFailed>;

const BAD_REQUEST = 400;
const SERVER_ERROR = 500;

const rejected = (code: number) => (): Effect.Effect<Response> =>
  Effect.succeed(new Response("", { status: code }));

export const researched =
  (forward: (next: Request) => Promise<Response>) =>
  (request: Request): Effect.Effect<Response> =>
    withMemory(request).pipe(
      Effect.flatMap((next) => Effect.promise(() => forward(next))),
      Effect.catchTags({ SchemaError: rejected(BAD_REQUEST), StoreFailed: rejected(SERVER_ERROR) }),
    );
