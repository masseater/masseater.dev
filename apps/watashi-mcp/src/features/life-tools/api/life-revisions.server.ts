import { Effect, Schema, pipe } from "effect";

import { findRecord, Snapshot } from "#/entities/life-record/index.server.ts";
import type { IdKey } from "#/entities/life-record/index.server.ts";
import { lifeKeyOf, timesOut, timeOut } from "#/entities/life-record/index.ts";
import type { Body } from "#/entities/life-record/index.ts";
import type { StoreFailure } from "#/shared/api/index.ts";
import { listHistory } from "#/shared/db/index.server.ts";
import type { HistoryEntry } from "#/shared/db/index.server.ts";

const HISTORY_LIMIT = 100;

const decodeSnapshot = Schema.decodeUnknownEffect(Snapshot);

const revisionOf =
  ({ record }: IdKey) =>
  (entry: HistoryEntry): Effect.Effect<Body> =>
    decodeSnapshot(entry.body).pipe(
      Effect.orDie,
      Effect.map((snapshot) => ({
        rev: entry.rev,
        op: entry.op,
        actor: entry.actor,
        at: timeOut(entry.at),
        source: snapshot.source,
        body: timesOut(record)(snapshot.body),
        retractedAt: snapshot.retractedAt,
        retractReason: snapshot.retractReason,
      })),
    );

const revisionsOf = (key: IdKey): Effect.Effect<readonly Body[], StoreFailure> => {
  const toRevisions = Effect.forEach(revisionOf(key));
  return findRecord(key).pipe(
    Effect.andThen(listHistory({ entity: key.record, id: key.id, limit: HISTORY_LIMIT })),
    Effect.flatMap(toRevisions),
  );
};

export const lifeRevisions = (ref: string): Effect.Effect<Body, StoreFailure> =>
  pipe(
    lifeKeyOf(ref),
    Effect.flatMap(revisionsOf),
    Effect.map((revisions) => ({ ref, revisions })),
  );
