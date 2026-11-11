import {
  AredokoRpcs,
  ENDPOINT_FILE,
  HOST,
  RpcCauseReason,
  RpcRequest,
  RpcResponse,
  ServerEndpoint,
  TOKEN_PARAMETER,
} from "@masseater.dev/aredoko-protocol";
import {
  Array,
  Effect,
  HashMap,
  HashSet,
  Option,
  Record,
  Schema,
  SchemaAST,
  SchemaRepresentation,
  String,
  pipe,
} from "effect";
import { FetchingJSONSchemaStore, InputData, JSONSchemaInput, quicktype } from "quicktype-core";

import { NotAnObject } from "./not-an-object.ts";

const NAMESPACE = "Aredoko.Protocol";
const JSON_SCHEMA_DIALECT = "https://json-schema.org/draft/2020-12/schema";
const GROUPS = { AredokoRpcs };

const ObjectSchema = Schema.Union([
  Schema.Struct({ type: Schema.Literal("object") }),
  Schema.Struct({ $ref: Schema.String }),
]);

const isObjectSchema = Schema.is(ObjectSchema);

const encodeJson = Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));

const EMPTY = "Empty";
const ROOT = "ProtocolRoots";

const rpcs = pipe(
  Record.values(GROUPS),
  Array.flatMap(({ requests }) => Array.fromIterable(requests)),
);

const voidRoots = HashSet.fromIterable(
  pipe(
    rpcs,
    Array.flatMap(([tag, rpc]) => [
      [`${tag}Payload`, rpc.payloadSchema.ast] as const,
      [`${tag}Success`, rpc.successSchema.ast] as const,
    ]),
    Array.filter(([, ast]) => SchemaAST.isVoid(ast)),
    Array.map(([name]) => name),
  ),
);

const roots = pipe(
  rpcs,
  Array.flatMap(([tag, rpc]) => [
    { name: `${tag}Payload`, object: true, ast: rpc.payloadSchema.ast },
    { name: `${tag}Success`, object: true, ast: rpc.successSchema.ast },
    { name: `${tag}Error`, object: false, ast: rpc.errorSchema.ast },
  ]),
  Array.appendAll([
    { name: "EndpointFileContent", object: true, ast: ServerEndpoint.ast },
    { name: "WireRequest", object: true, ast: RpcRequest.ast },
    { name: "WireResponse", object: true, ast: RpcResponse.ast },
    { name: "WireCauseReason", object: true, ast: RpcCauseReason.ast },
  ]),
  Array.filter(({ ast }) => !SchemaAST.isVoid(ast)),
);

const definitions = Effect.fn("definitions")(function* definitions() {
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

const RefSchema = Schema.Struct({ $ref: Schema.String });

const isRefSchema = Schema.is(RefSchema);

const DEFINITION_PREFIX = "#/$defs/";

const resolvedNames = ($defs: Readonly<Record<string, unknown>>): HashMap.HashMap<string, string> =>
  HashMap.fromIterable(
    pipe(
      roots,
      Array.map(({ name }) =>
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

const rootDocument = ($defs: Readonly<Record<string, unknown>>): Record<string, unknown> => ({
  $schema: JSON_SCHEMA_DIALECT,
  title: ROOT,
  type: "object",
  properties: Record.fromIterableWith(roots, ({ name }) => [
    name,
    { $ref: `${DEFINITION_PREFIX}${name}` },
  ]),
  required: pipe(
    roots,
    Array.map(({ name }) => name),
  ),
  additionalProperties: false,
  $defs,
});

const types = Effect.fn("types")(function* types($defs: Readonly<Record<string, unknown>>) {
  const input = new JSONSchemaInput(new FetchingJSONSchemaStore());
  const schema = yield* encodeJson(rootDocument($defs));
  yield* Effect.promise(() => input.addSource({ name: ROOT, schema }));
  const inputData = new InputData();
  inputData.addInput(input);
  const { lines } = yield* Effect.promise(() =>
    quicktype({
      inputData,
      lang: "csharp",
      rendererOptions: {
        framework: "NewtonSoft",
        namespace: NAMESPACE,
        "array-type": "array",
        features: "complete",
      },
    }),
  );
  return lines;
});

const typeOf =
  (names: HashMap.HashMap<string, string>) =>
  (name: string): string =>
    pipe(
      Option.liftPredicate(name, (candidate) => HashSet.has(voidRoots, candidate)),
      Option.as(EMPTY),
      Option.orElse(() => HashMap.get(names, name)),
      Option.getOrElse(() => name),
    );

const descriptor =
  (names: HashMap.HashMap<string, string>) =>
  (tag: string): string => {
    const resolve = typeOf(names);
    const type = `Rpc<${resolve(`${tag}Payload`)}, ${resolve(`${tag}Success`)}, ${resolve(`${tag}Error`)}>`;
    return `        public static readonly ${type} ${tag} = new ${type}("${tag}");`;
  };

const group =
  (names: HashMap.HashMap<string, string>) =>
  ([name, tags]: readonly [string, readonly string[]]): readonly string[] => [
    "",
    `    public static class ${name}`,
    "    {",
    ...pipe(tags, Array.map(descriptor(names))),
    "    }",
  ];

const descriptors = (
  names: HashMap.HashMap<string, string>,
  identifier: string,
): readonly string[] => {
  const groups = pipe(
    Record.toEntries(GROUPS),
    Array.map(([name, { requests }]) => [name, Array.fromIterable(requests.keys())] as const),
    Array.flatMap(group(names)),
  );
  return [
    `namespace ${NAMESPACE}`,
    "{",
    "    public sealed class Rpc<TPayload, TSuccess, TError>",
    "    {",
    "        internal Rpc(string method)",
    "        {",
    "            Method = method;",
    "        }",
    "",
    "        public string Method { get; }",
    "    }",
    "",
    `    public sealed class ${EMPTY}`,
    "    {",
    "    }",
    "",
    "    public static class EndpointFile",
    "    {",
    `        public const string Directory = "${identifier}";`,
    `        public const string Name = "${ENDPOINT_FILE}";`,
    `        public const string Host = "${HOST}";`,
    `        public const string TokenParameter = "${TOKEN_PARAMETER}";`,
    "    }",
    ...groups,
    "}",
  ];
};

const csharp = Effect.fn("csharp")(function* csharp(identifier: string) {
  const $defs = yield* definitions();
  const lines = yield* types($defs);
  return Array.join([...lines, "", ...descriptors(resolvedNames($defs), identifier), ""], "\n");
});

export { csharp };
