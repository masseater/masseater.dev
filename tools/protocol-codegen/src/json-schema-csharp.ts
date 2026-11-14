import {
  Array,
  Effect,
  HashMap,
  Option,
  Record,
  Schema,
  SchemaRepresentation,
  String,
  pipe,
} from "effect";
import type { SchemaAST } from "effect";
import { FetchingJSONSchemaStore, InputData, JSONSchemaInput, quicktype } from "quicktype-core";

import { NotAnObject } from "./not-an-object.ts";

type Root = Readonly<{ name: string; object: boolean; ast: SchemaAST.AST }>;

type Target = Readonly<{
  namespace: string;
  framework: "NewtonSoft" | "SystemTextJson";
  roots: () => readonly Root[];
}>;

const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";
const ROOT = "ProtocolRoots";
const DEFINITION_PREFIX = "#/$defs/";

const ObjectSchema = Schema.Union([
  Schema.Struct({ type: Schema.Literal("object") }),
  Schema.Struct({ $ref: Schema.String }),
]);

const isObjectSchema = Schema.is(ObjectSchema);

const RefSchema = Schema.Struct({ $ref: Schema.String });

const isRefSchema = Schema.is(RefSchema);

const encodeJson = Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));

const definitions = Effect.fn("definitions")(function* definitions(target: Target) {
  const roots = target.roots();
  const asts = yield* pipe(
    roots,
    Array.map(({ ast }) => ast),
    Array.match({ onEmpty: Option.none, onNonEmpty: Option.some }),
    Effect.fromOption,
  );
  const document = SchemaRepresentation.toJsonSchemaMultiDocument(
    SchemaRepresentation.toRepresentations(asts),
  );
  const named = Array.zip(roots, document.schemas);
  yield* pipe(
    named,
    Array.findFirst(([{ object }, schema]) => object && !isObjectSchema(schema)),
    Option.match({
      onNone: () => Effect.void,
      onSome: ([{ name }]) => Effect.fail(NotAnObject.make({ root: name })),
    }),
  );
  const rootSchemas = Record.fromIterableWith(named, ([{ name }, schema]) => [name, schema]);
  return pipe(
    { ...document.definitions, ...rootSchemas },
    Record.map((schema, title) => ({ ...schema, title })),
  );
});

const resolvedNames = (
  names: readonly string[],
  $defs: Readonly<Record<string, unknown>>,
): HashMap.HashMap<string, string> =>
  HashMap.fromIterable(
    pipe(
      names,
      Array.map((name) =>
        pipe(
          Record.get($defs, name),
          Option.filter(isRefSchema),
          Option.map(
            ({ $ref }) => [name, pipe($ref, String.replace(DEFINITION_PREFIX, ""))] as const,
          ),
          Option.getOrElse(() => [name, name] as const),
        ),
      ),
    ),
  );

const rootDocument = (
  names: readonly string[],
  $defs: Readonly<Record<string, unknown>>,
): Record<string, unknown> => ({
  $schema: JSON_SCHEMA_DIALECT,
  title: ROOT,
  type: "object",
  properties: Record.fromIterableWith(names, (name) => [
    name,
    { $ref: `${DEFINITION_PREFIX}${name}` },
  ]),
  required: names,
  additionalProperties: false,
  $defs,
});

const csharpTypes = Effect.fn("csharpTypes")(function* csharpTypes(target: Target) {
  const { namespace, framework } = target;
  const names = pipe(
    target.roots(),
    Array.map(({ name }) => name),
  );
  const $defs = yield* definitions(target);
  const input = new JSONSchemaInput(new FetchingJSONSchemaStore());
  const schema = yield* encodeJson(rootDocument(names, $defs));
  yield* Effect.promise(() => input.addSource({ name: ROOT, schema }));
  const inputData = new InputData();
  inputData.addInput(input);
  const { lines } = yield* Effect.promise(() =>
    quicktype({
      inputData,
      lang: "csharp",
      rendererOptions: {
        framework,
        namespace,
        "array-type": "array",
        features: "complete",
      },
    }),
  );
  return { lines, names: resolvedNames(names, $defs) };
});

export { csharpTypes };
export type { Root, Target };
