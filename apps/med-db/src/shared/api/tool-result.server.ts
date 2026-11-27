import { one, toolCalls } from "@masseater.dev/mcp-tool-call";
import type { CallToolResult } from "@modelcontextprotocol/server";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import { Effect, Layer, Option, Predicate } from "effect";

import { CatalogDb } from "#/shared/db/index.server.ts";
import type { CatalogRelations } from "#/shared/db/index.server.ts";

import { ToolError } from "./tool-error.ts";

const UNKNOWN_FAILURE = "database rejected the change";

const { runToolIn } = toolCalls<ToolError>({
  describe: ({ message }) => ({ errorTag: "ToolError", text: message }),
});

export const runTool =
  (db: DrizzleD1Database<CatalogRelations>) =>
  <Value>(effect: Effect.Effect<Value, ToolError, CatalogDb>): Promise<CallToolResult> =>
    runToolIn(Layer.succeed(CatalogDb)(db))({ count: one })(effect);

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
