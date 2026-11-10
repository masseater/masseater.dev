import { Array as Arr, Effect, Option, Predicate, Record as Rec, pipe } from "effect";

import type { InvalidRecord } from "#/features/mcp/model/invalid-record";
import type { LifeRecordName, Source } from "#/features/mcp/model/life-record.table";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import { assumedNotices, normalize, validateBody } from "./life-checks";
import type { ItemResult } from "./life-checks";
import type { ChangeValue, WriteItemValue } from "./life-input";
import { columnsOf, lower, refOf, textAt, withDefaults } from "./life-record";
import type { Body } from "./life-record";
import { findByLabel, scanAll, scanRecords } from "./life-store.server";
import type { LifeEntry } from "./life-store.server";
import { vocabularyNotices } from "./life-vocabulary.server";
import type { Notice, ValuesCheck } from "./life-vocabulary.server";
import { insertRecord, replaceRecord, snapshotOf } from "./life-writer.server";
import type { NewRecord, Writer } from "./life-writer.server";

type CreateItem = Exclude<WriteItemValue, ChangeValue>;

type CreateFailure = InvalidRecord | StorageFailed;

type Prepared = Readonly<{ input: NewRecord; assumed: readonly string[] }>;

type Creator = (writer: Writer) => (input: NewRecord) => Effect.Effect<ItemResult, CreateFailure>;

const DUPLICATE_SCAN = 200;

const sourceOf = (item: CreateItem): Source => {
  if ("source" in item) {
    return item.source;
  }
  return "definition";
};

const bodyOf = (item: CreateItem): Body => {
  const fields: Body = item;
  return pipe(fields, Rec.remove("record"), Rec.remove("source"));
};

const plainInsert: Creator = (writer) => (input) =>
  insertRecord(writer)(input).pipe(
    Effect.map((id) => ({ ref: refOf({ record: input.record, id }), notices: [] })),
  );

const updatedExisting =
  (writer: Writer, entry: LifeEntry) =>
  (body: Body): Effect.Effect<ItemResult, StorageFailed> => {
    const ref = refOf(entry.row);
    return replaceRecord(writer)({
      entry,
      snapshot: { ...snapshotOf(entry), body },
      op: "update",
    }).pipe(
      Effect.as({
        ref,
        notices: [
          { type: "updated_existing", ref, note: "An existing record matched, so it was updated." },
        ],
      }),
    );
  };

const isSameEvent =
  (body: Body) =>
  (entry: LifeEntry): boolean =>
    entry.row.label === textAt("kind")(body) &&
    lower(textAt("text")(entry.body)) === lower(textAt("text")(body));

const duplicateNotice =
  (ref: string) =>
  (entry: LifeEntry): Notice => ({
    type: "possible_duplicate",
    ref,
    existing: refOf(entry.row),
    note: "The same event may already exist. Ask the owner which one to keep, then retract the other.",
  });

const duplicatesOf = (body: Body): Effect.Effect<readonly LifeEntry[], StorageFailed> => {
  const day = Option.some(columnsOf("life_event")(body).dayEnd);
  const same = isSameEvent(body);
  return scanRecords({
    records: ["life_event"],
    from: day,
    to: day,
    terms: [],
    limit: DUPLICATE_SCAN,
  }).pipe(Effect.map(Arr.filter(same)));
};

const createEvent: Creator = (writer) => (input) =>
  Effect.gen(function* createLifeEvent() {
    const vocabulary = yield* vocabularyNotices(writer)(input.body);
    const duplicates = yield* duplicatesOf(input.body);
    const { ref } = yield* plainInsert(writer)(input);
    const duplicateNotices = pipe(duplicates, Arr.map(duplicateNotice(ref)));
    return { ref, notices: [...vocabulary, ...duplicateNotices] };
  });

const idsOf = (body: Body): Body =>
  pipe(
    Rec.get(body, "ids"),
    Option.filter(Predicate.isObject),
    Option.getOrElse((): Body => ({})),
  );

const sharesId =
  (body: Body) =>
  (entry: LifeEntry): boolean => {
    const theirs = idsOf(entry.body);
    return pipe(
      Rec.toEntries(idsOf(body)),
      Arr.some(([key, value]) => Rec.get(theirs, key).pipe(Option.contains(value))),
    );
  };

const sharesTitle =
  (body: Body) =>
  (entry: LifeEntry): boolean =>
    entry.row.label === textAt("mediaType")(body) &&
    lower(textAt("title")(entry.body)) === lower(textAt("title")(body));

const mergedMedia = (entry: LifeEntry, body: Body): Body => ({
  ...entry.body,
  ...body,
  ids: { ...idsOf(entry.body), ...idsOf(body) },
});

const upsertMedia: Creator = (writer) => (input) =>
  scanAll(["media_item"]).pipe(
    Effect.map(
      Arr.findFirst((entry) => sharesId(input.body)(entry) || sharesTitle(input.body)(entry)),
    ),
    Effect.flatMap(
      Option.match({
        onNone: () => plainInsert(writer)(input),
        onSome: (entry) => updatedExisting(writer, entry)(mergedMedia(entry, input.body)),
      }),
    ),
  );

const upsertDefinition: Creator = (writer) => (input) =>
  findByLabel({ record: input.record, label: columnsOf(input.record)(input.body).label }).pipe(
    Effect.flatMap(
      Option.match({
        onNone: () => plainInsert(writer)(input),
        onSome: (entry) => updatedExisting(writer, entry)({ ...entry.body, ...input.body }),
      }),
    ),
  );

type Creators = Readonly<Record<LifeRecordName, Creator>>;

const preparedOf = (item: CreateItem): Effect.Effect<Prepared, InvalidRecord> =>
  Effect.gen(function* prepareLifeRecord() {
    const { record } = item;
    const { body, assumed } = yield* normalize(record)(withDefaults(record)(bodyOf(item)));
    const valid = yield* validateBody(record)(body);
    return { input: { record, source: sourceOf(item), body: valid }, assumed };
  });

const checkCreate =
  (checkValues: ValuesCheck) =>
  (item: CreateItem): Effect.Effect<void, CreateFailure> =>
    preparedOf(item).pipe(Effect.flatMap(({ input }) => checkValues(input)));

const createItem =
  ({ writer, creators }: Readonly<{ writer: Writer; creators: Creators }>) =>
  (item: CreateItem): Effect.Effect<ItemResult, CreateFailure> =>
    Effect.gen(function* createLifeRecord() {
      const { input, assumed } = yield* preparedOf(item);
      const result = yield* creators[input.record](writer)(input);
      return { ...result, notices: [...result.notices, ...assumedNotices(result.ref)(assumed)] };
    });

export { checkCreate, createEvent, createItem, plainInsert, upsertDefinition, upsertMedia };
export type { CreateFailure, CreateItem, Creator, Creators };
