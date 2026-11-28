import { Router } from "@effect/ui";
import { BrowserRouter, HtmlHydrate } from "@effect/ui/html";
import { Effect, Layer, Schema, pipe } from "effect";

import { AppRoute } from "#/shared/config/index.ts";

import { App } from "./app.ts";

const STATE_ID = "state";

const CONTAINER_ID = "app";

const StateSchema = Schema.StructWithRest(
  Schema.Struct({
    "~deferred": Schema.String.pipe(Schema.Array, Schema.optional),
    "~static": Schema.optional(Schema.Boolean),
    "~key": Schema.optional(Schema.String),
  }),
  [Schema.Record(Schema.String, Schema.Unknown)],
);

const decodeState = Schema.decodeUnknownEffect(Schema.fromJsonString(StateSchema));

const hydration = Effect.gen(function* run() {
  const stateText = yield* Effect.fromNullishOr(document.querySelector(`#${STATE_ID}`));
  const container = yield* Effect.fromNullishOr(document.querySelector(`#${CONTAINER_ID}`));
  const state = yield* decodeState(stateText.textContent);
  return HtmlHydrate.hydrate(App, Router.props(AppRoute), container, state);
});

const router = BrowserRouter.layer({ routes: AppRoute, base: import.meta.env.BASE_URL });

pipe(Layer.unwrap(hydration), Layer.provide(router), Layer.launch, Effect.runFork);
