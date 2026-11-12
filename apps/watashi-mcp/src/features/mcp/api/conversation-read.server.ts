import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { failedAt } from "@masseater.dev/mcp-tool-call";
import { env } from "cloudflare:workers";
import { Array as Arr, Effect, Match, Number as Num, Option, pipe } from "effect";

import type { ConversationChunk } from "#/features/mcp/model/conversation.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import type { ReadRequest, View } from "./conversation-input";
import { chunksFrom, filesOf, listSessions } from "./conversation-store.server";
import type { FileSummary, SessionPage, SessionSummary } from "./conversation-store.server";
import { ownerUtterances } from "./owner-utterance";
import type { Utterance } from "./owner-utterance";

type ConversationText = Readonly<{
  sessionId: string;
  file: string;
  files: readonly FileSummary[];
  cursor: number;
  redactions: number;
  view: View;
  text?: string;
  utterances?: readonly Utterance[];
  nextCursor?: number;
}>;

type Taken = Readonly<{ chunks: readonly ConversationChunk[]; bytes: number }>;

const CHUNK_PAGE = 64;
const READ_CONCURRENCY = 4;

const fail = failedAt("r2");

const sizeOf = (chunk: ConversationChunk): number => chunk.end - chunk.start;

const objectOf = (chunk: ConversationChunk): Effect.Effect<R2ObjectBody, UpstreamFailed> =>
  Effect.tryPromise({ try: () => env.CONVERSATIONS.get(chunk.objectKey), catch: fail }).pipe(
    Effect.flatMap((object) =>
      Effect.fromOption(Option.fromNullishOr(object)).pipe(
        Effect.mapError(() => fail(new Error(`${chunk.objectKey} is missing`))),
      ),
    ),
  );

const textOf = (chunk: ConversationChunk): Effect.Effect<string, UpstreamFailed> =>
  objectOf(chunk).pipe(
    Effect.flatMap((object) =>
      Effect.tryPromise({
        try: () => new Response(object.body.pipeThrough(new DecompressionStream("gzip"))).text(),
        catch: fail,
      }),
    ),
  );

const FIRST_INDEX = 0;
const PREVIOUS = 1;

const continues =
  (chunks: readonly ConversationChunk[]) =>
  (chunk: ConversationChunk, index: number): boolean =>
    Option.exists(Arr.get(chunks, index - PREVIOUS), (previous) => previous.end === chunk.start);

const withinBudget =
  (chunks: readonly ConversationChunk[], maxBytes: number) =>
  (chunk: ConversationChunk): boolean =>
    Option.exists(Arr.head(chunks), (first) => chunk.end - first.start <= maxBytes);

const takeWithin =
  (maxBytes: number) =>
  (chunks: readonly ConversationChunk[]): Taken => {
    const contiguous = continues(chunks);
    const affordable = withinBudget(chunks, maxBytes);
    const taken = pipe(
      chunks,
      Arr.takeWhile(
        (chunk, index) => index === FIRST_INDEX || (contiguous(chunk, index) && affordable(chunk)),
      ),
    );
    return { chunks: taken, bytes: Num.sumAll(pipe(taken, Arr.map(sizeOf))) };
  };

const nextCursorOf = (
  candidates: readonly ConversationChunk[],
  taken: Taken,
): Readonly<{ nextCursor?: number }> =>
  pipe(
    Arr.last(taken.chunks),
    Option.filter(
      () => candidates.length > taken.chunks.length || candidates.length === CHUNK_PAGE,
    ),
    Option.match({ onNone: () => ({}), onSome: (last) => ({ nextCursor: last.end }) }),
  );

type Body = Readonly<{ text?: string; utterances?: readonly Utterance[] }>;

const bodyOf =
  (view: View) =>
  (jsonl: string): Body =>
    Match.value(view).pipe(
      Match.when("owner", () => ({ utterances: ownerUtterances(jsonl) })),
      Match.orElse(() => ({ text: jsonl })),
    );

const readConversation = Effect.fn("conversation.read")(function* readConversation(
  request: ReadRequest,
) {
  const files = yield* filesOf(request);
  const candidates = yield* chunksFrom({ ...request, limit: CHUNK_PAGE });
  const taken = takeWithin(request.maxBytes)(candidates);
  const texts = yield* Effect.forEach(taken.chunks, textOf, { concurrency: READ_CONCURRENCY });
  const first = Arr.head(taken.chunks);
  const result: ConversationText = {
    sessionId: request.sessionId,
    file: request.file,
    files,
    cursor: Option.match(first, { onNone: () => request.cursor, onSome: (chunk) => chunk.start }),
    redactions: Num.sumAll(
      pipe(
        taken.chunks,
        Arr.map((chunk) => chunk.redactions),
      ),
    ),
    view: request.view,
    ...bodyOf(request.view)(Arr.join(texts, "")),
    ...nextCursorOf(candidates, taken),
  };
  return result;
});

const listConversations = (
  page: SessionPage,
): Effect.Effect<readonly SessionSummary[], StorageFailed> => listSessions(page);

export { listConversations, readConversation, textOf as chunkText };
