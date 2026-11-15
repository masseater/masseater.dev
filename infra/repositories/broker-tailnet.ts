import { providers } from "@alchemy.run/cloudflare";
import { withWorkersTracing } from "@r_masseater/workers-tracing/alchemy";
import { Effect, Layer } from "effect";

import { TRACE_DESTINATION } from "./broker-names.ts";
import { agentTrust, tailscaleProviders } from "./tailscale-trust.ts";

const tracedProviders = withWorkersTracing({ destinations: [TRACE_DESTINATION] })(providers());

/** @internal */
const brokerProviders = tailscaleProviders.pipe(Layer.provideMerge(tracedProviders));

const tailnetEnv = agentTrust.pipe(
  Effect.map((trust) => ({ TAILNET_CLIENT_ID: trust.keyId, TAILNET_AUDIENCE: trust.audience })),
);

export { brokerProviders, tailnetEnv };
