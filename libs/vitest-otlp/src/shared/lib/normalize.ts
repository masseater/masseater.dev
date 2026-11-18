import type { JsonObject, JsonValue } from "@bufbuild/protobuf";
import { Array, Option, Predicate, Record, Result, pipe } from "effect";
import { Base64, Hex } from "effect/encoding";

type Reader = (value: JsonValue) => JsonValue;

const isObject = (value: JsonValue): value is JsonObject => Predicate.isObject(value);

const isList = (value: JsonValue): value is JsonValue[] => Array.isArray(value);

const listOf = (value: JsonValue): readonly JsonValue[] =>
  Option.getOrElse(Option.liftPredicate(value, isList), () => []);

const fieldOf =
  (name: string) =>
  (value: JsonValue): JsonValue =>
    pipe(Option.liftPredicate(value, isObject), Option.flatMap(Record.get(name)), Option.getOrNull);

const whenString =
  (convert: (text: string) => string) =>
  (value: JsonValue): JsonValue =>
    Option.match(Option.liftPredicate(value, Predicate.isString), {
      onSome: convert,
      onNone: () => value,
    });

const mapTree =
  (readers: Readonly<Record<string, Reader>>) =>
  (value: JsonValue): JsonValue => {
    const walk = (node: JsonValue): JsonValue =>
      Option.match(Option.liftPredicate(node, isList), {
        onSome: Array.map(walk),
        onNone: () =>
          Option.match(Option.liftPredicate(node, isObject), {
            onNone: () => node,
            onSome: Record.map((inner, key) =>
              Option.match(Record.get(readers, key), {
                onSome: (read) => read(inner),
                onNone: () => walk(inner),
              }),
            ),
          }),
      });
    return walk(value);
  };

const keyOf = (pair: JsonValue): string =>
  pipe(
    fieldOf("key")(pair),
    Option.liftPredicate(Predicate.isString),
    Option.getOrElse(() => ""),
  );

const kvlist =
  (read: Reader) =>
  (values: JsonValue): JsonObject =>
    pipe(
      listOf(values),
      Array.map((pair) => [keyOf(pair), read(fieldOf("value")(pair))] as const),
      Record.fromEntries,
    );

const anyValue = (value: JsonValue): JsonValue => {
  const readers: Readonly<Record<string, Reader>> = {
    intValue: Number,
    arrayValue: (inner) => pipe(listOf(fieldOf("values")(inner)), Array.map(anyValue)),
    kvlistValue: (inner) => kvlist(anyValue)(fieldOf("values")(inner)),
  };
  return pipe(
    Option.liftPredicate(value, isObject),
    Option.flatMap((object) => Array.head(Record.toEntries(object))),
    Option.map(([kind, inner]) =>
      Option.match(Record.get(readers, kind), {
        onSome: (read) => read(inner),
        onNone: () => inner,
      }),
    ),
    Option.getOrNull,
  );
};

const attributes = kvlist(anyValue);

const reencode =
  (
    decode: (text: string) => Result.Result<Uint8Array, unknown>,
    encode: (bytes: Uint8Array) => string,
  ) =>
  (text: string): string =>
    Result.match(decode(text), { onSuccess: encode, onFailure: () => text });

const toHex = whenString(reencode(Base64.decode, Hex.encode));
const toBase64 = whenString(reencode(Hex.decode, Base64.encode));

const idsAs = (convert: Reader): Readonly<Record<string, Reader>> => ({
  traceId: convert,
  spanId: convert,
  parentSpanId: convert,
});

export const normalize = mapTree({ ...idsAs(toHex), attributes, body: anyValue });

export const hexIdsToBase64 = mapTree(idsAs(toBase64));

const SPAN_KINDS = [
  "SPAN_KIND_UNSPECIFIED",
  "SPAN_KIND_INTERNAL",
  "SPAN_KIND_SERVER",
  "SPAN_KIND_CLIENT",
  "SPAN_KIND_PRODUCER",
  "SPAN_KIND_CONSUMER",
];
const STATUS_CODES = ["STATUS_CODE_UNSET", "STATUS_CODE_OK", "STATUS_CODE_ERROR"];

const enumOf =
  (names: readonly string[]) =>
  (value: JsonValue): JsonValue =>
    pipe(
      Option.liftPredicate(value, Predicate.isNumber),
      Option.flatMap((index) => Array.get(names, index)),
      Option.getOrElse(() => value),
    );

export const normalizeOtlpJson = mapTree({
  attributes,
  body: anyValue,
  kind: enumOf(SPAN_KINDS),
  code: enumOf(STATUS_CODES),
});
