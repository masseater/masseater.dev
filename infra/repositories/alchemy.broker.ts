import { CloudflareEnvironment, SecretsStore, Workers, Zone, state } from "@alchemy.run/cloudflare";
import type { ClaudeRequestsRpc } from "@masseater.dev/exposure-protocol/claude-requests";
import { Stack } from "alchemy";
import type { CompiledStack } from "alchemy";
import { adopt } from "alchemy/AdoptPolicy";
import { Config, Effect } from "effect";
import type { ConfigError } from "effect/Config";

import { ciKeys, encodedGrants, githubAppStore } from "./src/app/broker-env.ts";
import { brokerProviders } from "./src/app/broker-providers.ts";
import { tailnetFederation } from "./src/features/join-tailnet/model/tailnet-federation.ts";
import {
  CREDENTIAL_BROKER_AUDIENCE,
  HOURLY_CRON,
  IDLE_CHECK_CRON,
  PREFIX,
} from "./src/shared/config/broker-names.ts";

const DOMAIN = "masseater.dev";
const CREDENTIAL_BROKER_HOST = `credentials.${DOMAIN}`;
const SUNDRIES = { stack: "masseater-dev-sundries", stage: "prod" } as const;

const broker: Effect.Effect<CompiledStack, ConfigError> & Readonly<{ stackName: string }> = Stack(
  CREDENTIAL_BROKER_AUDIENCE,
  {
    providers: brokerProviders,
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
      limits: { cpuMs: 400 },
      name: CREDENTIAL_BROKER_AUDIENCE,
      main: "./src/app/credential-broker.ts",
      logpush: true,
      domain: CREDENTIAL_BROKER_HOST,
      workersDev: false,
      crons: [HOURLY_CRON, IDLE_CHECK_CRON],
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
