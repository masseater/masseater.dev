import type { CloudflareOpContext } from "@distilled.cloud/cloudflare/accounts";
import { fromApiToken } from "@distilled.cloud/cloudflare/Credentials";
import { Effect, Layer, Redacted, flow } from "effect";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";

import { CREDENTIAL_BROKER_AUDIENCE } from "./broker-names.ts";

const ISSUED_TOKEN_PREFIX = `${CREDENTIAL_BROKER_AUDIENCE}:`;

type RootEnv = Readonly<{ ROOT_TOKEN: SecretsStoreSecret }>;

const rootToken = (env: RootEnv): Effect.Effect<string> =>
  Effect.promise(() => env.ROOT_TOKEN.get());

/** @internal */
const cloudflare: (env: RootEnv) => Layer.Layer<CloudflareOpContext> = flow(
  rootToken,
  Effect.map((apiToken) =>
    Layer.mergeAll(fromApiToken({ apiToken: Redacted.make(apiToken) }), fetchHttpClient),
  ),
  Layer.unwrap,
);

export { ISSUED_TOKEN_PREFIX, cloudflare };
export type { RootEnv };
