import { Effect, Option, Schema } from "effect";
import { status } from "elysia";
import type { ElysiaCustomStatusResponse } from "elysia";

import { runRequest } from "#/shared/observability/index.server";

const NOT_FOUND = 404;

const IdParams = Schema.toStandardSchemaV1(Schema.Struct({ id: Schema.FiniteFromString }));

type NotFound = ElysiaCustomStatusResponse<typeof NOT_FOUND, "not found">;

const respondFound = <Found>(
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

export type { NotFound };
export { IdParams, respondFound };
