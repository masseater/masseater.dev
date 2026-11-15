import { Array, HashMap, Option, String, pipe } from "effect";

import { pointerBytes, textAt, viewOf } from "./blend-blocks.ts";
import type { Block, Layout } from "./blend-blocks.ts";

interface Field {
  readonly offset: number;
  readonly size: number;
  readonly pointer: boolean;
  readonly count: number;
}

interface Struct {
  readonly size: number;
  readonly fields: HashMap.HashMap<string, Field>;
}

interface Dna {
  readonly structs: HashMap.HashMap<string, Struct>;
  readonly typeOf: readonly string[];
}

interface Reading {
  readonly bytes: Uint8Array;
  readonly little: boolean;
  readonly start: number;
}

interface Tables {
  readonly names: readonly string[];
  readonly types: readonly string[];
  readonly lengths: readonly number[];
  readonly pointer: number;
}

type Read<Value> = readonly [value: Value, next: number];

const DNA = "DNA1";
const TAG_BYTES = 4;
const INT_BYTES = 4;
const SHORT_BYTES = 2;
const FIELD_BYTES = 4;
const ALIGN = 4;
const NUL = 0;
const NEXT = 1;
const SINGLE = 1;
const POINTER_NAME = /^\(?\*/u;
const ARRAY_DIMENSION = /\[(?<length>\d+)\]/gu;
const BASE_NAME = /^[(*]*(?<base>\w+)/u;

const aligned = (reading: Reading, at: number): number =>
  reading.start + Math.ceil((at - reading.start) / ALIGN) * ALIGN;

const intAt = (reading: Reading, at: number): number =>
  viewOf(reading.bytes).getInt32(at, reading.little);

const shortAt = (reading: Reading, at: number): number =>
  viewOf(reading.bytes).getUint16(at, reading.little);

const hasTag = (reading: Reading, at: number, tag: string): boolean =>
  textAt({ bytes: reading.bytes, start: at, length: TAG_BYTES }) === tag;

const stringsAt = (reading: Reading, at: number): Read<readonly string[]> => {
  const slots = Array.makeBy(intAt(reading, at), () => NUL);
  const [end, values] = Array.mapAccum(slots, at + INT_BYTES, (start) => {
    const stop = reading.bytes.indexOf(NUL, start);
    return [stop + NEXT, textAt({ bytes: reading.bytes, start, length: stop - start })] as const;
  });
  return [values, aligned(reading, end)];
};

const lengthOf = (match: RegExpMatchArray): number =>
  pipe(
    Option.fromNullishOr(match.groups),
    Option.flatMap(({ length }) => Option.fromNullishOr(length)),
    Option.map(Number),
    Option.getOrElse(() => SINGLE),
  );

const countOf = (name: string): number => {
  let product = SINGLE;
  for (const match of String.matchAll(ARRAY_DIMENSION)(name)) {
    product *= lengthOf(match);
  }
  return product;
};

const baseOf = (name: string): string =>
  pipe(
    Option.fromNullishOr(BASE_NAME.exec(name)),
    Option.flatMap(({ groups }) => Option.fromNullishOr(groups)),
    Option.flatMap(({ base }) => Option.fromNullishOr(base)),
    Option.getOrElse(() => name),
  );

const fieldSize = (tables: Tables, type: number, name: string): number => {
  if (POINTER_NAME.test(name)) {
    return tables.pointer * countOf(name);
  }
  return (tables.lengths[type] ?? NUL) * countOf(name);
};

const fieldsAt = (
  reading: Reading,
  tables: Tables,
  at: number,
): Read<readonly (readonly [string, Field])[]> => {
  const count = shortAt(reading, at + SHORT_BYTES);
  const places = Array.makeBy(count, (index) => at + INT_BYTES + index * FIELD_BYTES);
  const [, fields] = Array.mapAccum(places, NUL, (offset, place) => {
    const name = tables.names[shortAt(reading, place + SHORT_BYTES)] ?? "";
    const size = fieldSize(tables, shortAt(reading, place), name);
    const field = { offset, size, pointer: POINTER_NAME.test(name), count: countOf(name) };
    return [offset + size, [baseOf(name), field] as const] as const;
  });
  return [fields, at + INT_BYTES + count * FIELD_BYTES];
};

const structsAt = (
  reading: Reading,
  tables: Tables,
  at: number,
): readonly (readonly [string, Struct])[] => {
  const slots = Array.makeBy(intAt(reading, at), () => NUL);
  const [, structs] = Array.mapAccum(slots, at + INT_BYTES, (start) => {
    const type = tables.types[shortAt(reading, start)] ?? "";
    const [fields, after] = fieldsAt(reading, tables, start);
    const size = pipe(
      Array.last(fields),
      Option.map(([, { offset, size: last }]) => offset + last),
      Option.getOrElse(() => NUL),
    );
    return [after, [type, { size, fields: HashMap.fromIterable(fields) }] as const] as const;
  });
  return structs;
};

const lengthsAt = (reading: Reading, at: number, count: number): Read<readonly number[]> => [
  Array.makeBy(count, (index) => shortAt(reading, at + index * SHORT_BYTES)),
  aligned(reading, at + count * SHORT_BYTES),
];

const tablesAt = (reading: Reading, layout: Layout): Option.Option<readonly [Tables, number]> => {
  const { start } = reading;
  if (!hasTag(reading, start, "SDNA") || !hasTag(reading, start + TAG_BYTES, "NAME")) {
    return Option.none();
  }
  const [names, typeTag] = stringsAt(reading, start + TAG_BYTES + TAG_BYTES);
  const [types, lengthTag] = stringsAt(reading, typeTag + TAG_BYTES);
  const [lengths, structTag] = lengthsAt(reading, lengthTag + TAG_BYTES, types.length);
  const tagged = hasTag(reading, typeTag, "TYPE") && hasTag(reading, lengthTag, "TLEN");
  const tables = { names, types, lengths, pointer: pointerBytes(layout) };
  return Option.liftPredicate(
    [tables, structTag + TAG_BYTES] as const,
    () => tagged && hasTag(reading, structTag, "STRC"),
  );
};

const parseDna = (reading: Reading, layout: Layout): Option.Option<Dna> =>
  Option.map(tablesAt(reading, layout), ([tables, at]) => {
    const structs = structsAt(reading, tables, at);
    const typeOf = pipe(
      structs,
      Array.map(([name]) => name),
    );
    return { structs: HashMap.fromIterable(structs), typeOf };
  });

const dnaOf = ({
  bytes,
  blocks,
  layout,
}: Readonly<{ bytes: Uint8Array; blocks: readonly Block[]; layout: Layout }>): Option.Option<Dna> =>
  pipe(
    blocks,
    Array.findFirst(({ code }) => code === DNA),
    Option.flatMap((block) =>
      parseDna({ bytes, little: layout.little, start: block.data }, layout),
    ),
  );

export { dnaOf };
export type { Dna, Field, Struct };
