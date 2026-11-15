import { CredentialsFromEnv as CloudflareCredentials } from "@distilled.cloud/cloudflare/Credentials";
import { CredentialsFromEnv as GitHubCredentials } from "@distilled.cloud/github/Credentials";
import { runMain } from "@masseater.dev/node-main";
import { Config, Effect, Layer } from "effect";
import { FetchHttpClient } from "effect/http";

import { check } from "./check.ts";

const services = Layer.mergeAll(CloudflareCredentials, GitHubCredentials).pipe(
  Layer.provideMerge(FetchHttpClient.layer),
);

const program = Config.String("CLOUDFLARE_ACCOUNT_ID").pipe(Effect.flatMap(check));

runMain("exposure-check")(
  Layer.build(services).pipe(
    Effect.flatMap((context) => Effect.provideContext(program, context)),
    Effect.scoped,
  ),
);
