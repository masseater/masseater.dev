import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import { Array as Arr, Effect, pipe } from "effect";
import type { Option } from "effect";

import type { ConversationChunk } from "#/features/mcp/model/conversation.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import { chunkText } from "./conversation-read.server";
import { ownerUtterances } from "./owner-utterance";
import type { Utterance } from "./owner-utterance";
import { chunkPositionFrom, chunkPositionText, collect, settledBefore } from "./trait-batch";
import type { Collected } from "./trait-batch";
import { chunksAfter } from "./trait-source-store.server";
import { GLOBAL } from "./trait-state";
import type { BatchSource } from "./trait-state";
import { cursorOf } from "./trait-store.server";

type ReadChunk = Readonly<{ chunk: ConversationChunk; batch: readonly BatchSource[] }>;

const sameTurn = (left: Utterance, right: Utterance): boolean => left.uuid === right.uuid;

const turnSource =
  (sessionId: string) =>
  (turn: Arr.NonEmptyReadonlyArray<Utterance>): BatchSource => {
    const [first] = turn;
    return {
      source: {
        ref: `conversation:${sessionId}/${first.uuid}`,
        origin: "conversation",
        at: first.timestamp,
        scope: GLOBAL,
        text: pipe(
          turn,
          Arr.map((utterance) => utterance.text),
          Arr.join("\n\n"),
        ),
      },
      present: true,
    };
  };

const sourcesOf = (chunk: ConversationChunk, jsonl: string): readonly BatchSource[] =>
  Arr.match(ownerUtterances(jsonl), {
    onEmpty: () => [],
    onNonEmpty: (utterances) =>
      pipe(Arr.groupWith(utterances, sameTurn), Arr.map(turnSource(chunk.sessionId))),
  });

const readChunk = (chunk: ConversationChunk): Effect.Effect<ReadChunk, UpstreamFailed> =>
  chunkText(chunk).pipe(Effect.map((jsonl) => ({ chunk, batch: sourcesOf(chunk, jsonl) })));

const batchOfChunk = (item: ReadChunk): readonly BatchSource[] => item.batch;

const positionOfChunk = ({ chunk }: ReadChunk): Effect.Effect<string> =>
  chunkPositionText({
    at: chunk.at,
    sessionId: chunk.sessionId,
    file: chunk.file,
    start: chunk.start,
  });

const collectConversations: Effect.Effect<
  Option.Option<Collected>,
  StorageFailed | UpstreamFailed
> = Effect.gen(function* collectConversations() {
  const stored = yield* cursorOf("conversation");
  const before = yield* settledBefore;
  const chunks = yield* chunksAfter({ position: chunkPositionFrom(stored), before });
  const items = yield* pipe(chunks, Effect.forEach(readChunk));
  return yield* collect({
    origin: "conversation",
    items,
    batchOf: batchOfChunk,
    positionOf: positionOfChunk,
  });
});

export { collectConversations };
