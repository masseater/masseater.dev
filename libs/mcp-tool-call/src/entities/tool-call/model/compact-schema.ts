import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import { Array as Arr, Equal, Predicate, Record as Rec, pipe } from "effect";

type JsonObject = Readonly<Record<string, unknown>>;

type Converter = StandardSchemaWithJSON["~standard"]["jsonSchema"];

const SCHEMA_MAPS: ReadonlySet<string> = new Set([
  "properties",
  "patternProperties",
  "$defs",
  "dependentSchemas",
]);

const LITERALS: ReadonlySet<string> = new Set(["const", "default", "enum", "examples"]);

const SAFE_INTEGER_BOUNDS: ReadonlySet<unknown> = new Set([
  Number.MAX_SAFE_INTEGER,
  Number.MIN_SAFE_INTEGER,
]);

const isOpen = (value: unknown): boolean =>
  value === true || (Predicate.isObject(value) && Rec.isEmptyRecord(value));

const isNoise = (value: unknown, key: string): boolean =>
  key === "$schema" ||
  (key === "additionalProperties" && isOpen(value)) ||
  ((key === "minimum" || key === "maximum") && SAFE_INTEGER_BOUNDS.has(value));

const isBareObject = (value: unknown): boolean =>
  Predicate.isObject(value) &&
  value["type"] === "object" &&
  Arr.every(Rec.keys(value), (key) => key === "type");

const isKept = (item: unknown): boolean => !isBareObject(item);

const withoutBareAllOf = (node: JsonObject): JsonObject => {
  const { allOf } = node;
  if (!Arr.isArray(allOf)) {
    return node;
  }
  const kept = pipe(allOf, Arr.filter(isKept));
  if (Arr.isReadonlyArrayEmpty(kept)) {
    return Rec.remove(node, "allOf");
  }
  return { ...node, allOf: kept };
};

const withoutRepeatedPrefix = (node: JsonObject): JsonObject => {
  const { prefixItems, items } = node;
  const repeatsItems = (item: unknown): boolean => Equal.equals(item, items);
  if (!Arr.isArray(prefixItems) || !pipe(prefixItems, Arr.every(repeatsItems))) {
    return node;
  }
  return Rec.remove(node, "prefixItems");
};

type Recurse = (value: unknown) => unknown;

const compactEntry =
  (recurse: Recurse) =>
  (value: unknown, key: string): unknown => {
    if (LITERALS.has(key)) {
      return value;
    }
    if (SCHEMA_MAPS.has(key) && Predicate.isObject(value)) {
      return pipe(value, Rec.map(recurse));
    }
    return recurse(value);
  };

export const compactJsonSchema = (node: JsonObject): JsonObject => {
  const recurse: Recurse = (value) => {
    if (Arr.isArray(value)) {
      return pipe(value, Arr.map(recurse));
    }
    if (Predicate.isObject(value)) {
      return compactJsonSchema(value);
    }
    return value;
  };
  return pipe(
    node,
    Rec.filter((value, key) => !isNoise(value, key)),
    Rec.map(compactEntry(recurse)),
    withoutBareAllOf,
    withoutRepeatedPrefix,
  );
};

const compactConverter = (converter: Converter): Converter => ({
  input: (options) => ({ ...compactJsonSchema(converter.input(options)) }),
  output: (options) => ({ ...compactJsonSchema(converter.output(options)) }),
});

export const compactInput = <Input, Output>(
  schema: StandardSchemaWithJSON<Input, Output>,
): StandardSchemaWithJSON<Input, Output> => ({
  "~standard": {
    ...schema["~standard"],
    jsonSchema: compactConverter(schema["~standard"].jsonSchema),
  },
});
