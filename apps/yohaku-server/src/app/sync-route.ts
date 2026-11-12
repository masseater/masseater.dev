import { HOST } from "@masseater.dev/local-server";
import { Effect, Layer } from "effect";
import { FetchHttpClient, HttpRouter, HttpServerResponse } from "effect/http";

import { CALLBACK_PATH, Syncer, syncerLayer } from "#features/sync";

const SIGNED_IN = "同期をつなぎました。このタブを閉じてください。";
const NOT_SIGNED_IN = "同期をつなげませんでした。余白に戻ってもう一度つないでください。";
const BAD_REQUEST = 400;

const syncRoute = Layer.unwrap(
  Effect.gen(function* syncRoute() {
    const syncer = yield* Syncer;
    return HttpRouter.add("GET", CALLBACK_PATH, (request) =>
      syncer.callback(new URL(request.url, `http://${HOST}`).href).pipe(
        Effect.as(HttpServerResponse.text(SIGNED_IN)),
        Effect.catchTag("SyncFailed", ({ message }) =>
          Effect.logWarning("sync.sign_in_failed", { message }).pipe(
            Effect.as(HttpServerResponse.text(NOT_SIGNED_IN, { status: BAD_REQUEST })),
          ),
        ),
      ),
    );
  }),
);

const syncLayer = syncerLayer.pipe(Layer.provide(FetchHttpClient.layer));

/** @internal */
export { syncLayer, syncRoute };
