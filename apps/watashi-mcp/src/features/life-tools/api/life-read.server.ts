import { Array as Arr, Effect, Option, pipe } from "effect";

import {
  lifeKeyOf,
  defaultOrder,
  factFilter,
  filtersOf,
  matchesAll,
  ordered,
  projected,
  DEFAULT_PERIODS,
  DEFAULT_READ_LIMIT,
  itemOf,
  dayBound,
  todayJst,
} from "#/entities/life-record";
import type { Body, Entry, LifeReadValue } from "#/entities/life-record";
import { SCAN_LIMIT, findRecord, scanCapped } from "#/entities/life-record/index.server";
import type { RecordScan } from "#/entities/life-record/index.server";
import type { StoreFailure } from "#/shared/api";
import { termsOf } from "#/shared/db/index.server";

import { extrasOf } from "./life-read-extras.server.ts";

type LifeRecordName = Entry["row"]["record"];

const DEFAULT_RECORDS: readonly LifeRecordName[] = [
  "life_event",
  "profile_fact",
  "owner_reflection",
];

const NO_QUERY = "";

const singleRecord = (input: LifeReadValue): Option.Option<LifeRecordName> =>
  pipe(
    Option.fromUndefinedOr(input.record),
    Option.filter((record): record is LifeRecordName => record !== "digest"),
  );

const scanOf = (input: LifeReadValue): RecordScan => ({
  records: Option.match(singleRecord(input), {
    onNone: () => DEFAULT_RECORDS,
    onSome: (record) => [record],
  }),
  from: dayBound("start")(input.from),
  to: dayBound("end")(input.to),
  terms: termsOf(input.query ?? NO_QUERY),
  limit: SCAN_LIMIT,
});

const keptOf =
  (input: LifeReadValue, today: string) =>
  (entries: readonly Entry[]): readonly Entry[] => {
    const view = {
      asOf: dayBound("start")(input.asOf),
      withHistory: input.withHistory ?? false,
      today,
    };
    const filters = [...filtersOf(input), factFilter(view)];
    return pipe(entries, Arr.filter(matchesAll(filters)));
  };

const pageOf =
  (input: LifeReadValue, terms: readonly string[]) =>
  (kept: readonly Entry[]): readonly Entry[] => {
    const order = input.order ?? defaultOrder(terms);
    return pipe(ordered({ order, terms })(kept), Arr.take(input.limit ?? DEFAULT_READ_LIMIT));
  };

const projectedItems =
  (input: LifeReadValue) =>
  (items: readonly Body[]): readonly Body[] =>
    pipe(
      Option.fromUndefinedOr(input.fields),
      Option.match({
        onNone: () => items,
        onSome: (fields) => pipe(items, Arr.map(projected(fields))),
      }),
    );

const readList =
  (input: LifeReadValue) =>
  (today: string): Effect.Effect<Body, StoreFailure> =>
    Effect.gen(function* readLifeRecords() {
      const scan = scanOf(input);
      const scanned = yield* scanCapped(scan);
      const kept = keptOf(input, today)(scanned.entries);
      const page = pageOf(input, scan.terms)(kept);
      const extras = yield* extrasOf({
        record: singleRecord(input),
        about: Option.fromUndefinedOr(input.about),
        periods: input.periods ?? DEFAULT_PERIODS,
        page,
        kept,
        today,
      });
      const items = projectedItems(input)(extras.items);
      return { total: Arr.length(kept), items, ...extras.summary, ...scanned.limited };
    });

const readOne =
  (today: string) =>
  (ref: string): Effect.Effect<Body, StoreFailure> =>
    lifeKeyOf(ref).pipe(
      Effect.flatMap(findRecord),
      Effect.map((entry) => ({ total: 1, items: [itemOf(today)(entry)] })),
    );

const lifeRead = (input: LifeReadValue): Effect.Effect<Body, StoreFailure> =>
  todayJst.pipe(
    Effect.flatMap((today) =>
      Option.match(Option.fromUndefinedOr(input.ref), {
        onNone: () => readList(input)(today),
        onSome: readOne(today),
      }),
    ),
  );

export { lifeRead };
