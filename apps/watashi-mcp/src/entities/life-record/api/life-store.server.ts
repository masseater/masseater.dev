import { and, desc, eq, gte, inArray, like, lte, or } from "drizzle-orm";
import type { SQL } from "drizzle-orm";
import { Array as Arr, Effect, Option, Schema, pipe } from "effect";

import { RecordNotFound } from "#/shared/api/index.ts";
import { db, anyTermMatches, firstRow, query } from "#/shared/db/index.server.ts";
import { lifeRecord, NOT_RETRACTED } from "#/shared/db/index.ts";
import type { LifeRecordName, LifeRow, StorageFailed } from "#/shared/db/index.ts";

import { NONE, refOf } from "./life-record";
import type { Body } from "./life-record";

export type LifeEntry = Readonly<{ row: LifeRow; body: Body }>;

export type RecordScan = Readonly<{
  records: readonly LifeRecordName[];
  from: Option.Option<string>;
  to: Option.Option<string>;
  terms: readonly string[];
  limit: number;
}>;

export type LabelKey = Readonly<{ record: LifeRecordName; label: string }>;

export type OpenSpan = Readonly<{ about: string; startedBy: string }>;

export type OpenKey = LabelKey & OpenSpan;

type Newest = LabelKey & Readonly<{ open: Option.Option<OpenSpan> }>;

type Wanted = Omit<RecordScan, "limit"> & Readonly<{ label: Option.Option<string> }>;

type Page = Readonly<{ wanted: Wanted; limit: number; offset: number }>;

export type CappedScan = Readonly<{ entries: readonly LifeEntry[]; limited: Body }>;

export type IdKey = Readonly<{ record: LifeRecordName; id: number }>;

export const SCAN_LIMIT = 5000;

const ONE_ROW = 1;

const NO_OFFSET = 0;

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

const conditionsOf = ({
  records,
  from,
  to,
  terms,
  label,
}: Wanted): readonly (SQL | undefined)[] => [
  notRetracted,
  inArray(lifeRecord.record, [...records]),
  ...pipe(from, Option.map(endsAfter), Option.toArray),
  ...pipe(to, Option.map(startsBefore), Option.toArray),
  ...Option.toArray(termCondition(terms)),
  ...pipe(
    label,
    Option.map((value) => eq(lifeRecord.label, value)),
    Option.toArray,
  ),
];

const anyLabel = (scan: RecordScan): Wanted => ({ ...scan, label: Option.none() });

const wholeOf = (records: readonly LifeRecordName[], label: Option.Option<string>): Wanted => ({
  records,
  from: Option.none(),
  to: Option.none(),
  terms: [],
  label,
});

const pageOf = ({
  wanted,
  limit,
  offset,
}: Page): Effect.Effect<readonly LifeRow[], StorageFailed> =>
  query(() =>
    db
      .select()
      .from(lifeRecord)
      .where(and(...conditionsOf(wanted)))
      .orderBy(desc(lifeRecord.dayEnd), desc(lifeRecord.id))
      .limit(limit)
      .offset(offset),
  );

const rowsFrom = (
  wanted: Wanted,
  offset: number,
): Effect.Effect<readonly LifeRow[], StorageFailed> =>
  pageOf({ wanted, limit: SCAN_LIMIT, offset }).pipe(
    Effect.filterOrElse(
      (rows) => rows.length < SCAN_LIMIT,
      (rows) =>
        rowsFrom(wanted, offset + SCAN_LIMIT).pipe(Effect.map((rest) => [...rows, ...rest])),
    ),
  );

const everyEntry = (wanted: Wanted): Effect.Effect<readonly LifeEntry[], StorageFailed> =>
  rowsFrom(wanted, NO_OFFSET).pipe(Effect.flatMap(entriesOf));

export const scanRecords = (scan: RecordScan): Effect.Effect<readonly LifeEntry[], StorageFailed> =>
  pageOf({
    wanted: anyLabel(scan),
    limit: Math.min(scan.limit, SCAN_LIMIT),
    offset: NO_OFFSET,
  }).pipe(Effect.flatMap(entriesOf));

const limitedOf = (limit: number, found: number): Body => {
  if (found > limit) {
    return {
      notices: [
        {
          type: "scan_limit",
          note: `Only the newest ${limit} matching records were read, so older ones are missing from the result. Narrow the search to reach them.`,
        },
      ],
    };
  }
  return {};
};

export const scanCapped = (scan: RecordScan): Effect.Effect<CappedScan, StorageFailed> =>
  pageOf({ wanted: anyLabel(scan), limit: scan.limit + ONE_ROW, offset: NO_OFFSET }).pipe(
    Effect.flatMap((rows) =>
      entriesOf(Arr.take(rows, scan.limit)).pipe(
        Effect.map((entries) => ({ entries, limited: limitedOf(scan.limit, rows.length) })),
      ),
    ),
  );

export const findRecord = ({
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

const spanConditions = ({ about, startedBy }: OpenSpan): readonly (SQL | undefined)[] => [
  eq(lifeRecord.about, about),
  eq(lifeRecord.dayEnd, NONE),
  lte(lifeRecord.dayStart, startedBy),
];

const noConditions = (): readonly (SQL | undefined)[] => [];

const newestOf = ({
  record,
  label,
  open,
}: Newest): Effect.Effect<Option.Option<LifeEntry>, StorageFailed> => {
  const span = pipe(open, Option.map(spanConditions), Option.getOrElse(noConditions));
  const matches = and(
    notRetracted,
    eq(lifeRecord.record, record),
    eq(lifeRecord.label, label),
    ...span,
  );
  return query(() =>
    db.select().from(lifeRecord).where(matches).orderBy(desc(lifeRecord.id)).limit(ONE_ROW),
  ).pipe(Effect.flatMap(entriesOf), Effect.map(Arr.head));
};

export const findByLabel = (
  key: LabelKey,
): Effect.Effect<Option.Option<LifeEntry>, StorageFailed> =>
  newestOf({ ...key, open: Option.none() });

export const findOpen = ({
  about,
  startedBy,
  ...key
}: OpenKey): Effect.Effect<Option.Option<LifeEntry>, StorageFailed> =>
  newestOf({ ...key, open: Option.some({ about, startedBy }) });

export const scanAll = (
  records: readonly LifeRecordName[],
): Effect.Effect<readonly LifeEntry[], StorageFailed> =>
  everyEntry(wholeOf(records, Option.none()));

export const scanLabel = ({
  record,
  label,
}: LabelKey): Effect.Effect<readonly LifeEntry[], StorageFailed> =>
  everyEntry(wholeOf([record], Option.some(label)));
