import {
  Array as Arr,
  DateTime,
  Effect,
  Number as Num,
  Option,
  Schema,
  String as Str,
  pipe,
} from "effect";

import type { TraitOrigin } from "#/features/mcp/model/owner-trait.table";

import type { BatchSource } from "./trait-state";

type Collected = Readonly<{
  origin: TraitOrigin;
  batch: readonly BatchSource[];
  position: string;
}>;

type Packing<Item> = Readonly<{
  origin: TraitOrigin;
  items: readonly Item[];
  batchOf: (item: Item) => readonly BatchSource[];
  positionOf: (item: Item) => Effect.Effect<string>;
}>;

type Packed<Item> = Readonly<{ items: readonly Item[]; size: number; full: boolean }>;

const STEP_CHARACTERS = 60_000;

const SETTLE_MINUTES = 1;

const settledBefore: Effect.Effect<string> = DateTime.now.pipe(
  Effect.map(DateTime.subtract({ minutes: SETTLE_MINUTES })),
  Effect.map(DateTime.formatIso),
);

const RowPosition = Schema.Struct({ at: Schema.String, id: Schema.Int });

const ChunkPosition = Schema.Struct({
  at: Schema.String,
  sessionId: Schema.String,
  file: Schema.String,
  start: Schema.Int,
});

type RowPositionValue = typeof RowPosition.Type;

type ChunkPositionValue = typeof ChunkPosition.Type;

const ROW_START: RowPositionValue = { at: "", id: 0 };

const CHUNK_START: ChunkPositionValue = { at: "", sessionId: "", file: "", start: -1 };

const RowJson = Schema.fromJsonString(RowPosition);

const ChunkJson = Schema.fromJsonString(ChunkPosition);

const rowPositionFrom = (stored: Option.Option<string>): RowPositionValue =>
  pipe(
    stored,
    Option.flatMap(Schema.decodeUnknownOption(RowJson)),
    Option.getOrElse(() => ROW_START),
  );

const chunkPositionFrom = (stored: Option.Option<string>): ChunkPositionValue =>
  pipe(
    stored,
    Option.flatMap(Schema.decodeUnknownOption(ChunkJson)),
    Option.getOrElse(() => CHUNK_START),
  );

const rowPositionText = (position: RowPositionValue): Effect.Effect<string> =>
  Schema.encodeEffect(RowJson)(position).pipe(Effect.orDie);

const chunkPositionText = (position: ChunkPositionValue): Effect.Effect<string> =>
  Schema.encodeEffect(ChunkJson)(position).pipe(Effect.orDie);

const sizeOf = (batch: readonly BatchSource[]): number =>
  Num.sumAll(
    pipe(
      batch,
      Arr.map((item) => Str.length(item.source.text)),
    ),
  );

const packStep =
  <Item>(batchOf: (item: Item) => readonly BatchSource[]) =>
  (packed: Packed<Item>, item: Item): Packed<Item> => {
    if (packed.full) {
      return packed;
    }
    const size = packed.size + sizeOf(batchOf(item));
    if (Arr.isReadonlyArrayNonEmpty(packed.items) && size > STEP_CHARACTERS) {
      return { ...packed, full: true };
    }
    return { items: [...packed.items, item], size, full: false };
  };

const collect = <Item>({
  origin,
  items,
  batchOf,
  positionOf,
}: Packing<Item>): Effect.Effect<Option.Option<Collected>> => {
  const empty: Packed<Item> = { items: [], size: 0, full: false };
  const packed = Arr.reduce(items, empty, packStep(batchOf));
  return Option.match(Arr.last(packed.items), {
    onNone: () => Effect.succeedNone,
    onSome: (last) =>
      positionOf(last).pipe(
        Effect.map((position) =>
          Option.some({
            origin,
            batch: pipe(packed.items, Arr.flatMap(batchOf)),
            position,
          }),
        ),
      ),
  });
};

export {
  STEP_CHARACTERS,
  chunkPositionFrom,
  chunkPositionText,
  collect,
  rowPositionFrom,
  rowPositionText,
  settledBefore,
};
export type { ChunkPositionValue, Collected, RowPositionValue };
