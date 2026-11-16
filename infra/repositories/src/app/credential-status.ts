import type { CredentialState, CredentialStatusRpc } from "@masseater.dev/portal-protocol";
import { runner } from "@r_masseater/workers-tracing/effect";
import { WorkerEntrypoint } from "cloudflare:workers";
import { Array as Arr, Effect, Logger, Option, pipe } from "effect";

import { APP_KEY, SETUP_PATH } from "#/entities/credential/index.ts";
import { OAUTH_TARGET_IDS } from "#/entities/oauth-target/index.ts";
import type { OAuthTargetId } from "#/entities/oauth-target/index.ts";
import { grantKey, BROKER_ORIGIN, loginUrlOf } from "#/features/access-oauth/index.ts";
import { APP_PASSWORD_KEY } from "#/features/issue-app-password/index.ts";
import { readRow } from "#/shared/api/index.ts";
import type { AppStoreEnv } from "#/shared/api/index.ts";

type Check = Readonly<{
  id: string;
  kind: CredentialState["kind"];
  name: string;
  actionUrl: string;
}>;

const KEYS: readonly Check[] = [
  { id: "github-app", kind: "key", name: APP_KEY, actionUrl: `${BROKER_ORIGIN}${SETUP_PATH}` },
  { id: "atproto", kind: "key", name: APP_PASSWORD_KEY, actionUrl: BROKER_ORIGIN },
];

const runLogged = runner(Logger.layer([Logger.withLeveledConsole(Logger.formatStructured)]));

const stateOf =
  (env: AppStoreEnv) =>
  (check: Check): Effect.Effect<CredentialState> =>
    readRow({ env, name: check.name }).pipe(
      Effect.map((row): CredentialState => ({
        id: check.id,
        kind: check.kind,
        status: Option.match(row, { onNone: () => "missing", onSome: () => "stored" }),
        actionUrl: check.actionUrl,
      })),
    );

const grantCheck = (site: OAuthTargetId): Check => ({
  id: site,
  kind: "login",
  name: grantKey(site),
  actionUrl: loginUrlOf(site),
});

const checks = (env: AppStoreEnv): readonly Effect.Effect<CredentialState>[] => [
  ...pipe(KEYS, Arr.map(stateOf(env))),
  ...pipe(OAUTH_TARGET_IDS, Arr.map(grantCheck), Arr.map(stateOf(env))),
];

const states = (env: AppStoreEnv): Effect.Effect<readonly CredentialState[]> =>
  Effect.all(checks(env));

export class CredentialStatus extends WorkerEntrypoint<AppStoreEnv> implements CredentialStatusRpc {
  public list(): Promise<readonly CredentialState[]> {
    return runLogged(states(this.env));
  }
}
