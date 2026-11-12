import { Clock, Effect, Match, Option, Result, Schema } from "effect";

import type { StoreFailure } from "#/features/mcp/model/tool-failure";

import { BAD_REQUEST, json, storageFailed, withStatus } from "./http-json";
import { MemoryWriteInput } from "./memory-input";
import type { MemoryWriteValue } from "./memory-input";
import { writeMemory } from "./memory-write.server";
import type { Principal } from "./request-auth.server";
import { describeFailure } from "./tool-call.server";

const UNPROCESSABLE = 422;

const MemoryImport = Schema.fromJsonString(
  Schema.Struct({ memos: Schema.NonEmptyArray(MemoryWriteInput) }),
);

type Imported = Readonly<{ written: readonly string[]; failure: Option.Option<StoreFailure> }>;

const writeEach =
  (principal: Principal) =>
  (memos: readonly MemoryWriteValue[]): Effect.Effect<Imported> =>
    Effect.gen(function* writeMemos() {
      const write = writeMemory({ actor: `api:${principal.via}` });
      const written: string[] = [];
      for (const memo of memos) {
        const result = yield* Effect.result(write(memo));
        if (Result.isFailure(result)) {
          return { written, failure: Option.some(result.failure) };
        }
        written.push(...result.success.written);
      }
      return { written, failure: Option.none() };
    });

const responseOf = ({ written, failure }: Imported): Response =>
  Option.match(failure, {
    onNone: () => json({ written }),
    onSome: (cause) =>
      Match.value(cause).pipe(
        Match.tag("StorageFailed", () => storageFailed()),
        Match.orElse(() => withStatus(UNPROCESSABLE)({ ...describeFailure(cause), written })),
      ),
  });

const importMemos = Effect.fn("memory.import")(function* importMemos(
  request: Request,
  principal: Principal,
) {
  const text = yield* Effect.promise(() => request.text());
  const decoded = Schema.decodeOption(MemoryImport)(text);
  if (Option.isNone(decoded)) {
    return withStatus(BAD_REQUEST)({
      error: "memos に memory_write の入力と同じ形の要素を 1 件以上並べて送る",
    });
  }
  const { memos } = decoded.value;
  const startedAt = yield* Clock.currentTimeMillis;
  const imported = yield* writeEach(principal)(memos);
  const finishedAt = yield* Clock.currentTimeMillis;
  yield* Effect.logInfo("memory import").pipe(
    Effect.annotateLogs({
      event: "memory_import",
      via: principal.via,
      memos: memos.length,
      written: imported.written.length,
      errorTag: Option.match(imported.failure, {
        onNone: () => "",
        onSome: (failure) => describeFailure(failure).errorTag,
      }),
      latencyMs: finishedAt - startedAt,
    }),
  );
  return responseOf(imported);
});

export { importMemos };
