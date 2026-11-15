import { Array as Arr, Match, Option, Predicate, Record as Rec, Schema, pipe } from "effect";
import type { ESTree } from "vite-plus/lint/plugins";

export type Literal = string | number | boolean | null | readonly Literal[] | LiteralObject;

export interface LiteralObject {
  readonly [key: string]: Literal;
}

const WRAPPERS = ["TSAsExpression", "TSSatisfiesExpression", "ParenthesizedExpression"] as const;

export const KeySchema = Schema.Union([
  Schema.Struct({ type: Schema.Literal("Identifier"), name: Schema.String }),
  Schema.Struct({ type: Schema.Literal("Literal"), value: Schema.String }),
]);
const Quasi = Schema.Struct({ value: Schema.Struct({ cooked: Schema.String }) });
const PropertyNode = Schema.Struct({
  type: Schema.Literal("Property"),
  computed: Schema.Literal(false),
  key: KeySchema,
  value: Schema.Unknown,
});
const WrappedNode = Schema.Struct({ type: Schema.Literals(WRAPPERS), expression: Schema.Unknown });
const ValueNode = Schema.Union([
  Schema.Struct({
    type: Schema.Literal("Literal"),
    value: Schema.Union([Schema.String, Schema.Finite, Schema.Boolean, Schema.Null]),
  }),
  Schema.Struct({
    type: Schema.Literal("TemplateLiteral"),
    expressions: Schema.Tuple([]),
    quasis: Schema.Array(Quasi),
  }),
  Schema.Struct({
    type: Schema.Literal("ArrayExpression"),
    elements: Schema.Array(Schema.Unknown),
  }),
  Schema.Struct({
    type: Schema.Literal("ObjectExpression"),
    properties: Schema.Array(PropertyNode),
  }),
]);

const decodeWrapped = Schema.decodeUnknownOption(WrappedNode);
const decodeValue = Schema.decodeUnknownOption(ValueNode);
const decodeProperty = Schema.decodeUnknownOption(
  Schema.Struct({ type: Schema.Literal("Property"), key: KeySchema, value: Schema.Unknown }),
);
const decodeObject = Schema.decodeUnknownOption(
  Schema.Struct({
    type: Schema.Literal("ObjectExpression"),
    properties: Schema.Array(Schema.Unknown),
  }),
);

export const keyName = (key: typeof KeySchema.Type): string =>
  Match.value(key).pipe(
    Match.discriminatorsExhaustive("type")({
      Identifier: (identifier) => identifier.name,
      Literal: (literal) => literal.value,
    }),
  );

export const literalOf = (node: unknown): Option.Option<Literal> => {
  const wrapped = decodeWrapped(node);
  if (Option.isSome(wrapped)) {
    return literalOf(wrapped.value.expression);
  }
  return pipe(
    decodeValue(node),
    Option.flatMap((value) =>
      Match.value(value).pipe(
        Match.discriminatorsExhaustive("type")({
          Literal: (scalar): Option.Option<Literal> => Option.some(scalar.value),
          TemplateLiteral: (template): Option.Option<Literal> =>
            Option.some(
              pipe(
                template.quasis,
                Arr.map((quasi) => quasi.value.cooked),
                Arr.join(""),
              ),
            ),
          ArrayExpression: (array): Option.Option<Literal> =>
            pipe(array.elements, Arr.map(literalOf), Option.all),
          ObjectExpression: (object): Option.Option<Literal> =>
            pipe(
              object.properties,
              Arr.map((property) =>
                pipe(
                  literalOf(property.value),
                  Option.map((literal) => [keyName(property.key), literal] as const),
                ),
              ),
              Option.all,
              Option.map(Rec.fromEntries),
            ),
        }),
      ),
    ),
  );
};

const propertyValue =
  (name: string) =>
  (object: unknown): Option.Option<unknown> =>
    pipe(
      decodeObject(object),
      Option.flatMap(({ properties }) =>
        pipe(
          properties,
          Arr.findFirst((property) =>
            pipe(
              decodeProperty(property),
              Option.filter(({ key }) => keyName(key) === name),
              Option.map(({ value }) => value),
            ),
          ),
        ),
      ),
    );

export const childrenOf = (node: unknown): readonly unknown[] => {
  if (Arr.isArray(node)) {
    return node;
  }
  if (Predicate.isReadonlyObject(node)) {
    return Rec.values(node);
  }
  return [];
};

export const nestedValues =
  (path: readonly [string, string]) =>
  (node: unknown): readonly unknown[] => {
    const [outer, inner] = path;
    const own = pipe(
      Option.some(node),
      Option.flatMap(propertyValue(outer)),
      Option.flatMap(propertyValue(inner)),
      Option.toArray,
    );
    return [...own, ...pipe(childrenOf(node), Arr.flatMap(nestedValues(path)))];
  };

const StringNode = Schema.Union([
  Schema.Struct({
    type: Schema.Literal<ESTree.StringLiteral["type"]>("Literal"),
    value: Schema.String,
    start: Schema.Finite,
  }),
  Schema.Struct({
    type: Schema.Literal<ESTree.TemplateElement["type"]>("TemplateElement"),
    value: Schema.Struct({ cooked: Schema.String }),
    start: Schema.Finite,
  }),
]);
const decodeStringNode = Schema.decodeUnknownOption(StringNode);

export interface FoundString {
  readonly text: string;
  readonly start: number;
}

const textOf = (node: typeof StringNode.Type): string => {
  if (node.type === "Literal") {
    return node.value;
  }
  return node.value.cooked;
};

export const stringsIn = (node: unknown): readonly FoundString[] => {
  const own = pipe(
    decodeStringNode(node),
    Option.map((found) => ({ text: textOf(found), start: found.start })),
    Option.toArray,
  );
  return [...own, ...pipe(childrenOf(node), Arr.flatMap(stringsIn))];
};
