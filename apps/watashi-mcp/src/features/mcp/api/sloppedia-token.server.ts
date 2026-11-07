import type { SloppediaGitHub } from "@masseater.dev/repositories/credential-broker.worker";
import { env } from "cloudflare:workers";
import { Effect } from "effect";

import { failedAt } from "#/features/mcp/model/upstream-failed";
import type { UpstreamFailed } from "#/features/mcp/model/upstream-failed";

const broker = (): Service<SloppediaGitHub> => env.SLOPPEDIA_GITHUB;

const BROKER_URL = "https://credentials.masseater.dev/";

const fail = failedAt("credential broker");

const sloppediaToken: Effect.Effect<string, UpstreamFailed> = Effect.tryPromise({
  try: () => broker().fetch(BROKER_URL),
  catch: fail,
}).pipe(
  Effect.filterOrFail(
    (response) => response.ok,
    (response) => fail(new Error(`HTTP ${String(response.status)}`)),
  ),
  Effect.flatMap((response) => Effect.tryPromise({ try: () => response.text(), catch: fail })),
);

export { sloppediaToken };
