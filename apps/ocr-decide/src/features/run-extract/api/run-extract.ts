import { Command } from "@effect/ui";
import { INVOICE_FIELDS, extract, openRouterWithKey } from "@r_masseater/ocr-decide";
import { Array as Arr, Duration, Effect, Layer, Redacted, Schema, pipe } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";

import { SourceSchema, WAYS, linesOf, pictureBytes } from "#/entities/extraction/index.ts";
import { RunPanelMessage } from "#/features/run-extract/model/messages.ts";

const UNKNOWN_WAY = { message: "unknown way" } as const;

const reasonOf = (error: Readonly<{ message: string; reason?: string }>): string =>
  error.reason ?? error.message;

/** @stability experimental */
export class RunExtract extends Command.Service<RunExtract>()("run-extract/RunExtract", {
  args: {
    source: SourceSchema,
    apiKey: Schema.Redacted(Schema.String),
    way: Schema.String,
  },
  success: RunPanelMessage,
  mode: "switch",
}) {
  public static readonly layer = this.toLayer(
    Effect.gen(function* build() {
      const client = yield* HttpClient.HttpClient;
      return ({ source, apiKey, way }): Effect.Effect<typeof RunPanelMessage.Type> =>
        Effect.gen(function* run() {
          const found = yield* pipe(
            WAYS,
            Arr.findFirst(({ key }) => key === way),
            Effect.fromOption,
            Effect.mapError(() => UNKNOWN_WAY),
          );
          const bytes = yield* pictureBytes(source).pipe(
            Effect.provideService(HttpClient.HttpClient, client),
          );
          const context = yield* apiKey.pipe(Redacted.value, openRouterWithKey, Layer.build);
          const [elapsed, { values, costUsd }] = yield* Effect.provideContext(
            Effect.timed(
              extract({
                image: bytes,
                fields: INVOICE_FIELDS,
                method: found.method,
                model: found.model,
              }),
            ),
            context,
          );
          return linesOf({ values, costUsd, seconds: Duration.toSeconds(elapsed) });
        }).pipe(
          Effect.scoped,
          Effect.match({
            onSuccess: (lines) => RunPanelMessage.SucceededExtract({ lines }),
            onFailure: (error) => RunPanelMessage.FailedExtract({ reason: reasonOf(error) }),
          }),
        );
    }),
  );

  public static readonly live = this.layer.pipe(Layer.provide(FetchHttpClient.layer));
}
