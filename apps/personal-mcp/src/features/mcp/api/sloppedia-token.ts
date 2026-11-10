import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import type { SloppediaGitHub } from "@masseater.dev/repositories/credential-broker.worker";
import { env } from "cloudflare:workers";
import { Effect } from "effect";

import { brokerFailed, brokerResponse } from "./broker-response";

const broker = (): Service<SloppediaGitHub> => env.SLOPPEDIA_GITHUB;

const BROKER_URL = "https://credentials.masseater.dev/";

const sloppediaToken: Effect.Effect<string, UpstreamFailed> = brokerResponse(() =>
  broker().fetch(BROKER_URL),
).pipe(
  Effect.flatMap((response) =>
    Effect.tryPromise({ try: () => response.text(), catch: brokerFailed }),
  ),
);

export { sloppediaToken };
