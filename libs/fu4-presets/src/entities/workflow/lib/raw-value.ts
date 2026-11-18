import type { YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, pipe } from "effect";

import type { RawValue } from "#/entities/workflow/model/job-types.ts";

import { parseMapping, sortedRecord } from "./mapping.ts";
import type { Entry } from "./mapping.ts";
import type { Sink } from "./sink.ts";

export const rawEntries =
  <Value>(parse: (entry: Entry) => Option.Option<Value>) =>
  (entries: readonly Entry[]): Readonly<Record<string, Value>> =>
    sortedRecord(
      pipe(
        entries,
        Arr.flatMap((entry) =>
          pipe(
            parse(entry),
            Option.map((value): readonly [string, Value] => [entry.id, value]),
            Option.toArray,
          ),
        ),
      ),
    );

type Parse = (node: YamlNode) => Option.Option<RawValue>;

const rawArray = (node: YamlNode, parse: Parse): RawValue => ({
  line: node.line,
  column: node.column,
  type: "array",
  elems: pipe(
    node.children,
    Arr.flatMap((child) => Option.toArray(parse(child))),
  ),
});

const rawObject = (sink: Sink, node: YamlNode, parse: Parse): RawValue => {
  const entries = parseMapping(sink)({
    place: "matrix row value",
    node,
    allowEmpty: true,
    caseSensitive: false,
  });
  return {
    line: node.line,
    column: node.column,
    type: "object",
    props: rawEntries((entry) => parse(entry.value))(entries),
  };
};

export const parseRawValue =
  (sink: Sink) =>
  (node: YamlNode): Option.Option<RawValue> => {
    if (node.kind === "scalar") {
      return Option.some({
        line: node.line,
        column: node.column,
        type: "string",
        value: node.value,
      });
    }
    if (node.kind === "sequence") {
      return Option.some(rawArray(node, parseRawValue(sink)));
    }
    if (node.kind === "mapping") {
      return Option.some(rawObject(sink, node, parseRawValue(sink)));
    }
    sink.error(node, `unexpected ${node.kind} node on parsing value in matrix row`);
    return Option.none();
  };
