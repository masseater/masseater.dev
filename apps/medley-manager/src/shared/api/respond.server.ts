import { Effect, Option, Schema } from "effect";
import { status } from "elysia";
import type { ElysiaCustomStatusResponse } from "elysia";

import { runRequest } from "#/shared/observability/index.server";

const NOT_FOUND = 404;

export const IdParams = Schema.toStandardSchemaV1(Schema.Struct({ id: Schema.FiniteFromString }));

export type NotFound = ElysiaCustomStatusResponse<typeof NOT_FOUND, "not found">;

export const respondFound = <Found>(
  found: Effect.Effect<Option.Option<Found>>,
): Promise<Found | NotFound> =>
  found.pipe(
    Effect.map(
      Option.match({
        onNone: () => status(NOT_FOUND, "not found" as const),
        onSome: (row): Found | NotFound => row,
      }),
    ),
    runRequest,
  );
