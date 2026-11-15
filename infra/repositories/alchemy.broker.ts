import {
  CloudflareEnvironment,
  SecretsStore,
  Workers,
  Zone,
  providers,
  state,
} from "@alchemy.run/cloudflare";
import type { ClaudeRequestsRpc } from "@masseater.dev/exposure-protocol/claude-requests";
import { withWorkersTracing } from "@r_masseater/workers-tracing/alchemy";
import { Stack } from "alchemy";
import type { CompiledStack } from "alchemy";
import { adopt } from "alchemy/AdoptPolicy";
import { Config, Effect } from "effect";
import type { ConfigError } from "effect/Config";

import { ciKeys, encodedGrants, githubAppStore } from "./broker-env.ts";
import { CREDENTIAL_BROKER_AUDIENCE, PREFIX, TRACE_DESTINATION } from "./broker-names.ts";
import { tailnetFederation } from "./tailnet-federation.ts";

const DOMAIN = "masseater.dev";
const CREDENTIAL_BROKER_HOST = `credentials.${DOMAIN}`;
const SUNDRIES = { stack: "masseater-dev-sundries", stage: "prod" } as const;

const tracedProviders = withWorkersTracing({ destinations: [TRACE_DESTINATION] })(providers());

const broker: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  CREDENTIAL_BROKER_AUDIENCE,
  {
    providers: tracedProviders,
    state: state(),
  },
  Effect.gen(function* stack() {
    const { accountId } = yield* yield* CloudflareEnvironment;
    const zoneId = yield* Zone.resolveZoneId({ accountId, zone: DOMAIN, hostname: DOMAIN }).pipe(
      Effect.orDie,
    );
    const store = yield* SecretsStore.Store("Secrets");
    const ROOT_TOKEN = yield* SecretsStore.Secret("CredentialRootToken", {
      store,
      name: `${PREFIX}credential-root-token`,
      value: yield* Config.Redacted("CLOUDFLARE_API_TOKEN"),
    });
    const keys = yield* ciKeys(store);
    const appStore = yield* githubAppStore;
    const grants = yield* encodedGrants({ accountId, zoneId });
    const sundries = yield* Workers.Worker.ref("Mcp", SUNDRIES);
    const { url } = yield* Workers.Worker("CredentialBroker", {
      name: CREDENTIAL_BROKER_AUDIENCE,
      main: "./credential-broker.worker.ts",
      logpush: true,
      domain: CREDENTIAL_BROKER_HOST,
      crons: ["41 * * * *"],
      env: {
        ROOT_TOKEN,
        ...keys,
        ...appStore,
        ACCOUNT_ID: accountId,
        ...grants,
        ...(yield* tailnetFederation),
        CLAUDE_REQUESTS: Workers.WorkerEntrypoint<ClaudeRequestsRpc>(sundries, "ClaudeRequests"),
      },
    });
    return { url };
  }).pipe(adopt(true)),
);

export default broker;
