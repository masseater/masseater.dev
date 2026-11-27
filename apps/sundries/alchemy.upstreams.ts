import { Vectorize, Workers } from "@alchemy.run/cloudflare";
import { ownerStack } from "@masseater.dev/owner-stack";
import type {
  AccessOAuth,
  ClaudeRoutine,
  SloppediaGitHub,
  Tailnet,
} from "@masseater.dev/repositories/credential-broker";
import { Effect } from "effect";

const PROD = "prod";

export const upstreams = Effect.gen(function* upstreams() {
  const holder = yield* ownerStack;
  const SLIDE_INDEX = yield* Vectorize.Index.ref("DeckSearchIndex", holder);
  const broker = yield* Workers.Worker.ref("CredentialBroker", {
    stack: "masseater-dev-credential-broker",
    stage: PROD,
  });
  const webAnalyticsToken = yield* Workers.Worker.ref("WebAnalyticsToken", {
    stack: "masseater-dev",
    stage: PROD,
  });
  return {
    SLIDE_INDEX,
    SLOPPEDIA_GITHUB: Workers.WorkerEntrypoint<SloppediaGitHub>(broker, "SloppediaGitHub"),
    ACCESS_OAUTH: Workers.WorkerEntrypoint<AccessOAuth>(broker, "AccessOAuth"),
    CLAUDE_ROUTINE: Workers.WorkerEntrypoint<ClaudeRoutine>(broker, "ClaudeRoutine"),
    WEB_ANALYTICS_TOKEN: Workers.WorkerEntrypoint(webAnalyticsToken),
    TAILNET: Workers.WorkerEntrypoint<Tailnet>(broker, "Tailnet"),
  };
});
