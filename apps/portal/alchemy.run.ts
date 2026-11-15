import { Website, Workers } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { ownerAccess } from "@masseater.dev/cloudflare-account/owner-access";
import { tracedStackProps } from "@masseater.dev/cloudflare-account/traced-providers";
import { ownerStack } from "@masseater.dev/owner-stack";
import type {
  CredentialStatusRpc,
  MoneyPortalRpc,
  SlidesRpc,
  WatashiPortalRpc,
} from "@masseater.dev/portal-protocol";
import { Stack } from "alchemy";
import { Effect } from "effect";

import { APP_NAME, PREFIX, requireAppPrefix } from "./app-name.ts";
import { SITE_HOST } from "./src/shared/config/site.ts";

const PROD = "prod";

const upstreams = Effect.gen(function* upstreams() {
  const holder = yield* ownerStack;
  const personal = yield* Workers.Worker.ref("Decks", holder);
  const watashi = yield* Workers.Worker.ref("Portal", {
    stack: "masseater-dev-watashi-mcp",
    stage: PROD,
  });
  const money = yield* Workers.Worker.ref("Mcp", { stack: "masseater-dev-money", stage: PROD });
  const sundries = yield* Workers.Worker.ref("Mcp", {
    stack: "masseater-dev-sundries",
    stage: PROD,
  });
  const broker = yield* Workers.Worker.ref("CredentialBroker", {
    stack: "masseater-dev-credential-broker",
    stage: PROD,
  });
  return {
    PERSONAL: Workers.WorkerEntrypoint(personal),
    WATASHI: Workers.WorkerEntrypoint<WatashiPortalRpc>(watashi, "WatashiPortal"),
    MONEY: Workers.WorkerEntrypoint<MoneyPortalRpc>(money, "MoneyPortal"),
    SLIDES: Workers.WorkerEntrypoint<SlidesRpc>(sundries, "Slides"),
    CREDENTIALS: Workers.WorkerEntrypoint<CredentialStatusRpc>(broker, "CredentialStatus"),
  };
});

const web = Effect.gen(function* web() {
  yield* ownerAccess({
    id: "PortalAccess",
    name: `${PREFIX}access`,
    host: SITE_HOST,
    loopbackClients: false,
  });
  return yield* Website.Vite("Web", {
    name: `${PREFIX}web`,
    logpush: true,
    domain: SITE_HOST,
    workersDev: false,
    env: yield* upstreams,
  });
});

export type WebEnv = InferEnv<typeof web>;

export default Stack(
  APP_NAME,
  tracedStackProps,
  Effect.gen(function* stack() {
    const { url } = yield* web;
    yield* requireAppPrefix;
    return { url };
  }),
);
