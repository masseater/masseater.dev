import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";

type Json = Schema.Json;

type JsonObject = Readonly<Record<string, Json>>;

type Line = Readonly<{ raw: string; json: Option.Option<Json> }>;

type View = Readonly<{ text: string; owners: readonly number[] }>;

const JsonText = Schema.fromJsonString(Schema.Json);

const decodeJson = Schema.decodeUnknownOption(JsonText);

const encodeJsonText = Schema.encodeEffect(JsonText);

const encodeJson = (value: Json): Effect.Effect<string> => encodeJsonText(value).pipe(Effect.orDie);

const isJsonArray = (value: Json): value is readonly Json[] => Arr.isArray(value);

const isObject = (value: Json): value is JsonObject =>
  typeof value === "object" && value !== null && !isJsonArray(value);

const parseLine = (raw: string): Line => {
  if (raw === "") {
    return { raw, json: Option.none() };
  }
  return { raw, json: decodeJson(raw) };
};

const parseLines = (text: string): readonly Line[] =>
  pipe(Str.split("\n")(text), Arr.map(parseLine));

const joinLines = (lines: readonly Line[]): string =>
  pipe(
    lines,
    Arr.map((line) => line.raw),
    Arr.join("\n"),
  );

const isMediaData = (parent: JsonObject, key: string): boolean =>
  key === "data" && parent["type"] === "base64";

const isThinkingSignature = (parent: JsonObject, key: string): boolean =>
  (key === "signature" && parent["type"] === "thinking") ||
  (key === "data" && parent["type"] === "redacted_thinking");

const isOpaque =
  (parent: JsonObject) =>
  (key: string): boolean =>
    isMediaData(parent, key) || isThinkingSignature(parent, key);

const stringsOf = (value: Json): readonly string[] => {
  if (typeof value === "string") {
    return [value];
  }
  if (isJsonArray(value)) {
    return pipe(value, Arr.flatMap(stringsOf));
  }
  if (isObject(value)) {
    const opaque = isOpaque(value);
    return pipe(
      Rec.toEntries(value),
      Arr.filter(([key]) => !opaque(key)),
      Arr.flatMap(([, item]) => stringsOf(item)),
    );
  }
  return [];
};

const ownStrings = (line: Line): readonly string[] =>
  Option.match(line.json, {
    onSome: stringsOf,
    onNone: () => pipe([line.raw], Arr.filter(Str.isNonEmpty)),
  });

const lineCount = (value: string): number => Str.split("\n")(value).length;

const scanView = (lines: readonly Line[]): View => {
  const owned = pipe(
    lines,
    Arr.flatMap((line, index) =>
      pipe(
        ownStrings(line),
        Arr.map((value) => ({ value, index })),
      ),
    ),
  );
  return {
    text: pipe(
      owned,
      Arr.map(({ value }) => value),
      Arr.join("\n"),
    ),
    owners: pipe(
      owned,
      Arr.flatMap(({ value, index }) => Arr.replicate(index, lineCount(value))),
    ),
  };
};

const KEPT_KEYS = ["type", "uuid", "parentUuid", "timestamp", "sessionId"];

const keptName = (key: string): string => {
  if (key === "type") {
    return "originalType";
  }
  return key;
};

const keptEntry =
  (original: Option.Option<JsonObject>) =>
  (key: string): readonly (readonly [string, Json])[] =>
    original.pipe(
      Option.flatMap((json) => Option.fromNullishOr(json[key])),
      Option.map((value): readonly [string, Json] => [keptName(key), value]),
      Option.toArray,
    );

const keptOf = (original: Option.Option<JsonObject>): JsonObject =>
  pipe(KEPT_KEYS, Arr.flatMap(keptEntry(original)), Rec.fromEntries);

const redactedLine = (line: Line): Effect.Effect<Line> => {
  const kept: JsonObject = {
    type: "watashi-redacted-line",
    ...keptOf(line.json.pipe(Option.filter(isObject))),
  };
  return encodeJson(kept).pipe(Effect.map((raw) => ({ raw, json: Option.some(kept) })));
};

/** @internal */
export {
  encodeJson,
  isJsonArray,
  isObject,
  isOpaque,
  joinLines,
  parseLines,
  redactedLine,
  scanView,
};
/** @internal */
export type { Json, JsonObject, Line, View };
