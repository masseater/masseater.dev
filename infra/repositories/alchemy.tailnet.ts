import { providers, state } from "@alchemy.run/cloudflare";
import { Stack } from "alchemy";
import type { CompiledStack } from "alchemy";
import { Effect, Layer } from "effect";
import type { ConfigError } from "effect/Config";

import { TAILNET_STACK } from "./src/features/join-tailnet/model/tailnet-federation.ts";
import type { Federation } from "./src/features/join-tailnet/model/tailnet-federation.ts";
import {
  agentTrust,
  tailscaleProviders,
} from "./src/features/trust-tailscale/model/tailscale-trust.ts";

const tailnetProviders = Layer.provideMerge(tailscaleProviders, providers());

const tailnet: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  TAILNET_STACK,
  {
    providers: tailnetProviders,
    state: state(),
  },
  agentTrust.pipe(
    Effect.map(
      (trust) =>
        ({
          TAILNET_CLIENT_ID: trust.keyId,
          TAILNET_AUDIENCE: trust.audience,
        }) satisfies Readonly<Record<keyof Federation, unknown>>,
    ),
  ),
);

export default tailnet;
