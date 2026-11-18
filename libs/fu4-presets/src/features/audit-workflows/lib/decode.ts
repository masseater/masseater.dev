import type { YamlNode } from "@r_masseater/fu4";
import { Array as Arr, Option, Result, String as Str, pipe } from "effect";

import { isNull, pairsOf } from "#/shared/yaml/index.ts";

export type Decoder<Value> = (node: YamlNode) => Result.Result<Value, string>;

export interface Fields {
  readonly node: YamlNode;
  readonly entries: ReadonlyMap<string, YamlNode>;
}

const NUMERIC = new Set(["!!int", "!!float"]);

export const isString = (node: YamlNode): boolean => node.kind === "scalar" && node.tag === "!!str";

const mismatch = (node: YamlNode, expected: string): string =>
  `invalid type at line ${String(node.line)}: expected ${expected}`;

export const string: Decoder<string> = (node) =>
  Result.liftPredicate(
    node.value,
    () => isString(node),
    () => mismatch(node, "a string"),
  );

export const anyScalar: Decoder<string> = (node) =>
  Result.liftPredicate(
    node.value,
    () => node.kind === "scalar" && !isNull(node),
    () => mismatch(node, "a string"),
  );

export const boolean: Decoder<boolean> = (node) =>
  Result.liftPredicate(
    Str.toLowerCase(node.value) === "true",
    () => node.kind === "scalar" && node.tag === "!!bool",
    () => mismatch(node, "a boolean"),
  );

export const number: Decoder<number> = (node) =>
  Result.liftPredicate(
    Number(node.value),
    () => node.kind === "scalar" && NUMERIC.has(node.tag),
    () => mismatch(node, "a number"),
  );

export const unit: Decoder<true> = (node) =>
  Result.liftPredicate(
    true as const,
    () => isNull(node),
    () => mismatch(node, "null"),
  );

export const literal =
  <const Value extends string>(values: readonly Value[]): Decoder<Value> =>
  (node) =>
    Result.flatMap(string(node), (value) =>
      Result.fromOption(
        Arr.findFirst(values, (each) => each === value),
        () => `unknown variant \`${value}\``,
      ),
    );

export const sequence =
  <Value>(item: Decoder<Value>): Decoder<readonly Value[]> =>
  (node) => {
    if (node.kind !== "sequence") {
      return Result.fail(mismatch(node, "a sequence"));
    }
    return Result.all(pipe(node.children, Arr.map(item)));
  };

export const entriesOf = (
  node: YamlNode,
): Result.Result<readonly (readonly [string, YamlNode])[], string> => {
  if (node.kind !== "mapping") {
    return Result.fail(mismatch(node, "a mapping"));
  }
  return Result.all(
    Arr.map(pairsOf(node), (pair) =>
      Result.map(string(pair.key), (key) => [key, pair.value] as const),
    ),
  );
};

const entryOf =
  <Value>(value: Decoder<Value>) =>
  ([key, each]: readonly [string, YamlNode]): Result.Result<readonly [string, Value], string> =>
    pipe(
      value(each),
      Result.map((decoded) => [key, decoded] as const),
    );

export const record =
  <Value>(value: Decoder<Value>): Decoder<ReadonlyMap<string, Value>> =>
  (node) => {
    const entry = entryOf(value);
    return pipe(
      entriesOf(node),
      Result.flatMap((entries) => Result.all(pipe(entries, Arr.map(entry)))),
      Result.map((decoded) => new Map(decoded)),
    );
  };

export const fieldsOf = (node: YamlNode): Result.Result<Fields, string> =>
  Result.flatMap(entriesOf(node), (entries) => {
    const keys = pipe(
      entries,
      Arr.map(([key]) => key),
    );
    const duplicate = Arr.findFirst(keys, (key, index) => keys.indexOf(key) !== index);
    if (Option.isSome(duplicate)) {
      return Result.fail(`duplicate field \`${duplicate.value}\``);
    }
    return Result.succeed({ node, entries: new Map(entries) });
  });

export const nodeAt =
  (fields: Fields) =>
  (name: string): Option.Option<YamlNode> =>
    Option.fromNullishOr(fields.entries.get(name));

export const required =
  (name: string) =>
  <Value>(decoder: Decoder<Value>) =>
  (fields: Fields): Result.Result<Value, string> =>
    Option.match(nodeAt(fields)(name), {
      onNone: () => Result.fail(`missing field \`${name}\``),
      onSome: decoder,
    });

export const optional =
  (name: string) =>
  <Value>(decoder: Decoder<Value>) =>
  (fields: Fields): Result.Result<Option.Option<Value>, string> =>
    Option.match(
      pipe(
        nodeAt(fields)(name),
        Option.filter((node) => !isNull(node)),
      ),
      {
        onNone: () => Result.succeed(Option.none()),
        onSome: (node) => Result.map(decoder(node), Option.some),
      },
    );

export const defaulted =
  (name: string) =>
  <Value>(decoder: Decoder<Value>) =>
  (fallback: () => NoInfer<Value>) =>
  (fields: Fields): Result.Result<Value, string> =>
    Option.match(nodeAt(fields)(name), {
      onNone: () => Result.succeed(fallback()),
      onSome: decoder,
    });

export const untagged =
  <Value>(...decoders: readonly Decoder<Value>[]): Decoder<Value> =>
  (node) =>
    pipe(
      decoders,
      Arr.map((decoder) => decoder(node)),
      Arr.findFirst(Result.isSuccess),
      Option.getOrElse(() =>
        Result.fail(`data did not match any variant at line ${String(node.line)}`),
      ),
    );

export const scalarOrVector = <Value>(item: Decoder<Value>): Decoder<readonly Value[]> =>
  untagged<readonly Value[]>((node) => Result.map(item(node), Arr.of), sequence(item));

export const map =
  <Value>(decoder: Decoder<Value>) =>
  <Output>(transform: (value: Value) => Output): Decoder<Output> =>
  (node) =>
    Result.map(decoder(node), transform);

export const struct =
  <Value>(build: (fields: Fields) => Result.Result<Value, string>): Decoder<Value> =>
  (node) =>
    Result.flatMap(fieldsOf(node), build);
