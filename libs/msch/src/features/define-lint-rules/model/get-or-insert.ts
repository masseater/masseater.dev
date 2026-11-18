import { Array as Arr, Option, Schema, pipe } from "effect";
import type { Rule } from "vite-plus/lint/plugins";

import {
  accessOf,
  accessesIn,
  bodyOf,
  calleeMatches,
  descendants,
  expressionOf,
  onlyStatement,
  parentOf,
  returnedText,
  sameEntry,
  textOfNode,
  typeOf,
} from "./get-or-insert-ast.ts";
import type { Access, Scope } from "./get-or-insert-ast.ts";

const MESSAGE =
  "Use getOrInsert or getOrInsertComputed on the Map or WeakMap, so that reading a key and storing its first value is one call. Do not read the key and then set it by hand.";

const ONE = 1;
const TWO = 2;
const OPTION_FROM = /^(?:Option\.)?from(?:NullishOr|UndefinedOr|Nullable)$/u;
const GET_OR_ELSE = /^(?:Option\.)?getOrElse$/u;
const FUNCTIONS: readonly string[] = ["ArrowFunctionExpression", "FunctionExpression"];

const decodeGuard = Schema.decodeUnknownOption(
  Schema.Struct({
    type: Schema.Literal("IfStatement"),
    test: Schema.Unknown,
    consequent: Schema.Unknown,
    alternate: Schema.Null,
  }),
);

const decodeNot = Schema.decodeUnknownOption(
  Schema.Struct({
    type: Schema.Literal("UnaryExpression"),
    operator: Schema.Literal("!"),
    argument: Schema.Unknown,
  }),
);

const DeclaratorSchema = Schema.Struct({
  id: Schema.Struct({ type: Schema.Literal("Identifier"), name: Schema.String }),
  init: Schema.Unknown,
});

type Declarator = typeof DeclaratorSchema.Type;

const decodeDeclaration = Schema.decodeUnknownOption(
  Schema.Struct({
    type: Schema.Literal("VariableDeclaration"),
    declarations: Schema.Array(DeclaratorSchema),
  }),
);

const decodeNullish = Schema.decodeUnknownOption(
  Schema.Struct({
    type: Schema.Literal("LogicalExpression"),
    operator: Schema.Literal("??"),
    left: Schema.Unknown,
  }),
);

const storeOf =
  (scope: Scope) =>
  (statement: unknown): Option.Option<Access> =>
    pipe(expressionOf(statement), Option.flatMap(accessOf(scope)("set")));

const isHasGuard = (scope: Scope, node: unknown): boolean =>
  pipe(
    decodeGuard(node),
    Option.exists((guard) => {
      const guarded = pipe(
        decodeNot(guard.test),
        Option.flatMap((not) => accessOf(scope)("has")(not.argument)),
      );
      const stored = pipe(onlyStatement(guard.consequent), Option.flatMap(storeOf(scope)));
      return Option.isSome(guarded) && Option.exists(stored, sameEntry(guarded.value));
    }),
  );

const deletes =
  (scope: Scope, read: Access) =>
  (statement: unknown): boolean =>
    pipe(
      expressionOf(statement),
      Option.flatMap(accessOf(scope)("delete")),
      Option.exists(sameEntry(read)),
    );

const storesBack =
  (scope: Scope, read: Access, name: string) =>
  (statement: unknown): boolean =>
    Option.exists(
      storeOf(scope)(statement),
      (stored) => sameEntry(read)(stored) && Option.exists(stored.value, (value) => value === name),
    );

const fallsBack =
  (scope: Scope, later: readonly unknown[]) =>
  (declarator: Declarator): boolean =>
    pipe(
      decodeNullish(declarator.init),
      Option.flatMap((nullish) => accessOf(scope)("get")(nullish.left)),
      Option.exists(
        (read) =>
          pipe(later, Arr.some(storesBack(scope, read, declarator.id.name))) &&
          !pipe(later, Arr.some(deletes(scope, read))),
      ),
    );

const fallbackIndices = (scope: Scope, body: readonly unknown[]): readonly number[] =>
  pipe(
    body,
    Arr.map((statement, index) => {
      const fallsBackLater = fallsBack(scope, Arr.drop(body, index + ONE));
      return pipe(
        decodeDeclaration(statement),
        Option.map((declaration) => declaration.declarations),
        Option.filter(Arr.some(fallsBackLater)),
        Option.as(index),
      );
    }),
    Arr.getSomes,
  );

interface CachedCheck {
  readonly test: (name: string) => string;
  readonly value: (name: string) => string;
}

const itself = (name: string): string => name;

const CACHED_CHECKS: readonly CachedCheck[] = [
  { test: (name) => `${name} !== undefined`, value: itself },
  { test: (name) => `${name} != null`, value: itself },
  { test: (name) => `${name} !== null`, value: itself },
  { test: (name) => `Predicate.isNotUndefined(${name})`, value: itself },
  { test: (name) => `Predicate.isNotNullish(${name})`, value: itself },
  { test: itself, value: itself },
  { test: (name) => `Option.isSome(${name})`, value: (name) => `${name}.value` },
];

const returnsCached =
  (scope: Scope, name: string) =>
  (statement: unknown): boolean =>
    pipe(
      decodeGuard(statement),
      Option.exists((guard) => {
        const tested = textOfNode(scope)(guard.test);
        const returned = pipe(onlyStatement(guard.consequent), Option.flatMap(returnedText(scope)));
        return pipe(
          CACHED_CHECKS,
          Arr.some(
            (check) =>
              Option.exists(tested, (found) => found === check.test(name)) &&
              Option.exists(returned, (found) => found === check.value(name)),
          ),
        );
      }),
    );

const unwrapOption =
  (scope: Scope) =>
  (node: unknown): unknown =>
    pipe(
      calleeMatches(scope)(OPTION_FROM)(node),
      Option.flatMap(Arr.head),
      Option.getOrElse(() => node),
    );

const readsCached =
  (scope: Scope, stored: Access) =>
  (declarator: Declarator): boolean =>
    pipe(
      unwrapOption(scope)(declarator.init),
      accessOf(scope)("get"),
      Option.exists(sameEntry(stored)),
    );

const earlyReturn = (scope: Scope, body: readonly unknown[], stored: Access): boolean =>
  pipe(
    body,
    Arr.some((statement, index) =>
      pipe(
        decodeDeclaration(statement),
        Option.flatMap((declaration) => Arr.head(declaration.declarations)),
        Option.filter(readsCached(scope, stored)),
        Option.exists((declarator) =>
          Option.exists(Arr.get(body, index + ONE), returnsCached(scope, declarator.id.name)),
        ),
      ),
    ),
  );

const storedAndReturned = (scope: Scope, body: readonly unknown[]): Option.Option<Access> => {
  const returned = pipe(Arr.last(body), Option.flatMap(returnedText(scope)));
  return pipe(
    Arr.get(body, body.length - TWO),
    Option.flatMap(storeOf(scope)),
    Option.filter(
      (stored) => Option.isSome(returned) && Option.contains(stored.value, returned.value),
    ),
  );
};

const optionRegion = (scope: Scope, block: unknown): Option.Option<unknown> =>
  pipe(
    parentOf(block),
    Option.filter((fn) => Arr.contains(FUNCTIONS, typeOf(fn))),
    Option.flatMap(parentOf),
    Option.filter((call) => Option.isSome(calleeMatches(scope)(GET_OR_ELSE)(call))),
    Option.flatMap(parentOf),
  );

const readsThroughOption =
  (scope: Scope, stored: Access) =>
  (node: unknown): boolean =>
    pipe(
      calleeMatches(scope)(OPTION_FROM)(node),
      Option.flatMap(Arr.head),
      Option.flatMap(accessOf(scope)("get")),
      Option.exists(sameEntry(stored)),
    );

const storesOnce =
  (scope: Scope, stored: Access) =>
  (region: unknown): boolean =>
    pipe(accessesIn(scope)("set")(region), Arr.filter(sameEntry(stored))).length === ONE;

const returnsOnce = (scope: Scope, block: unknown): boolean =>
  pipe(
    descendants(scope.keys)(block),
    Arr.filter((node) => typeOf(node) === "ReturnStatement"),
  ).length === ONE;

const fallsBackInOption = (scope: Scope, block: unknown, stored: Access): boolean =>
  returnsOnce(scope, block) &&
  Option.exists(
    optionRegion(scope, block),
    (region) =>
      pipe(descendants(scope.keys)(region), Arr.some(readsThroughOption(scope, stored))) &&
      storesOnce(scope, stored)(region),
  );

const isMemoized = (scope: Scope, block: unknown): boolean =>
  pipe(
    bodyOf(block),
    Option.exists((body) =>
      Option.exists(storedAndReturned(scope, body), (stored) => {
        if (earlyReturn(scope, body, stored)) {
          return storesOnce(scope, stored)(block);
        }
        return fallsBackInOption(scope, block, stored);
      }),
    ),
  );

export const getOrInsert: Rule = {
  meta: { type: "suggestion" },
  create: (context) => {
    const scope: Scope = { text: context.sourceCode.text, keys: context.sourceCode.visitorKeys };
    return {
      IfStatement: (node): void => {
        if (isHasGuard(scope, node)) {
          context.report({ node, message: MESSAGE });
        }
      },
      BlockStatement: (node): void => {
        for (const index of fallbackIndices(scope, node.body)) {
          for (const statement of Option.toArray(Arr.get(node.body, index))) {
            context.report({ node: statement, message: MESSAGE });
          }
        }
        if (isMemoized(scope, node)) {
          context.report({ node, message: MESSAGE });
        }
      },
    };
  },
};
