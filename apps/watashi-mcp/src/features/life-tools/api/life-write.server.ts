import { Array as Arr, Effect, String as Str, pipe } from "effect";

import { checkEventValues } from "#/entities/life-record/index.server.ts";
import type { Notice, ValuesCheck, Writer } from "#/entities/life-record/index.server.ts";
import type { ItemResult, ChangeValue, WriteItemValue } from "#/entities/life-record/index.ts";
import type { StoreFailure } from "#/shared/api/index.ts";

import { changeItem, checkChange } from "./life-change.server.ts";
import {
  checkCreate,
  createEvent,
  createItem,
  plainInsert,
  upsertDefinition,
  upsertMedia,
} from "./life-create.server.ts";
import type { Creators } from "./life-create.server.ts";
import { createFact } from "./life-fact.server.ts";
import { locating } from "./life-write-failure.ts";

export type WriteResult = Readonly<{ written: readonly string[]; notices: readonly Notice[] }>;

const CREATORS: Creators = {
  life_event: createEvent,
  media_item: upsertMedia,
  profile_fact: createFact,
  metric_goal: plainInsert,
  owner_reflection: plainInsert,
  todo: plainInsert,
  event_kind: upsertDefinition,
  metric_definition: upsertDefinition,
};

const KIND_REF_PREFIX = "event_kind:";

const skipValues: ValuesCheck = () => Effect.void;

const isChange = (item: WriteItemValue): item is ChangeValue => "ref" in item;

const writeItem =
  (writer: Writer) =>
  (item: WriteItemValue): Effect.Effect<ItemResult, StoreFailure> => {
    if (isChange(item)) {
      return changeItem(writer)(item);
    }
    return createItem({ writer, creators: CREATORS })(item);
  };

const checkItem =
  (checkValues: ValuesCheck) =>
  (item: WriteItemValue): Effect.Effect<void, StoreFailure> => {
    if (isChange(item)) {
      return checkChange(checkValues)(item);
    }
    return checkCreate(checkValues)(item);
  };

const definesKind = (item: WriteItemValue): boolean => {
  if (isChange(item)) {
    return Str.startsWith(KIND_REF_PREFIX)(item.ref);
  }
  return item.record === "event_kind";
};

const valuesCheckFor = (records: readonly WriteItemValue[]): ValuesCheck => {
  if (pipe(records, Arr.some(definesKind))) {
    return skipValues;
  }
  return checkEventValues;
};

const refsOf = (results: readonly ItemResult[]): readonly string[] =>
  pipe(
    results,
    Arr.map((result) => result.ref),
  );

const checkAll = (records: readonly WriteItemValue[]): Effect.Effect<void, StoreFailure> => {
  const check = checkItem(valuesCheckFor(records));
  return Effect.forEach(
    records,
    (item, index) => check(item).pipe(locating({ index, written: [] })),
    { discard: true },
  );
};

const writeNext =
  (writer: Writer) =>
  (
    done: readonly ItemResult[],
    item: WriteItemValue,
    index: number,
  ): Effect.Effect<readonly ItemResult[], StoreFailure> => {
    const written = refsOf(done);
    return writeItem(writer)(item).pipe(
      locating({ index, written }),
      Effect.map((result) => [...done, result]),
    );
  };

const writeAll =
  (writer: Writer) =>
  (records: readonly WriteItemValue[]): Effect.Effect<readonly ItemResult[], StoreFailure> =>
    Effect.reduce(records, Arr.empty<ItemResult>, writeNext(writer));

const resultOf = (results: readonly ItemResult[]): WriteResult => ({
  written: refsOf(results),
  notices: pipe(
    results,
    Arr.flatMap((result) => result.notices),
  ),
});

export const writeLife =
  (writer: Writer) =>
  (records: readonly WriteItemValue[]): Effect.Effect<WriteResult, StoreFailure> =>
    checkAll(records).pipe(Effect.andThen(writeAll(writer)(records)), Effect.map(resultOf));
