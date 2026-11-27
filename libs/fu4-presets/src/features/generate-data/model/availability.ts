import { Array as Arr, Effect, Option, Record as Rec, Schema, String as Str, pipe } from "effect";
import type { HttpClient } from "effect/http";

import { GenerateDataError, failedWith } from "./errors.ts";
import { fetchText } from "./fetch.ts";
import { renderDocs } from "./liquid.ts";
import { bodyRows, cellsOf, listOf, parseMarkdown, sectionTitled, tablesOf } from "./markdown.ts";
import { CONTEXTS, WORKFLOW_PARSER_SCHEMA } from "./sources.ts";

const PLACEHOLDER = /<[^>]+>/gu;
const WILDCARD = "*";
const FUNCTION_CALL = "(";
const ROOT = "workflow-root";
const SEPARATOR = ".";
const NEXT = 1;

export interface Availability {
  readonly contexts: readonly string[];
  readonly functions: readonly string[];
}

type Entry = readonly [string, Availability];

const Property = Schema.Union([Schema.String, Schema.Struct({ type: Schema.String })]);

const Mapping = Schema.Struct({
  properties: Schema.optionalKey(Schema.Record(Schema.String, Property)),
  "loose-value-type": Schema.optionalKey(Schema.String),
});

const Definition = Schema.Struct({
  context: Schema.String.pipe(Schema.Array, Schema.optionalKey),
  mapping: Schema.optionalKey(Mapping),
  sequence: Schema.optionalKey(Schema.Struct({ "item-type": Schema.String })),
  "one-of": Schema.String.pipe(Schema.Array, Schema.optionalKey),
});

const ParserSchema = Schema.Struct({ definitions: Schema.Record(Schema.String, Definition) });

type Definitions = (typeof ParserSchema.Type)["definitions"];

interface Visit {
  readonly name: string;
  readonly path: string;
  readonly ancestors: readonly string[];
}

const childPath = (path: string, key: string): string =>
  pipe(
    Option.liftPredicate(path, Str.isNonEmpty),
    Option.match({ onNone: () => key, onSome: (parent) => `${parent}${SEPARATOR}${key}` }),
  );

const isCall = Str.includes(FUNCTION_CALL);

const availabilityOf = (context: readonly string[]): Availability => ({
  contexts: pipe(
    context,
    Arr.filter((name) => !isCall(name)),
    Arr.map(Str.toLowerCase),
    Arr.sortBy(Str.Order),
  ),
  functions: pipe(
    context,
    Arr.filter(isCall),
    Arr.map((name) => Str.toLowerCase(Arr.headNonEmpty(Str.split(name, FUNCTION_CALL)))),
    Arr.sortBy(Str.Order),
  ),
});

const nameOf = (property: typeof Property.Type): string => {
  if (Str.isString(property)) {
    return property;
  }
  return property.type;
};

const childrenOf = (definition: typeof Definition.Type, visit: Visit): readonly Visit[] => {
  const ancestors = Arr.append(visit.ancestors, visit.name);
  const at =
    (path: string) =>
    (name: string): Visit => ({ name, path, ancestors });
  const mapping = Option.fromNullishOr(definition.mapping);
  const properties = pipe(
    mapping,
    Option.flatMap((found) => Option.fromNullishOr(found.properties)),
    Option.map(Rec.toEntries),
    Option.getOrElse(Arr.empty<readonly [string, typeof Property.Type]>),
    Arr.map(([key, property]) => at(childPath(visit.path, key))(nameOf(property))),
  );
  const looseChild = at(childPath(visit.path, WILDCARD));
  const loose = pipe(
    mapping,
    Option.flatMap((found) => Option.fromNullishOr(found["loose-value-type"])),
    Option.map(looseChild),
    Option.toArray,
  );
  const items = pipe(
    Option.fromNullishOr(definition.sequence),
    Option.map((sequence) => at(visit.path)(sequence["item-type"])),
    Option.toArray,
  );
  const alternatives = pipe(definition["one-of"] ?? [], Arr.map(at(visit.path)));
  return [...properties, ...loose, ...items, ...alternatives];
};

const schemaKeys =
  (definitions: Definitions) =>
  (visit: Visit): readonly Entry[] =>
    pipe(
      Rec.get(definitions, visit.name),
      Option.filter(() => !pipe(visit.ancestors, Arr.contains(visit.name))),
      Option.map((definition) => [
        ...pipe(
          Option.fromNullishOr(definition.context),
          Option.filter(() => Str.isNonEmpty(visit.path)),
          Option.map((context): Entry => [visit.path, availabilityOf(context)]),
          Option.toArray,
        ),
        ...pipe(childrenOf(definition, visit), Arr.flatMap(schemaKeys(definitions))),
      ]),
      Option.getOrElse(Arr.empty<Entry>),
    );

const wildcarded = Str.replaceAll(PLACEHOLDER, WILDCARD);

const prefixesOf = (key: string): readonly string[] => {
  const segments = Str.split(key, SEPARATOR);
  return pipe(
    segments,
    Arr.map((_segment, index) => Arr.join(Arr.take(segments, index + NEXT), SEPARATOR)),
  );
};

const documentedName =
  (documented: readonly string[]) =>
  (key: string): string => {
    const names = pipe(
      documented,
      Arr.flatMap(prefixesOf),
      Arr.map((prefix) => [wildcarded(prefix), prefix] as const),
      Rec.fromEntries,
    );
    return pipe(
      prefixesOf(key),
      Arr.reverse,
      Arr.findFirst((prefix) => Rec.has(names, prefix)),
      Option.flatMap((prefix) =>
        pipe(
          Rec.get(names, prefix),
          Option.map((name) => `${name}${Str.slice(prefix.length)(key)}`),
        ),
      ),
      Option.getOrElse(() => key),
    );
  };

const documentedKeys = (
  source: string,
): Effect.Effect<Record<string, Availability>, GenerateDataError> =>
  pipe(
    sectionTitled("Context availability")(parseMarkdown(source)),
    Option.flatMap((section) => Arr.head(tablesOf(section))),
    Option.map((table) =>
      pipe(
        bodyRows(table),
        Arr.map(cellsOf),
        Arr.map(([key = "", contexts = "", functions = ""]): Entry => [
          key,
          { contexts: listOf(contexts), functions: listOf(functions) },
        ]),
        Arr.filter(([key]) => Str.isNonEmpty(key)),
        Rec.fromEntries,
      ),
    ),
    Effect.fromOption,
    Effect.mapError(() => GenerateDataError.make({ message: "no Context availability table" })),
  );

const decodeParserSchema = Schema.decodeEffect(Schema.fromJsonString(ParserSchema));

/** @internal */
export const availability: Effect.Effect<
  Record<string, Availability>,
  GenerateDataError,
  HttpClient.HttpClient
> = Effect.gen(function* availability() {
  const docs = yield* renderDocs(CONTEXTS);
  const documented = yield* documentedKeys(docs);
  const source = yield* fetchText(WORKFLOW_PARSER_SCHEMA);
  const parser = yield* decodeParserSchema(source).pipe(
    Effect.mapError(failedWith("could not read the workflow parser schema")),
  );
  const known = new Set(pipe(Rec.keys(documented), Arr.map(wildcarded)));
  const rename = documentedName(Rec.keys(documented));
  const extra = pipe(
    schemaKeys(parser.definitions)({ name: ROOT, path: "", ancestors: [] }),
    Arr.filter(([key]) => !known.has(key)),
    Arr.map(([key, value]): Entry => [rename(key), value]),
  );
  return pipe(
    Rec.toEntries({ ...Rec.fromEntries(extra), ...documented }),
    Arr.sortWith(([key]) => key, Str.Order),
    Rec.fromEntries,
  );
});
