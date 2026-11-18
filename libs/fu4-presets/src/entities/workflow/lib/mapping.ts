import type { Position, YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Order, Record as Rec, String as Str, pipe } from "effect";

import { quote } from "#/shared/text/index.ts";
import { describePosition, pairsOf } from "#/shared/yaml/index.ts";
import type { Text } from "#/shared/yaml/index.ts";

import { parseString } from "./scalar.ts";
import type { Sink } from "./sink.ts";

export interface Entry {
  readonly id: string;
  readonly key: Text;
  readonly value: YamlNode;
}

export interface MappingInput {
  readonly place: string;
  readonly node: YamlNode;
  readonly allowEmpty: boolean;
  readonly caseSensitive: boolean;
}

const MERGE_KEY = "<<";
const EMPTY = 0;

const emptyMessage = (place: string): string =>
  `${place} should not be empty. please remove this section if it's unnecessary`;

const caseNote = (caseSensitive: boolean): string => {
  if (caseSensitive) {
    return "";
  }
  return ". note that this key is case insensitive";
};

const duplicateMessage = (input: MappingInput, key: Text, previous: Position): string => {
  const note = caseNote(input.caseSensitive);
  return `key ${quote(key.value)} is duplicated in ${input.place}. previously defined at ${describePosition(previous)}${note}`;
};

const idOf = (input: MappingInput, key: Text): string => {
  if (input.caseSensitive) {
    return key.value;
  }
  return Str.toLowerCase(key.value);
};

interface Collected {
  readonly seen: Readonly<Record<string, Position>>;
  readonly entries: readonly Entry[];
}

const collectPair =
  (sink: Sink, input: MappingInput) =>
  (collected: Collected, pair: { readonly key: YamlNode; readonly value: YamlNode }): Collected => {
    const key = parseString(sink)(pair.key, false);
    const id = idOf(input, key);
    if (key.value === MERGE_KEY) {
      sink.error(key, `GitHub Actions does not support YAML merge key "${MERGE_KEY}"`);
      return collected;
    }
    return Option.match(Rec.get(collected.seen, id), {
      onSome: (previous) => {
        sink.error(key, duplicateMessage(input, key, previous));
        return collected;
      },
      onNone: () => ({
        seen: { ...collected.seen, [id]: key },
        entries: [...collected.entries, { id, key, value: pair.value }],
      }),
    });
  };

const nonMapping = (sink: Sink, input: MappingInput): boolean => {
  const { node, place } = input;
  if (node.kind === "scalar" && node.tag === "!!null") {
    if (!input.allowEmpty) {
      sink.error(node, emptyMessage(place));
    }
    return true;
  }
  if (node.kind !== "mapping") {
    sink.error(node, `${place} is ${node.kind} node but mapping node is expected`);
    return true;
  }
  return false;
};

export const parseMapping =
  (sink: Sink) =>
  (input: MappingInput): readonly Entry[] => {
    if (nonMapping(sink, input)) {
      return [];
    }
    const { entries } = Arr.reduce(
      pairsOf(input.node),
      { seen: {}, entries: [] } satisfies Collected,
      collectPair(sink, input),
    );
    if (!input.allowEmpty && entries.length === EMPTY) {
      sink.error(input.node, emptyMessage(input.place));
    }
    return entries;
  };

export interface SectionInput {
  readonly section: string;
  readonly node: YamlNode;
  readonly allowEmpty: boolean;
  readonly caseSensitive: boolean;
}

export const parseSection =
  (sink: Sink) =>
  (input: SectionInput): readonly Entry[] =>
    parseMapping(sink)({ ...input, place: `${quote(input.section)} section` });

export const sortedRecord = <Value>(
  entries: readonly (readonly [string, Value])[],
): Readonly<Record<string, Value>> =>
  Rec.fromEntries(
    Arr.sort(
      entries,
      Order.mapInput(Order.String, ([key]: readonly [string, Value]) => key),
    ),
  );

export const entryRecord =
  <Value>(parse: (entry: Entry) => Value) =>
  (entries: readonly Entry[]): Readonly<Record<string, Value>> =>
    sortedRecord(
      pipe(
        entries,
        Arr.map((entry): readonly [string, Value] => [entry.id, parse(entry)]),
      ),
    );
