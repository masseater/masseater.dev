import { Command } from "@effect/ui";
import { Effect, Layer, Match, Predicate, Schema } from "effect";
import { FetchHttpClient, HttpClient } from "effect/http";

import { SourceSchema, pictureBytes } from "#/entities/extraction/index.ts";
import type { Source } from "#/entities/extraction/index.ts";
import { PicturePickerMessage } from "#/features/pick-picture/model/messages.ts";

const urlOf = (source: Source): string =>
  Match.value(source).pipe(
    Match.when(Predicate.isString, (url) => url),
    Match.orElse((file) => URL.createObjectURL(file)),
  );

/** @stability experimental */
export class LoadPicture extends Command.Service<LoadPicture>()("pick-picture/LoadPicture", {
  args: { name: Schema.String, source: SourceSchema },
  success: PicturePickerMessage,
  mode: "switch",
}) {
  public static readonly layer = this.toLayer(
    Effect.gen(function* build() {
      const client = yield* HttpClient.HttpClient;
      return ({ name, source }): Effect.Effect<typeof PicturePickerMessage.Type> => {
        const url = urlOf(source);
        return pictureBytes(source).pipe(
          Effect.provideService(HttpClient.HttpClient, client),
          Effect.match({
            onSuccess: () => PicturePickerMessage.LoadedPicture({ picture: { name, url, source } }),
            onFailure: () => PicturePickerMessage.FailedLoadPicture({ name }),
          }),
        );
      };
    }),
  );

  public static readonly live = this.layer.pipe(Layer.provide(FetchHttpClient.layer));
}
