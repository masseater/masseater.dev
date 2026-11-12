import { Array, Effect, Option, pipe } from "effect";
import type { HttpClient } from "effect/http";
import type { SqlClient } from "effect/sql";

import { applyRemote } from "./apply.ts";
import { markPushed, pendingDocuments } from "./outbox.ts";
import type { Pending } from "./outbox.ts";
import { fetchChanges, pushDocuments } from "./remote.ts";
import { asSyncFailed } from "./sync-failed.ts";
import type { SyncFailed } from "./sync-failed.ts";
import { readState, writeState } from "./sync-state.ts";

type Services = SqlClient.SqlClient | HttpClient.HttpClient;

const PUSH_BATCH = 50;
const FIRST = 0;

const pushBatch = Effect.fn("pushBatch")(function* pushBatch(
  accessToken: string,
  batch: readonly Pending[],
) {
  yield* pushDocuments({
    accessToken,
    documents: pipe(
      batch,
      Array.map(({ document }) => document),
    ),
  });
  yield* markPushed(
    pipe(
      batch,
      Array.map(({ entry }) => entry),
    ),
  );
});

const push = Effect.fn("push")(function* push(accessToken: string) {
  const pending = yield* pendingDocuments();
  yield* Effect.forEach(
    pipe(pending, Array.chunksOf(PUSH_BATCH)),
    (batch) => pushBatch(accessToken, batch),
    { discard: true },
  );
});

const pullFrom = (accessToken: string, after: number): Effect.Effect<void, SyncFailed, Services> =>
  Effect.gen(function* pullPage() {
    const { documents, more } = yield* fetchChanges({ accessToken, after });
    yield* applyRemote(documents);
    const last = pipe(
      documents,
      Array.last,
      Option.map(({ revision }) => revision),
      Option.getOrElse(() => after),
    );
    yield* writeState("cursor", last.toString());
    if (more) {
      yield* pullFrom(accessToken, last);
    }
  }).pipe(asSyncFailed);

const pull = Effect.fn("pull")(function* pull(accessToken: string) {
  const cursor = yield* readState("cursor");
  const after = pipe(
    cursor,
    Option.match({ onNone: () => FIRST, onSome: (value) => globalThis.Number(value) }),
  );
  yield* pullFrom(accessToken, after);
});

const syncRound = Effect.fn("syncRound")(function* syncRound(accessToken: string) {
  yield* push(accessToken);
  yield* pull(accessToken);
}, asSyncFailed);

/** @internal */
export { syncRound };
/** @internal */
export type { Services };
