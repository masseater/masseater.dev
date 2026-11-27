import { Array as Arr, Option, Schema, pipe } from "effect";
import type { Rule } from "vite-plus/lint/plugins";

import { expressionOf, onlyStatement } from "./get-or-insert-ast.ts";

const MESSAGE =
  "Collect an async iterable with Array.fromAsync, passing the mapping as its second argument. Do not push each item from a for await loop.";

const ONE = 1;

const DeclarationSchema = Schema.Struct({
  type: Schema.Literal("VariableDeclaration"),
  declarations: Schema.Array(Schema.Unknown),
});

const decodeLoop = Schema.decodeUnknownOption(
  Schema.Struct({
    type: Schema.Literal("ForOfStatement"),
    await: Schema.Literal(true),
    left: DeclarationSchema,
    body: Schema.Unknown,
  }),
);

const PushNameSchema = Schema.Struct({
  type: Schema.Literal("Identifier"),
  name: Schema.Literal("push"),
});

const PushCalleeSchema = Schema.Struct({
  type: Schema.Literal("MemberExpression"),
  computed: Schema.Literal(false),
  property: PushNameSchema,
});

const ArgumentSchema = Schema.Struct({ type: Schema.String });

const decodePush = Schema.decodeUnknownOption(
  Schema.Struct({
    type: Schema.Literal("CallExpression"),
    callee: PushCalleeSchema,
    arguments: Schema.Array(ArgumentSchema),
  }),
);

const pushesOne = (statement: unknown): boolean =>
  pipe(
    expressionOf(statement),
    Option.flatMap(decodePush),
    Option.exists(
      (call) =>
        call.arguments.length === ONE &&
        !pipe(
          call.arguments,
          Arr.some((argument) => argument.type === "SpreadElement"),
        ),
    ),
  );

const collectsByHand = (node: unknown): boolean =>
  pipe(
    decodeLoop(node),
    Option.filter((loop) => loop.left.declarations.length === ONE),
    Option.flatMap((loop) => onlyStatement(loop.body)),
    Option.exists(pushesOne),
  );

export const arrayFromAsync: Rule = {
  meta: { type: "suggestion" },
  create: (context) => ({
    ForOfStatement: (node): void => {
      if (collectsByHand(node)) {
        context.report({ node, message: MESSAGE });
      }
    },
  }),
};
