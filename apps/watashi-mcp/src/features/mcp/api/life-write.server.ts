import { Array as Arr, Effect, pipe } from "effect";

import type { StoreFailure } from "#/features/mcp/model/tool-failure";

import { changeItem } from "./life-change.server";
import type { ItemResult } from "./life-checks";
import {
  createEvent,
  createItem,
  plainInsert,
  upsertDefinition,
  upsertMedia,
} from "./life-create.server";
import type { Creators } from "./life-create.server";
import { createFact } from "./life-fact.server";
import type { ChangeValue, WriteItemValue } from "./life-input";
import type { Notice } from "./life-vocabulary.server";
import type { Writer } from "./life-writer.server";

type WriteResult = Readonly<{ written: readonly string[]; notices: readonly Notice[] }>;

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

const isChange = (item: WriteItemValue): item is ChangeValue => "ref" in item;

const writeItem =
  (writer: Writer) =>
  (item: WriteItemValue): Effect.Effect<ItemResult, StoreFailure> => {
    if (isChange(item)) {
      return changeItem(writer)(item);
    }
    return createItem({ writer, creators: CREATORS })(item);
  };

const resultOf = (results: readonly ItemResult[]): WriteResult => ({
  written: pipe(
    results,
    Arr.map((result) => result.ref),
  ),
  notices: pipe(
    results,
    Arr.flatMap((result) => result.notices),
  ),
});

const writeLife =
  (writer: Writer) =>
  (records: readonly WriteItemValue[]): Effect.Effect<WriteResult, StoreFailure> =>
    pipe(records, Effect.forEach(writeItem(writer)), Effect.map(resultOf));

export { writeLife };
export type { WriteResult };
