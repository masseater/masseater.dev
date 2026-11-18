import { Array as Arr, Option, Predicate, Schema, String as Str, pipe } from "effect";

export type Keys = Readonly<Record<string, readonly string[] | undefined>>;

export interface Scope {
  readonly text: string;
  readonly keys: Keys;
}

export interface Access {
  readonly map: string;
  readonly key: string;
  readonly value: Option.Option<string>;
}

const START = 0;
const END = 1;
const KEY = 0;
const VALUE = 1;
const ONE = 1;

const RangeSchema = Schema.Tuple([Schema.Finite, Schema.Finite]);
const RangedSchema = Schema.Struct({ range: RangeSchema });

type Ranged = typeof RangedSchema.Type;

const decodeRanged = Schema.decodeUnknownOption(RangedSchema);

const IdentifierSchema = Schema.Struct({ type: Schema.Literal("Identifier"), name: Schema.String });

const MemberSchema = Schema.Struct({
  type: Schema.Literal("MemberExpression"),
  computed: Schema.Literal(false),
  object: RangedSchema,
  property: IdentifierSchema,
});

const MemberCallSchema = Schema.Struct({
  type: Schema.Literal("CallExpression"),
  callee: MemberSchema,
  arguments: Schema.Array(RangedSchema),
});

const decodeMemberCall = Schema.decodeUnknownOption(MemberCallSchema);

const decodeCall = Schema.decodeUnknownOption(
  Schema.Struct({
    type: Schema.Literal("CallExpression"),
    callee: RangedSchema,
    arguments: Schema.Array(Schema.Unknown),
  }),
);

const decodeBlock = Schema.decodeUnknownOption(
  Schema.Struct({ type: Schema.Literal("BlockStatement"), body: Schema.Array(Schema.Unknown) }),
);

const decodeExpressionStatement = Schema.decodeUnknownOption(
  Schema.Struct({ type: Schema.Literal("ExpressionStatement"), expression: Schema.Unknown }),
);

const decodeReturn = Schema.decodeUnknownOption(
  Schema.Struct({ type: Schema.Literal("ReturnStatement"), argument: RangedSchema }),
);

const decodeTyped = Schema.decodeUnknownOption(Schema.Struct({ type: Schema.String }));

const textOf =
  (scope: Scope) =>
  (node: Ranged): string =>
    Str.slice(node.range[START], node.range[END])(scope.text);

export const textOfNode =
  (scope: Scope) =>
  (node: unknown): Option.Option<string> =>
    pipe(decodeRanged(node), Option.map(textOf(scope)));

export const accessOf =
  (scope: Scope) =>
  (method: string) =>
  (node: unknown): Option.Option<Access> =>
    pipe(
      decodeMemberCall(node),
      Option.filter((call) => call.callee.property.name === method),
      Option.flatMap((call) =>
        pipe(
          Arr.get(call.arguments, KEY),
          Option.map((key) => ({
            map: textOf(scope)(call.callee.object),
            key: textOf(scope)(key),
            value: pipe(Arr.get(call.arguments, VALUE), Option.map(textOf(scope))),
          })),
        ),
      ),
    );

export const sameEntry =
  (left: Access) =>
  (right: Access): boolean =>
    left.map === right.map && left.key === right.key;

export const calleeMatches =
  (scope: Scope) =>
  (pattern: RegExp) =>
  (node: unknown): Option.Option<readonly unknown[]> =>
    pipe(
      decodeCall(node),
      Option.filter((call) => pattern.test(textOf(scope)(call.callee))),
      Option.map((call) => call.arguments),
    );

export const expressionOf = (statement: unknown): Option.Option<unknown> =>
  pipe(
    decodeExpressionStatement(statement),
    Option.map((found) => found.expression),
  );

export const returnedText =
  (scope: Scope) =>
  (statement: unknown): Option.Option<string> =>
    pipe(
      decodeReturn(statement),
      Option.map((found) => textOf(scope)(found.argument)),
    );

export const bodyOf = (node: unknown): Option.Option<readonly unknown[]> =>
  pipe(
    decodeBlock(node),
    Option.map((block) => block.body),
  );

export const onlyStatement = (statement: unknown): Option.Option<unknown> =>
  Option.match(bodyOf(statement), {
    onNone: () => Option.some(statement),
    onSome: (body) =>
      Option.flatMap(
        Option.liftPredicate(body, (all) => all.length === ONE),
        Arr.head,
      ),
  });

export const typeOf = (node: unknown): string =>
  pipe(decodeTyped(node), Option.match({ onNone: () => "", onSome: (found) => found.type }));

export const parentOf = (node: unknown): Option.Option<unknown> =>
  pipe(
    Option.liftPredicate(node, Predicate.isObject),
    Option.flatMap((found) => Option.fromNullishOr(Reflect.get(found, "parent"))),
  );

const childrenOf = (keys: Keys, node: unknown): readonly unknown[] =>
  pipe(
    Option.liftPredicate(node, Predicate.isObject),
    Option.match({
      onNone: (): readonly unknown[] => [],
      onSome: (found) =>
        pipe(
          keys[typeOf(found)] ?? [],
          Arr.flatMap((key): readonly unknown[] => Arr.ensure(Reflect.get(found, key))),
          Arr.filter(Predicate.isObject),
        ),
    }),
  );

export const descendants =
  (keys: Keys) =>
  (node: unknown): readonly unknown[] => [
    node,
    ...pipe(childrenOf(keys, node), Arr.flatMap(descendants(keys))),
  ];

export const accessesIn =
  (scope: Scope) =>
  (method: string) =>
  (node: unknown): readonly Access[] =>
    pipe(descendants(scope.keys)(node), Arr.map(accessOf(scope)(method)), Arr.getSomes);
