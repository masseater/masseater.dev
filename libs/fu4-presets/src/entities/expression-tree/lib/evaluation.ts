import {
  Array as Arr,
  Match,
  Option,
  Order,
  Predicate,
  Record as Rec,
  Result,
  Schema,
  String as Str,
  pipe,
} from "effect";

import type { Evaluation } from "#/entities/expression-tree/model/types.ts";

import { parseNumber } from "./number.ts";

const DOTLESS = "ı";
const DIGITS = 15;
const FALSY = 0;
const NULL_NUMBER = 0;
const EQUAL = 0;
const INDENT = 2;
const JSON_NULL: Schema.Json = Option.getOrNull(Option.none());
const JsonText = Schema.fromJsonString(Schema.Json, { space: INDENT });
const parseJson = Schema.decodeUnknownOption(JsonText);
const printJson = Schema.encodeResult(JsonText);

export const stringOf = (value: string): Evaluation => ({ type: "string", value });

export const booleanOf = (value: boolean): Evaluation => ({ type: "boolean", value });

export const asBoolean: (value: Evaluation) => boolean = Match.type<Evaluation>().pipe(
  Match.discriminatorsExhaustive("type")({
    boolean: (value) => value.value,
    null: () => false,
    number: (value) => value.value !== FALSY && !Number.isNaN(value.value),
    string: (value) => !Str.isEmpty(value.value),
    array: () => true,
    object: () => true,
  }),
);

export const asNumber: (value: Evaluation) => number = Match.type<Evaluation>().pipe(
  Match.discriminatorsExhaustive("type")({
    string: (value) => parseNumber(value.value),
    number: (value) => value.value,
    boolean: (value) => Number(value.value),
    null: () => NULL_NUMBER,
    array: () => Number.NaN,
    object: () => Number.NaN,
  }),
);

export const upperSpecial = (value: string): string =>
  pipe(Str.split(DOTLESS)(value), Arr.map(Str.toUpperCase), Arr.join(DOTLESS));

const formatNumber = (value: number): string => {
  if (value === Number.POSITIVE_INFINITY) {
    return "Infinity";
  }
  if (value === Number.NEGATIVE_INFINITY) {
    return "-Infinity";
  }
  const rounded = Number(value.toFixed(DIGITS));
  if (Number.isInteger(rounded)) {
    return BigInt(rounded).toString();
  }
  return String(rounded);
};

export const display: (value: Evaluation) => string = Match.type<Evaluation>().pipe(
  Match.discriminatorsExhaustive("type")({
    string: (value) => value.value,
    number: (value) => formatNumber(value.value),
    boolean: (value) => String(value.value),
    null: () => "",
    array: () => "Array",
    object: () => "Object",
  }),
);

export const semaEquals =
  (left: Evaluation) =>
  (right: Evaluation): boolean => {
    if (left.type === "null" && right.type === "null") {
      return true;
    }
    if (left.type === "boolean" && right.type === "boolean") {
      return left.value === right.value;
    }
    if (left.type === "string" && right.type === "string") {
      return upperSpecial(left.value) === upperSpecial(right.value);
    }
    return asNumber(left) === asNumber(right);
  };

const compareNumbers = (left: number, right: number): Option.Option<number> =>
  Option.liftPredicate(
    Order.Number(left, right),
    () => !Number.isNaN(left) && !Number.isNaN(right),
  );

export const semaCompare =
  (left: Evaluation) =>
  (right: Evaluation): Option.Option<number> => {
    if (left.type === "null" && right.type === "null") {
      return Option.some(EQUAL);
    }
    if (left.type === "boolean" && right.type === "boolean") {
      return Option.some(Order.Boolean(left.value, right.value));
    }
    if (left.type === "string" && right.type === "string") {
      return Option.some(Order.String(upperSpecial(left.value), upperSpecial(right.value)));
    }
    return compareNumbers(asNumber(left), asNumber(right));
  };

export const isPrimitive = (value: Evaluation): boolean =>
  value.type !== "array" && value.type !== "object";

const isJsonArray = (value: Schema.JsonArray | Schema.JsonObject): value is Schema.JsonArray =>
  Arr.isArray(value);

const isStructure = (value: Schema.Json): value is Schema.JsonArray | Schema.JsonObject =>
  Arr.isArray(value) || Predicate.isObject(value);

const fromJsonScalar = (value: string | number | boolean | null): Evaluation => {
  if (Predicate.isNull(value)) {
    return { type: "null" };
  }
  if (Predicate.isBoolean(value)) {
    return booleanOf(value);
  }
  if (Predicate.isNumber(value)) {
    return { type: "number", value };
  }
  return stringOf(value);
};

const fromJsonValue = (value: Schema.Json): Evaluation => {
  if (!isStructure(value)) {
    return fromJsonScalar(value);
  }
  if (isJsonArray(value)) {
    return { type: "array", items: pipe(value, Arr.map(fromJsonValue)) };
  }
  const entries = pipe(
    Rec.toEntries(value),
    Arr.map(([key, each]) => [key, fromJsonValue(each)] as const),
  );
  return { type: "object", entries: new Map(entries) };
};

export const fromJson = (text: string): Option.Option<Evaluation> =>
  pipe(parseJson(text), Option.map(fromJsonValue));

const jsonNumber = (value: number): Schema.Json => {
  if (Number.isFinite(value)) {
    return value;
  }
  return JSON_NULL;
};

const toJsonValue: (value: Evaluation) => Schema.Json = Match.type<Evaluation>().pipe(
  Match.discriminatorsExhaustive("type")({
    null: () => JSON_NULL,
    number: (value) => jsonNumber(value.value),
    array: (value) => pipe(value.items, Arr.map(toJsonValue)),
    object: (value) =>
      pipe(
        [...value.entries],
        Arr.map(([key, each]) => [key, toJsonValue(each)] as const),
        Rec.fromEntries,
      ),
    string: (value) => value.value,
    boolean: (value) => value.value,
  }),
);

export const toJson = (value: Evaluation): string =>
  Result.getOrThrow(printJson(toJsonValue(value)));
