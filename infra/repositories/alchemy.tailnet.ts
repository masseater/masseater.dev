import { providers, state } from "@alchemy.run/cloudflare";
import { Stack } from "alchemy";
import type { CompiledStack } from "alchemy";
import { Effect, Layer } from "effect";
import type { ConfigError } from "effect/Config";

import { PREFIX } from "./broker-names.ts";
import { agentTrust, tailscaleProviders } from "./tailscale-trust.ts";

const tailnetProviders = Layer.provideMerge(tailscaleProviders, providers());

const tailnet: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  `${PREFIX}tailnet`,
  {
    providers: tailnetProviders,
    state: state(),
  },
  agentTrust.pipe(
    Effect.map((trust) => ({ TAILNET_CLIENT_ID: trust.keyId, TAILNET_AUDIENCE: trust.audience })),
  ),
);

export default tailnet;
