import type { CallToolResult } from "@modelcontextprotocol/server";
import { Effect, Option, Predicate, Schema } from "effect";

import { runRequest } from "#/shared/observability/index.server";

import { ToolError } from "./tool-error";

const UNKNOWN_FAILURE = "database rejected the change";

const encodeJson = Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));

const textResult = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
});

const errorResult = ({ message }: Readonly<{ message: string }>): CallToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

const runTool = <Value>(effect: Effect.Effect<Value, ToolError>): Promise<CallToolResult> =>
  runRequest(
    effect.pipe(
      Effect.flatMap(encodeJson),
      Effect.match({ onFailure: errorResult, onSuccess: textResult }),
    ),
  );

const messageOf = (cause: unknown): string =>
  Option.liftPredicate(cause, Predicate.isError).pipe(
    Option.match({ onNone: () => UNKNOWN_FAILURE, onSome: (error) => error.message }),
  );

const query = <Row>(run: () => Promise<Row>): Effect.Effect<Row, ToolError> =>
  Effect.tryPromise({ try: run, catch: (cause) => ToolError.make({ message: messageOf(cause) }) });

const orMissing =
  (missing: string) =>
  <Value, Failure>(
    effect: Effect.Effect<Option.Option<Value>, Failure>,
  ): Effect.Effect<Value, Failure | ToolError> =>
    effect.pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.fail(ToolError.make({ message: missing })),
          onSome: (value) => Effect.succeed(value),
        }),
      ),
    );

export { orMissing, query, runTool };
