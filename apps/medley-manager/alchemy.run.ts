import { D1, providers, state } from "@alchemy.run/cloudflare";
import type { InferEnv } from "@alchemy.run/cloudflare";
import { authSite } from "@masseater.dev/cloudflare-account/auth-site";
import { tracedProviders } from "@masseater.dev/cloudflare-account/traced-providers";
import { Stack } from "alchemy";
import { Effect, Option } from "effect";

import { APP_NAME, requireAppPrefix } from "./app-name.ts";
import { MCP_URL, SITE_HOST } from "./src/shared/config/index.ts";

const CF_BEACON_TOKEN = "ad561fe157a84abb89c547d547524e9f";

const web = Effect.gen(function* web() {
  const DB = yield* D1.Database("DB", { migrations: "./drizzle" });
  return yield* authSite({
    domain: SITE_HOST,
    name: Option.none(),
    bindings: { CF_BEACON_TOKEN, DB },
  });
});

type WebEnv = InferEnv<typeof web>;

export type { WebEnv };
export default Stack(
  APP_NAME,
  {
    providers: tracedProviders(providers()),
    state: state(),
  },
  Effect.gen(function* stack() {
    const { url } = yield* web;
    yield* requireAppPrefix;
    return { url, mcp: MCP_URL };
  }),
);
