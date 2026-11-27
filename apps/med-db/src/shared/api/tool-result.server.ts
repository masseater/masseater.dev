import type { CallToolResult } from "@modelcontextprotocol/server";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Effect, Option, Predicate, Schema } from "effect";

import { CatalogDb } from "#/shared/db/index.server.ts";
import type { CatalogRelations } from "#/shared/db/index.server.ts";
import { runRequest } from "#/shared/observability/index.server.ts";

import { ToolError } from "./tool-error.ts";

const UNKNOWN_FAILURE = "database rejected the change";

const encodeJson = Schema.encodeUnknownEffect(Schema.fromJsonString(Schema.Unknown));

const textResult = (text: string): CallToolResult => ({
  content: [{ type: "text", text }],
});

const errorResult = ({ message }: Readonly<{ message: string }>): CallToolResult => ({
  content: [{ type: "text", text: message }],
  isError: true,
});

export const runTool =
  (db: DrizzleD1Database<CatalogRelations>) =>
  <Value>(effect: Effect.Effect<Value, ToolError, CatalogDb>): Promise<CallToolResult> =>
    runRequest(
      effect.pipe(
        Effect.flatMap(encodeJson),
        Effect.match({ onFailure: errorResult, onSuccess: textResult }),
        Effect.provideService(CatalogDb, db),
      ),
    );

const messageOf = (cause: unknown): string =>
  Option.liftPredicate(cause, Predicate.isError).pipe(
    Option.match({ onNone: () => UNKNOWN_FAILURE, onSome: (error) => error.message }),
  );

const failed = (cause: unknown): ToolError => ToolError.make({ message: messageOf(cause) });

export const query = Effect.fn("catalog.write")(function* query<Row>(
  run: (db: DrizzleD1Database<CatalogRelations>) => Promise<Row>,
) {
  const db = yield* CatalogDb;
  return yield* Effect.tryPromise({ try: () => run(db), catch: failed });
});

export const orMissing =
  (missing: string) =>
  <Value, Failure, Services>(
    effect: Effect.Effect<Option.Option<Value>, Failure, Services>,
  ): Effect.Effect<Value, Failure | ToolError, Services> =>
    effect.pipe(
      Effect.flatMap(
        Option.match({
          onNone: () => Effect.fail(ToolError.make({ message: missing })),
          onSome: (value) => Effect.succeed(value),
        }),
      ),
    );
