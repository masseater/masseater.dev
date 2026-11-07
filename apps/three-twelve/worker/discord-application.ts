import { OAuth2Routes, OAuth2Scopes, RouteBases, Routes } from "discord-api-types/v10";
import { Effect, Layer, Option, Schema } from "effect";
import { HttpClient, HttpClientRequest, HttpClientResponse } from "effect/http";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";

import { INVITE_PERMISSIONS, OWNER_DISCORD_ID } from "#config";

import { Rejected } from "./rejected.ts";

const Application = Schema.Struct({
  id: Schema.String,
  owner: Schema.Struct({ id: Schema.String }),
  team: Schema.NullOr(Schema.Struct({ owner_user_id: Schema.String })),
});

const OK = 200;

const BotToken = Schema.String.check(Schema.isPattern(/^[\w.-]+$/u));

const upstream = (cause: unknown): Rejected =>
  Rejected.make({ status: 502, reason: String(cause) });

const ownerOf = (application: typeof Application.Type): string =>
  Option.match(Option.fromNullishOr(application.team), {
    onNone: () => application.owner.id,
    onSome: (team) => team.owner_user_id,
  });

const lookup = Effect.fn("three-twelve.ownedApplication")(function* lookup(token: string) {
  const checked = yield* Schema.decodeEffect(BotToken)(token).pipe(
    Effect.mapError(() => Rejected.make({ status: 401, reason: "malformed bot token" })),
  );
  const client = yield* HttpClient.HttpClient;
  const response = yield* client
    .execute(
      HttpClientRequest.get(`${RouteBases.api}${Routes.currentApplication()}`, {
        headers: { authorization: `Bot ${checked}` },
      }),
    )
    .pipe(Effect.mapError(upstream));
  if (response.status !== OK) {
    return yield* Rejected.make({ status: 401, reason: `discord answered ${response.status}` });
  }
  const application = yield* HttpClientResponse.schemaBodyJson(Application)(response).pipe(
    Effect.mapError(upstream),
  );
  if (ownerOf(application) !== OWNER_DISCORD_ID) {
    return yield* Rejected.make({ status: 403, reason: "the bot belongs to someone else" });
  }
  return application;
});

const ownedApplication = (token: string): Effect.Effect<typeof Application.Type, Rejected> =>
  Layer.build(fetchHttpClient).pipe(
    Effect.flatMap((context) => Effect.provideContext(lookup(token), context)),
    Effect.scoped,
  );

const inviteUrl = (applicationId: string): string =>
  `${OAuth2Routes.authorizationURL}?${new URLSearchParams({
    client_id: applicationId,
    scope: OAuth2Scopes.Bot,
    permissions: INVITE_PERMISSIONS,
  }).toString()}`;

export { inviteUrl, ownedApplication };
