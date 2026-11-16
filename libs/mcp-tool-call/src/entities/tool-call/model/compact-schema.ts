import type { StandardSchemaWithJSON } from "@modelcontextprotocol/server";
import { Array as Arr, Equal, Predicate, Record as Rec, pipe } from "effect";

type JsonObject = Record<string, unknown>;

type Converter = StandardSchemaWithJSON["~standard"]["jsonSchema"];

const SCHEMA_MAPS: readonly string[] = [
  "properties",
  "patternProperties",
  "$defs",
  "dependentSchemas",
];

const LITERALS: readonly string[] = ["const", "default", "enum", "examples"];

const SAFE_INTEGER_BOUNDS: readonly unknown[] = [Number.MAX_SAFE_INTEGER, Number.MIN_SAFE_INTEGER];

const isOpen = (value: unknown): boolean =>
  value === true || (Predicate.isObject(value) && Rec.isEmptyRecord(value));

const isNoise = (value: unknown, key: string): boolean =>
  key === "$schema" ||
  (key === "additionalProperties" && isOpen(value)) ||
  ((key === "minimum" || key === "maximum") && SAFE_INTEGER_BOUNDS.includes(value));

const isBareObject = (value: unknown): boolean =>
  Predicate.isObject(value) &&
  value["type"] === "object" &&
  Rec.keys(value).every((key) => key === "type");

const withoutBareAllOf = (node: JsonObject): JsonObject => {
  const allOf = node["allOf"];
  if (!Array.isArray(allOf)) {
    return node;
  }
  const kept = Arr.filter(allOf, (item) => !isBareObject(item));
  if (Arr.isReadonlyArrayEmpty(kept)) {
    return Rec.remove(node, "allOf");
  }
  return { ...node, allOf: kept };
};

const withoutRepeatedPrefix = (node: JsonObject): JsonObject => {
  const prefixItems = node["prefixItems"];
  if (
    !Array.isArray(prefixItems) ||
    !prefixItems.every((item) => Equal.equals(item, node["items"]))
  ) {
    return node;
  }
  return Rec.remove(node, "prefixItems");
};

const compactValue = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return Arr.map(value, compactValue);
  }
  if (Predicate.isObject(value)) {
    return compactJsonSchema(value);
  }
  return value;
};

const compactEntry = (value: unknown, key: string): unknown => {
  if (LITERALS.includes(key)) {
    return value;
  }
  if (SCHEMA_MAPS.includes(key) && Predicate.isObject(value)) {
    return Rec.map(value, compactValue);
  }
  return compactValue(value);
};

export const compactJsonSchema = (node: Record<string, unknown>): Record<string, unknown> =>
  pipe(
    node,
    Rec.filter((value, key) => !isNoise(value, key)),
    Rec.map(compactEntry),
    withoutBareAllOf,
    withoutRepeatedPrefix,
  );

const compactConverter = (converter: Converter): Converter => ({
  input: (options) => compactJsonSchema(converter.input(options)),
  output: (options) => compactJsonSchema(converter.output(options)),
});

export const compactInput = <Input, Output>(
  schema: StandardSchemaWithJSON<Input, Output>,
): StandardSchemaWithJSON<Input, Output> => ({
  "~standard": {
    ...schema["~standard"],
    jsonSchema: compactConverter(schema["~standard"].jsonSchema),
  },
});
