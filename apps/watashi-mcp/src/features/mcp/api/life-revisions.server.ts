import { Effect, Schema, pipe } from "effect";

import type { StoreFailure } from "#/features/mcp/model/tool-failure";

import { listHistory } from "./history-store.server";
import type { HistoryEntry } from "./history-store.server";
import { lifeKeyOf } from "./life-checks";
import { timesOut } from "./life-record";
import type { Body } from "./life-record";
import { findRecord } from "./life-store.server";
import type { IdKey } from "./life-store.server";
import { timeOut } from "./life-time";
import { Snapshot } from "./life-writer.server";

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

const lifeRevisions = (ref: string): Effect.Effect<Body, StoreFailure> =>
  pipe(
    lifeKeyOf(ref),
    Effect.flatMap(revisionsOf),
    Effect.map((revisions) => ({ ref, revisions })),
  );

export { lifeRevisions };
