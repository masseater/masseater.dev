import { fromApiToken } from "@distilled.cloud/cloudflare/Credentials";
import { Config, Effect, Layer } from "effect";
import { layer as fetchHttpClient } from "effect/http/FetchHttpClient";

/** @internal */
export const cloudflare = Layer.unwrap(
  Config.Redacted("CLOUDFLARE_API_TOKEN").pipe(
    Effect.map((apiToken) => Layer.mergeAll(fromApiToken({ apiToken }), fetchHttpClient)),
  ),
);
