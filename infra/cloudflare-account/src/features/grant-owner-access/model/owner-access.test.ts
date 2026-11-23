import { Access } from "@alchemy.run/cloudflare";
import { Stack } from "alchemy";
import { Stage } from "alchemy/Stage";
import { inMemoryState } from "alchemy/State";
import type { CreatedResourceState } from "alchemy/State";
import { Array as Arr, Effect, Layer, Option, Record as Rec, Schema, pipe } from "effect";
import { expect, test } from "vite-plus/test";

import { ownerAccess } from "./owner-access.ts";

const OWNER_POLICY = "OwnerPolicy";

const held: CreatedResourceState = {
  resourceType: Access.Policy.Type,
  namespace: Option.getOrUndefined(Option.none()),
  fqn: OWNER_POLICY,
  logicalId: OWNER_POLICY,
  instanceId: OWNER_POLICY,
  providerVersion: 0,
  status: "created",
  downstream: [],
  bindings: [],
  props: {},
  attr: {},
};

const decodeCookie = Schema.decodeUnknownOption(
  Schema.Struct({
    sameSiteCookieAttribute: Schema.String,
    httpOnlyCookieAttribute: Schema.Boolean,
  }),
);

const sessionCookies = Stack(
  "site",
  {
    providers: Layer.empty,
    state: inMemoryState({ holder: { prod: { [OWNER_POLICY]: held } } }),
  },
  Effect.gen(function* stack() {
    yield* ownerAccess({
      id: "SiteAccess",
      name: "site-access",
      host: "site.example.com",
      loopbackClients: false,
    });
    const { resources } = yield* Stack;
    return pipe(
      Rec.values(resources),
      Arr.filter(({ Type }) => Type === Access.Application.Type),
      Arr.map(({ Props }) => decodeCookie(Props)),
      Arr.getSomes,
    );
  }),
).pipe(
  Effect.provideService(Stage, "test"),
  Effect.scoped,
  Effect.map(({ output }) => output),
);

test("the session cookie stays out of cross-site writes and page scripts", () =>
  expect(Effect.runPromise(sessionCookies)).resolves.toStrictEqual([
    { sameSiteCookieAttribute: "lax", httpOnlyCookieAttribute: true },
  ]));
