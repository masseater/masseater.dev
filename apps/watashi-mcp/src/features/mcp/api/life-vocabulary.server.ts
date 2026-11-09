import { Validator } from "@cfworker/json-schema";
import {
  Array as Arr,
  Effect,
  Option,
  Predicate,
  Record as Rec,
  String as Str,
  pipe,
} from "effect";
import { distance } from "fastest-levenshtein";

import { InvalidRecord } from "#/features/mcp/model/invalid-record";
import type { StorageFailed } from "#/features/mcp/model/storage-failed";

import { lower, refOf, stringAt } from "./life-record";
import type { Body } from "./life-record";
import { findByLabel, scanAll } from "./life-store.server";
import type { LifeEntry } from "./life-store.server";
import { insertRecord } from "./life-writer.server";
import type { Writer } from "./life-writer.server";

type Notice = Readonly<{ type: string; ref: string } & Record<string, unknown>>;

type Definition = "event_kind" | "metric_definition";

type Similar = Readonly<{ name: string; description: string }>;

const MAX_DISTANCE = 2;

const MAX_SIMILAR = 3;

const NAME_FIELDS: Readonly<Record<Definition, string>> = {
  event_kind: "kind",
  metric_definition: "metric",
};

const HINTS: Readonly<Record<Definition, string>> = {
  event_kind:
    "If it means the same as a similar kind, rewrite the record with that kind (life_write with ref and kind). Otherwise write an event_kind with description and valuesSchema.",
  metric_definition:
    "If it means the same as a similar metric, rewrite the values with that metric (life_write with ref and values). Otherwise write a metric_definition with unit and aggregate.",
};

const NOTICE_TYPES: Readonly<Record<Definition, string>> = {
  event_kind: "new_kind",
  metric_definition: "new_metric",
};

const isClose =
  (name: string) =>
  (other: string): boolean =>
    other !== name &&
    (distance(lower(other), lower(name)) <= MAX_DISTANCE ||
      Str.includes(lower(name))(lower(other)) ||
      Str.includes(lower(other))(lower(name)));

const similarOf = (entry: LifeEntry): Similar => ({
  name: entry.row.label,
  description: pipe(
    stringAt("description")(entry.body),
    Option.getOrElse(() => ""),
  ),
});

const similarTo =
  (name: string) =>
  (entries: readonly LifeEntry[]): readonly Similar[] =>
    pipe(
      entries,
      Arr.filter((entry) => isClose(name)(entry.row.label)),
      Arr.map(similarOf),
      Arr.take(MAX_SIMILAR),
    );

const registered =
  (writer: Writer, definition: Definition) =>
  (name: string): Effect.Effect<Notice, StorageFailed> =>
    Effect.gen(function* registerDefinition() {
      const existing = yield* scanAll([definition]);
      const id = yield* insertRecord(writer)({
        record: definition,
        source: "definition",
        body: Rec.singleton(NAME_FIELDS[definition], name),
      });
      return {
        type: NOTICE_TYPES[definition],
        ref: refOf({ record: definition, id }),
        name,
        similar: similarTo(name)(existing),
        hint: HINTS[definition],
      };
    });

const ensureDefined =
  (writer: Writer, definition: Definition) =>
  (name: string): Effect.Effect<Option.Option<Notice>, StorageFailed> =>
    findByLabel({ record: definition, label: name }).pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => registered(writer, definition)(name).pipe(Effect.asSome),
          onSome: () => Effect.succeedNone,
        }),
      ),
    );

const valuesOf = (body: Body): Body =>
  pipe(
    Rec.get(body, "values"),
    Option.filter(Predicate.isObject),
    Option.getOrElse((): Body => ({})),
  );

const metricNamesOf = (body: Body): readonly string[] =>
  pipe(valuesOf(body), Rec.filter(Predicate.isNumber), Rec.keys);

const allowedOf = (schema: Body): string =>
  pipe(
    Rec.get(schema, "properties"),
    Option.filter(Predicate.isObject),
    Option.map(Rec.keys),
    Option.map(Arr.join(", ")),
    Option.getOrElse(() => "(any)"),
  );

const schemaErrors = (schema: Body, values: Body): readonly string[] =>
  pipe(
    new Validator(schema).validate(values).errors,
    Arr.map((unit) => `${unit.instanceLocation}: ${unit.error}`),
  );

const checkValues =
  (kind: string, values: Body) =>
  (schema: Body): Effect.Effect<void, InvalidRecord> =>
    Arr.match(schemaErrors(schema, values), {
      onEmpty: () => Effect.void,
      onNonEmpty: (errors) =>
        Effect.fail(
          InvalidRecord.make({
            message: `values do not follow the valuesSchema of kind "${kind}": ${Arr.join(errors, "; ")}. Allowed keys: ${allowedOf(schema)}. To add a key, widen the valuesSchema with life_write record event_kind first.`,
          }),
        ),
    });

const kindSchemaOf = (entry: LifeEntry): Option.Option<Body> =>
  pipe(Rec.get(entry.body, "valuesSchema"), Option.filter(Predicate.isObject));

const validateKind =
  (kind: string, body: Body) =>
  (definition: Option.Option<LifeEntry>): Effect.Effect<void, InvalidRecord> => {
    const check = checkValues(kind, valuesOf(body));
    return pipe(
      definition,
      Option.flatMap(kindSchemaOf),
      Option.match({ onNone: () => Effect.void, onSome: check }),
    );
  };

const kindNotices =
  (writer: Writer, body: Body) =>
  (kind: string): Effect.Effect<readonly Notice[], InvalidRecord | StorageFailed> =>
    findByLabel({ record: "event_kind", label: kind }).pipe(
      Effect.tap(validateKind(kind, body)),
      Effect.flatMap(() => ensureDefined(writer, "event_kind")(kind)),
      Effect.map(Option.toArray),
    );

const vocabularyNotices =
  (writer: Writer) =>
  (body: Body): Effect.Effect<readonly Notice[], InvalidRecord | StorageFailed> =>
    Effect.gen(function* registerVocabulary() {
      const kinds = yield* pipe(
        stringAt("kind")(body),
        Option.match({
          onNone: () => Effect.succeed<readonly Notice[]>([]),
          onSome: kindNotices(writer, body),
        }),
      );
      const metrics = yield* pipe(
        metricNamesOf(body),
        Effect.forEach(ensureDefined(writer, "metric_definition")),
      );
      return [...kinds, ...Arr.getSomes(metrics)];
    });

export { metricNamesOf as metricKeysOf, valuesOf, vocabularyNotices };
export type { Notice };
