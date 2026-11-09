import { and, desc, eq, gte, inArray, like, lte, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import { lifeRecord, NOT_RETRACTED } from "#/features/mcp/model/life-record.table";
import type { LifeRecordName, LifeRow } from "#/features/mcp/model/life-record.table";
import { RecordNotFound } from "#/features/mcp/model/record-not-found";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";
import { db } from "#/shared/db/index.server";

import { NONE, refOf } from "./life-record";
import type { Body } from "./life-record";
import { anyTermMatches, firstRow, query } from "./storage.server";

type LifeEntry = Readonly<{ row: LifeRow; body: Body }>;

type RecordScan = Readonly<{
  records: readonly LifeRecordName[];
  from: Option.Option<string>;
  to: Option.Option<string>;
  terms: readonly string[];
  limit: number;
}>;

type LabelKey = Readonly<{ record: LifeRecordName; label: string }>;

type IdKey = Readonly<{ record: LifeRecordName; id: number }>;

const SCAN_LIMIT = 5000;

const ONE_ROW = 1;

const decodeBody = Schema.decodeUnknownEffect(
  Schema.fromJsonString(Schema.Record(Schema.String, Schema.Unknown)),
);

const entryOf = (row: LifeRow): Effect.Effect<LifeEntry> =>
  decodeBody(row.body).pipe(
    Effect.orDie,
    Effect.map((body) => ({ row, body })),
  );

const entriesOf = (rows: readonly LifeRow[]): Effect.Effect<readonly LifeEntry[]> =>
  pipe(rows, Effect.forEach(entryOf));

const notRetracted = eq(lifeRecord.retractedAt, NOT_RETRACTED);

const endsAfter = (from: string): SQL | undefined =>
  or(eq(lifeRecord.dayEnd, NONE), gte(lifeRecord.dayEnd, from));

const startsBefore = (to: string): SQL | undefined =>
  or(eq(lifeRecord.dayStart, NONE), lte(lifeRecord.dayStart, to));

const termCondition = (terms: readonly string[]): Option.Option<SQL> =>
  anyTermMatches((pattern) => [like(lifeRecord.searchText, pattern)])(terms);

const scanConditions = ({ records, from, to, terms }: RecordScan): readonly (SQL | undefined)[] => [
  notRetracted,
  inArray(lifeRecord.record, [...records]),
  ...pipe(from, Option.map(endsAfter), Option.toArray),
  ...pipe(to, Option.map(startsBefore), Option.toArray),
  ...Option.toArray(termCondition(terms)),
];

const scanRecords = (scan: RecordScan): Effect.Effect<readonly LifeEntry[], StorageFailed> =>
  query(() =>
    db
      .select()
      .from(lifeRecord)
      .where(and(...scanConditions(scan)))
      .orderBy(desc(lifeRecord.dayEnd), desc(lifeRecord.id))
      .limit(Math.min(scan.limit, SCAN_LIMIT)),
  ).pipe(Effect.flatMap(entriesOf));

const findRecord = ({
  record,
  id,
}: IdKey): Effect.Effect<LifeEntry, RecordNotFound | StorageFailed> =>
  query(() =>
    db
      .select()
      .from(lifeRecord)
      .where(and(eq(lifeRecord.record, record), eq(lifeRecord.id, id))),
  ).pipe(
    Effect.flatMap(firstRow(() => RecordNotFound.make({ ref: refOf({ record, id }) }))),
    Effect.flatMap(entryOf),
  );

const findByLabel = ({
  record,
  label,
}: LabelKey): Effect.Effect<Option.Option<LifeEntry>, StorageFailed> =>
  query(() =>
    db
      .select()
      .from(lifeRecord)
      .where(and(notRetracted, eq(lifeRecord.record, record), eq(lifeRecord.label, label)))
      .orderBy(desc(lifeRecord.id))
      .limit(ONE_ROW),
  ).pipe(Effect.flatMap(entriesOf), Effect.map(Arr.head));

const scanAll = (
  records: readonly LifeRecordName[],
): Effect.Effect<readonly LifeEntry[], StorageFailed> =>
  scanRecords({ records, from: Option.none(), to: Option.none(), terms: [], limit: SCAN_LIMIT });

export { SCAN_LIMIT, findByLabel, findRecord, scanAll, scanRecords };
export type { IdKey, LabelKey, LifeEntry, RecordScan };
