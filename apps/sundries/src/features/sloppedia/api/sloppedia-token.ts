import type { UpstreamFailed } from "@masseater.dev/mcp-tool-call";
import type { SloppediaGitHub } from "@masseater.dev/repositories/credential-broker.worker";
import { env } from "cloudflare:workers";
import { Effect } from "effect";

import { brokerFailed, brokerResponse } from "#/shared/api";

const broker = (): Service<SloppediaGitHub> => env.SLOPPEDIA_GITHUB;

const BROKER_URL = "https://credentials.masseater.dev/";

export const sloppediaToken: Effect.Effect<string, UpstreamFailed> = brokerResponse(() =>
  broker().fetch(BROKER_URL),
).pipe(
  Effect.flatMap((response) =>
    Effect.tryPromise({ try: () => response.text(), catch: brokerFailed }),
  ),
);
